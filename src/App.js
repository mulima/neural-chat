import { useState, useRef, useEffect } from "react";

const STORAGE_KEY = "lambda_chat_config";

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#080c10",
    color: "#c8d8e8",
    fontFamily: "'JetBrains Mono', 'Fira Mono', 'Courier New', monospace",
    display: "flex",
    flexDirection: "column",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.5rem",
    height: "52px",
    borderBottom: "1px solid #1a2a3a",
    background: "#060a0e",
    flexShrink: 0,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoIcon: {
    width: "28px",
    height: "28px",
  },
  logoText: {
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.15em",
    color: "#4dd9ac",
    textTransform: "uppercase",
  },
  statusDot: (online) => ({
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: online ? "#4dd9ac" : "#e24b4a",
    boxShadow: online ? "0 0 6px #4dd9ac88" : "0 0 6px #e24b4a88",
    display: "inline-block",
    marginRight: "6px",
  }),
  statusText: {
    fontSize: "11px",
    color: "#4a6a7a",
    letterSpacing: "0.08em",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconBtn: {
    background: "transparent",
    border: "1px solid #1a2a3a",
    borderRadius: "6px",
    color: "#4a6a7a",
    cursor: "pointer",
    padding: "5px 10px",
    fontSize: "11px",
    letterSpacing: "0.08em",
    transition: "all 0.15s",
  },
  sessionLabel: {
    fontSize: "10px",
    color: "#2a4a5a",
    letterSpacing: "0.1em",
    fontFamily: "monospace",
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  chatPane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    opacity: 0.35,
  },
  emptyIcon: {
    fontSize: "32px",
  },
  emptyText: {
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#4a6a7a",
  },
  msgRow: (role) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: role === "user" ? "flex-end" : "flex-start",
    gap: "4px",
  }),
  msgMeta: (role) => ({
    fontSize: "9px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: role === "user" ? "#2a6a5a" : "#2a4a6a",
    paddingLeft: role === "assistant" ? "2px" : "0",
    paddingRight: role === "user" ? "2px" : "0",
  }),
  bubble: (role) => ({
    maxWidth: "72%",
    padding: "0.75rem 1rem",
    borderRadius: role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
    fontSize: "13px",
    lineHeight: "1.65",
    letterSpacing: "0.02em",
    background: role === "user" ? "#0a2a20" : "#0a1a28",
    border: role === "user" ? "1px solid #1a4a38" : "1px solid #1a2a3a",
    color: role === "user" ? "#7af0c0" : "#b8ccd8",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  }),
  thinkingBubble: {
    maxWidth: "72%",
    padding: "0.75rem 1rem",
    borderRadius: "12px 12px 12px 2px",
    fontSize: "12px",
    background: "#0a1218",
    border: "1px solid #1a2a3a",
    color: "#2a5a4a",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dot: (i) => ({
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#4dd9ac",
    animation: "pulse 1.2s ease-in-out infinite",
    animationDelay: `${i * 0.2}s`,
  }),
  inputArea: {
    padding: "1rem 1.5rem",
    borderTop: "1px solid #1a2a3a",
    background: "#060a0e",
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    background: "#0a1218",
    border: "1px solid #1a2a3a",
    borderRadius: "8px",
    color: "#c8d8e8",
    fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
    fontSize: "13px",
    lineHeight: "1.6",
    padding: "10px 12px",
    resize: "none",
    outline: "none",
    minHeight: "44px",
    maxHeight: "160px",
    transition: "border-color 0.15s",
  },
  sendBtn: (canSend) => ({
    background: canSend ? "#0d3d2a" : "#0a1a18",
    border: `1px solid ${canSend ? "#2a7a5a" : "#1a2a2a"}`,
    borderRadius: "8px",
    color: canSend ? "#4dd9ac" : "#2a4a3a",
    cursor: canSend ? "pointer" : "not-allowed",
    padding: "10px 16px",
    fontSize: "12px",
    letterSpacing: "0.1em",
    fontFamily: "monospace",
    transition: "all 0.15s",
    flexShrink: 0,
    height: "44px",
  }),
  settingsPanel: {
    width: "320px",
    borderLeft: "1px solid #1a2a3a",
    background: "#060a0e",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem",
    gap: "1.25rem",
    overflowY: "auto",
    flexShrink: 0,
  },
  settingsTitle: {
    fontSize: "10px",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#4a6a7a",
    marginBottom: "0.25rem",
  },
  fieldLabel: {
    fontSize: "10px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#3a5a6a",
    marginBottom: "6px",
    display: "block",
  },
  fieldInput: {
    width: "100%",
    background: "#0a1218",
    border: "1px solid #1a2a3a",
    borderRadius: "6px",
    color: "#c8d8e8",
    fontFamily: "monospace",
    fontSize: "12px",
    padding: "8px 10px",
    outline: "none",
    boxSizing: "border-box",
  },
  saveBtn: {
    width: "100%",
    background: "#0d3d2a",
    border: "1px solid #2a7a5a",
    borderRadius: "6px",
    color: "#4dd9ac",
    cursor: "pointer",
    padding: "9px",
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontFamily: "monospace",
    marginTop: "4px",
    transition: "all 0.15s",
  },
  divider: {
    borderTop: "1px solid #1a2a3a",
    margin: "0.25rem 0",
  },
  newSessionBtn: {
    width: "100%",
    background: "transparent",
    border: "1px solid #1a2a3a",
    borderRadius: "6px",
    color: "#4a6a7a",
    cursor: "pointer",
    padding: "8px",
    fontSize: "11px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontFamily: "monospace",
    transition: "all 0.15s",
  },
  errorBanner: {
    background: "#1a0808",
    border: "1px solid #3a1818",
    borderRadius: "8px",
    padding: "0.6rem 1rem",
    fontSize: "12px",
    color: "#e24b4a",
    marginBottom: "0.5rem",
  },
  infoBox: {
    background: "#0a1218",
    border: "1px solid #1a2a3a",
    borderRadius: "6px",
    padding: "0.75rem",
    fontSize: "11px",
    color: "#3a5a6a",
    lineHeight: "1.7",
  },
};

export default function App() {
  const cfg = loadConfig();
  const [apiUrl, setApiUrl] = useState(cfg.apiUrl || "");
  const [maxTokens, setMaxTokens] = useState(cfg.maxTokens || "200");
  const [sessionId, setSessionId] = useState(cfg.sessionId || generateId());
  const [showSettings, setShowSettings] = useState(!cfg.apiUrl);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(!!cfg.apiUrl);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSave() {
    saveConfig({ apiUrl, maxTokens, sessionId });
    setOnline(!!apiUrl);
    setShowSettings(false);
  }

  function handleNewSession() {
    const id = generateId();
    setSessionId(id);
    setMessages([]);
    setError("");
    saveConfig({ apiUrl, maxTokens, sessionId: id });
  }

  async function handleSend() {
    const prompt = input.trim();
    if (!prompt || loading) return;
    if (!apiUrl) { setError("Set your Lambda URL in settings first."); return; }

    setInput("");
    setError("");
    setMessages(m => [...m, { role: "user", content: prompt, id: generateId() }]);
    setLoading(true);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          prompt,
          max_tokens: parseInt(maxTokens) || 200,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const body = typeof data.body === "string" ? JSON.parse(data.body) : data;
      const reply = body.response || body.message || JSON.stringify(body);

      setMessages(m => [...m, { role: "assistant", content: reply, id: generateId() }]);
    } catch (err) {
      setError(err.message || "Request failed");
      setMessages(m => [...m, {
        role: "assistant",
        content: "// error: " + (err.message || "request failed"),
        id: generateId(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = !!input.trim() && !loading && !!apiUrl;

  return (
    <div style={styles.root}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a2a3a; border-radius: 4px; }
        textarea:focus { border-color: #2a5a4a !important; }
        textarea::placeholder { color: #2a4a5a; }
      `}</style>

      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.logo}>
          <svg style={styles.logoIcon} viewBox="0 0 28 28" fill="none">
            <rect x="1" y="1" width="26" height="26" rx="6" stroke="#1a4a3a" strokeWidth="1"/>
            <path d="M7 14 L12 9 L17 14 L12 19Z" fill="#4dd9ac" opacity="0.8"/>
            <path d="M14 7 L21 14 L14 21" stroke="#4dd9ac" strokeWidth="1.5" fill="none" opacity="0.4"/>
          </svg>
          <span style={styles.logoText}>NeuralLink</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={styles.statusDot(online)}></span>
          <span style={styles.statusText}>{online ? "CONNECTED" : "NOT CONFIGURED"}</span>
        </div>
        <div style={styles.topBarRight}>
          <span style={styles.sessionLabel}>SID: {sessionId}</span>
          <button
            style={styles.iconBtn}
            onClick={() => setShowSettings(s => !s)}
          >
            {showSettings ? "CLOSE" : "CONFIG"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {/* Chat pane */}
        <div style={styles.chatPane}>
          <div style={styles.messages}>
            {messages.length === 0 && !loading && (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>◈</div>
                <div style={styles.emptyText}>Awaiting transmission</div>
                <div style={{ fontSize: "10px", color: "#2a3a4a", letterSpacing: "0.08em" }}>
                  {apiUrl ? `→ ${sessionId}` : "Configure endpoint to begin"}
                </div>
              </div>
            )}

            {error && (
              <div style={styles.errorBanner}>
                !! {error}
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} style={styles.msgRow(msg.role)}>
                <div style={styles.msgMeta(msg.role)}>
                  {msg.role === "user" ? "YOU" : "QWEN"} · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{
                  ...styles.bubble(msg.role),
                  ...(msg.isError ? { color: "#e24b4a", borderColor: "#3a1818", background: "#1a0808" } : {}),
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={styles.msgRow("assistant")}>
                <div style={styles.msgMeta("assistant")}>QWEN · processing</div>
                <div style={styles.thinkingBubble}>
                  {[0, 1, 2].map(i => <span key={i} style={styles.dot(i)} />)}
                  <span style={{ fontSize: "11px", letterSpacing: "0.08em" }}>generating</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={styles.inputArea}>
            <textarea
              ref={textareaRef}
              style={styles.textarea}
              placeholder="Enter prompt... (Shift+Enter for newline)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              }}
            />
            <button
              style={styles.sendBtn(canSend)}
              onClick={handleSend}
              disabled={!canSend}
            >
              SEND →
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div style={styles.settingsPanel}>
            <div>
              <div style={styles.settingsTitle}>⬡ Configuration</div>
            </div>

            <div>
              <label style={styles.fieldLabel}>Lambda / API Gateway URL</label>
              <input
                style={styles.fieldInput}
                placeholder="https://xxx.execute-api.us-east-1.amazonaws.com/..."
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
              />
            </div>

            <div>
              <label style={styles.fieldLabel}>Max Tokens</label>
              <input
                style={styles.fieldInput}
                placeholder="200"
                value={maxTokens}
                onChange={e => setMaxTokens(e.target.value)}
                type="number"
                min="50"
                max="1000"
              />
            </div>

            <div>
              <label style={styles.fieldLabel}>Session ID</label>
              <input
                style={styles.fieldInput}
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
              />
            </div>

            <button style={styles.saveBtn} onClick={handleSave}>
              ✓ Save Configuration
            </button>

            <div style={styles.divider} />

            <button style={styles.newSessionBtn} onClick={handleNewSession}>
              ↺ New Session
            </button>

            <div style={styles.divider} />

            <div style={styles.infoBox}>
              <div style={{ marginBottom: "6px", color: "#4a6a7a", letterSpacing: "0.1em", fontSize: "10px", textTransform: "uppercase" }}>
                Setup guide
              </div>
              <div>1. Add API Gateway trigger to Lambda</div>
              <div>2. Paste the invoke URL above</div>
              <div>3. Set max tokens (200 recommended)</div>
              <div>4. Save and start chatting</div>
            </div>

            <div style={{ ...styles.infoBox, color: "#2a5a4a" }}>
              <div style={{ marginBottom: "6px", color: "#2a7a5a", letterSpacing: "0.1em", fontSize: "10px", textTransform: "uppercase" }}>
                Stack
              </div>
              <div>Model · Qwen2.5-3B-Instruct</div>
              <div>Runtime · llama.cpp</div>
              <div>Compute · AWS EC2</div>
              <div>Storage · S3 + DynamoDB</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
