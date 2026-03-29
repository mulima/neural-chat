import os
import json
import uuid
import base64
import boto3
import requests
from datetime import datetime, timezone

s3  = boto3.client("s3")
ddb = boto3.client("dynamodb")

BUCKET  = os.environ["CHAT_BUCKET"]
TABLE   = os.environ["TABLE"]
EC2_URL = os.environ["EC2_URL"]
MODEL   = os.environ.get("MODEL_NAME", "Qwen2.5-7B-Instruct-Q5_K_M.gguf")

CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type":                 "application/json",
}

# Text MIME types whose content we inline into the model prompt
TEXT_TYPES = {
    "text/plain", "text/markdown", "text/csv", "text/html",
    "text/xml", "application/json", "application/xml",
    "application/x-yaml", "text/yaml",
}
MAX_INLINE_BYTES = 8_000  # characters passed to model per file


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def s3_put_json(key, payload):
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=json.dumps(payload).encode("utf-8"),
        ContentType="application/json",
    )


def s3_put_attachment(key, data_bytes, content_type):
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=data_bytes,
        ContentType=content_type,
    )


def save_attachments(session_id, turn_id, attachments):
    """
    Decode and store each attachment under:
      chats/{session_id}/{turn_id}/attachments/{filename}

    Returns a list of metadata dicts (no raw data) and a list of
    (filename, text_content) pairs for files whose text can be inlined.
    """
    saved = []
    inline_texts = []

    for att in attachments:
        name        = att.get("name", "file")
        mime        = att.get("type", "application/octet-stream")
        size        = att.get("size", 0)
        b64_data    = att.get("data", "")

        raw = base64.b64decode(b64_data)
        key = f"chats/{session_id}/{turn_id}/attachments/{name}"
        s3_put_attachment(key, raw, mime)

        saved.append({
            "name":         name,
            "type":         mime,
            "size":         size,
            "s3_key":       key,
        })

        # Inline readable text into the prompt context
        if mime in TEXT_TYPES or mime.startswith("text/"):
            try:
                text = raw.decode("utf-8", errors="replace")[:MAX_INLINE_BYTES]
                inline_texts.append((name, text))
            except Exception:
                pass

    return saved, inline_texts


def build_prompt(prompt, inline_texts):
    """
    Prepend any inlined file contents before the user's prompt.
    """
    if not inline_texts:
        return prompt or ""

    parts = []
    for name, content in inline_texts:
        parts.append(f"[File: {name}]\n{content}\n[End of {name}]")

    file_block = "\n\n".join(parts)
    if prompt:
        return f"{file_block}\n\n{prompt}"
    return file_block


def call_model(prompt, max_tokens=512):
    headers = {"Content-Type": "application/json"}
    payload = {
        "model":       MODEL,
        "messages":    [{"role": "user", "content": prompt}],
        "max_tokens":  max_tokens,
        "temperature": 0.7,
    }
    r = requests.post(EC2_URL, headers=headers, json=payload, timeout=120)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def lambda_handler(event, context):

    # ── Handle CORS preflight ──────────────────────────────────
    method = (
        event.get("requestContext", {})
             .get("http", {})
             .get("method", "")
    )
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    # ── Parse request ──────────────────────────────────────────
    body        = json.loads(event.get("body") or json.dumps(event))
    session_id  = body.get("session_id") or str(uuid.uuid4())
    prompt      = (body.get("prompt") or "").strip()
    attachments = body.get("attachments") or []
    max_tokens  = int(body.get("max_tokens") or 512)
    turn_id     = f"turn-{uuid.uuid4().hex[:8]}"
    now         = now_iso()

    if not prompt and not attachments:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "prompt or attachments required"}),
        }

    # ── 1. Save attachments to S3 ──────────────────────────────
    saved_attachments, inline_texts = [], []
    if attachments:
        try:
            saved_attachments, inline_texts = save_attachments(
                session_id, turn_id, attachments
            )
        except Exception as e:
            return {
                "statusCode": 500,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": f"Attachment upload failed: {e}"}),
            }

    # ── 2. Save user turn to S3 ────────────────────────────────
    user_key = f"chats/{session_id}/{turn_id}/user.json"
    s3_put_json(user_key, {
        "session_id":  session_id,
        "turn_id":     turn_id,
        "role":        "user",
        "prompt":      prompt,
        "attachments": saved_attachments,
        "timestamp":   now,
    })

    # ── 3. Upsert session metadata in DynamoDB ─────────────────
    ddb.update_item(
        TableName=TABLE,
        Key={"session_id": {"S": session_id}},
        UpdateExpression=(
            "SET created_at = if_not_exists(created_at, :now), "
            "updated_at = :now, "
            "last_user_turn = :turn, "
            "s3_prefix = :prefix, "
            "#st = :status"
        ),
        ExpressionAttributeNames={"#st": "status"},
        ExpressionAttributeValues={
            ":now":    {"S": now},
            ":turn":   {"S": turn_id},
            ":prefix": {"S": f"chats/{session_id}/"},
            ":status": {"S": "in_progress"},
        },
    )

    # ── 4. Call EC2 model ──────────────────────────────────────
    full_prompt = build_prompt(prompt, inline_texts)
    try:
        assistant_text = call_model(full_prompt, max_tokens)
    except requests.exceptions.ConnectionError:
        return {
            "statusCode": 503,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "error": "Model server unreachable. EC2 instance may be stopped."
            }),
        }
    except requests.exceptions.Timeout:
        return {
            "statusCode": 504,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Model server timed out."}),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(e)}),
        }

    # ── 5. Save assistant output to S3 ────────────────────────
    asst_key = f"chats/{session_id}/{turn_id}/assistant.json"
    s3_put_json(asst_key, {
        "session_id": session_id,
        "turn_id":    turn_id,
        "role":       "assistant",
        "response":   assistant_text,
        "timestamp":  now_iso(),
    })

    # ── 6. Update DynamoDB with completed turn ─────────────────
    ddb.update_item(
        TableName=TABLE,
        Key={"session_id": {"S": session_id}},
        UpdateExpression=(
            "SET updated_at = :now, "
            "last_assistant_turn = :turn, "
            "last_assistant_s3 = :key, "
            "#st = :status "
            "ADD turn_count :one"
        ),
        ExpressionAttributeNames={"#st": "status"},
        ExpressionAttributeValues={
            ":now":    {"S": now_iso()},
            ":turn":   {"S": turn_id},
            ":key":    {"S": asst_key},
            ":status": {"S": "complete"},
            ":one":    {"N": "1"},
        },
    )

    # ── 7. Return response ─────────────────────────────────────
    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({
            "session_id":  session_id,
            "turn_id":     turn_id,
            "response":    assistant_text,
            "attachments": saved_attachments,
        }),
    }
