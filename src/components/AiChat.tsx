import { useEffect, useRef, useState } from "react";
import { CodeBlock } from "./CodeBlock";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How do I make a player jump really high?",
  "Show me a callback that runs every tick and heals all players",
  "How do I send a colored message to everyone?",
  "Give me a death detection callback that respawns the player",
];

// Parse a message into alternating text / code-block segments.
function renderContent(text: string) {
  const parts: { type: "text" | "code"; content: string }[] = [];
  const re = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
    parts.push({ type: "code", content: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  if (!parts.length) parts.push({ type: "text", content: text });
  return parts;
}

export function AiChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function streamChat(userText: string) {
    setStreaming(true);
    setError(null);
    const history: Msg[] = [...messages, { role: "user", content: userText }];
    setMessages([...history, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        let msg = `Request failed (${res.status})`;
        try {
          msg = JSON.parse(errText)?.error || msg;
        } catch {
          /* keep default */
        }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: acc };
                return next;
              });
            }
          } catch {
            /* ignore partial */
          }
        }
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
      setMessages((prev) => prev.filter((m) => m.content !== ""));
    } finally {
      setStreaming(false);
    }
  }

  function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");
    streamChat(content);
  }

  return (
    <div className="chat">
      <div className="chat-head">
        <div className="chat-title">
          <span className="chat-spark">✦</span> Bloxd Code Assistant
        </div>
        <span className="chat-model">nvidia/nemotron-3-ultra-550b-a55b:free</span>
      </div>

      <div className="chat-body" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Ask me to help write Bloxd.io gamemode code. I know the full Code API — functions, callbacks, blocks, items and icons.</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="suggestion" onClick={() => send(s)} disabled={streaming}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "msg msg-user" : "msg msg-assistant"}>
            <div className="msg-avatar">{m.role === "user" ? "You" : "✦"}</div>
            <div className="msg-content">
              {renderContent(m.content).map((p, j) =>
                p.type === "code" ? (
                  <CodeBlock key={j} code={p.content} lang="js" />
                ) : (
                  <p key={j} className="msg-text">{p.content}</p>
                )
              )}
              {m.role === "assistant" && streaming && i === messages.length - 1 && m.content === "" && (
                <p className="msg-text thinking">Thinking…</p>
              )}
            </div>
          </div>
        ))}

        {error && <div className="chat-error">{error}</div>}
      </div>

      <div className="chat-input">
        <textarea
          placeholder="Ask about Bloxd.io code… (Enter to send, Shift+Enter for newline)"
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="send-btn" onClick={() => send()} disabled={streaming || !input.trim()}>
          {streaming ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
