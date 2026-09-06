// Lightweight backend proxy for the AI Chat assistant.
// Keeps the OpenRouter API key server-side and injects the full Bloxd.io Code API
// reference as system context so the assistant actually "knows" the API.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";
const API_KEY = process.env.OPENROUTER_API_KEY;
const PORT = Number(process.env.PORT || 8787);

const ref = JSON.parse(
  readFileSync(new URL("../src/data/reference.json", import.meta.url), "utf8")
);

function oneline(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function buildApiContext() {
  const fns = ref.functions
    .map((f) => {
      const ps = f.params.map((p) => p.name).join(", ");
      const ret = f.returns && f.returns.type ? ` -> ${f.returns.type}` : "";
      return `- api.${f.name}(${ps})${ret}: ${oneline(f.description)}`;
    })
    .join("\n");
  const cbs = ref.callbacks
    .map((c) => {
      const ps = c.params.map((p) => p.name).join(", ");
      const ret = c.returns && c.returns.type ? ` -> ${c.returns.type}` : "";
      return `- ${c.name}(${ps})${ret}: ${oneline(c.description)}`;
    })
    .join("\n");
  const sampleItems = ref.items.slice(0, 40).join(", ");
  const sampleBlocks = ref.blocks.slice(0, 40).join(", ");
  return `You are an expert assistant for building custom Bloxd.io gamemodes using the Bloxd.io Code API.
You write JavaScript that runs inside Bloxd.io code blocks, "press to code" boards, and world code (F8).

KEY FACTS:
- Global variables: myId, playerId (player ID of whoever runs the code), thisPos (position of the executing code block/board), ownerDbId — also available on the api object.
- Actions go through the "api" object, e.g. api.sendMessage(playerId, "hi"), api.setHealth(myId, 99).
- World code uses callbacks: assign a function to a callback name, e.g. tick = () => {}, onPlayerJoin = (playerId) => {}.
- Only /* block comments */ work. // line comments do NOT work — never use them.
- Block, item and icon names must be exact strings.

API FUNCTIONS (${ref.functions.length} total):
${fns}

CALLBACKS (${ref.callbacks.length} total):
${cbs}

REFERENCE NAMES:
- ${ref.blocks.length} block names exist (e.g. ${sampleBlocks} …). Use exact names.
- ${ref.items.length} item names exist (e.g. ${sampleItems} …). Use exact names.
- ${ref.icons.length} ingame icons exist for StyledIcon (e.g. ${ref.icons.slice(0, 12).join(", ")}).

When giving code, prefer complete, working snippets. Always use /* */ comments, never //. Keep answers focused and practical.`;
}

const SYSTEM_PROMPT = buildApiContext();

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  if (req.url === "/api/health") return sendJson(res, 200, { ok: true, model: MODEL, hasKey: !!API_KEY });

  if (req.url === "/api/chat" && req.method === "POST") {
    if (!API_KEY) return sendJson(res, 503, { error: "Missing OPENROUTER_API_KEY. Add it in your secrets." });
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON body." });
    }
    const userMessages = Array.isArray(payload.messages) ? payload.messages : [];
    const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...userMessages];

    try {
      const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://bloxd-code-helper.local",
          "X-Title": "Bloxd Code Helper",
        },
        body: JSON.stringify({ model: MODEL, messages, stream: true }),
      });

      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        return sendJson(res, upstream.status || 502, { error: `OpenRouter error: ${text.slice(0, 300)}` });
      }

      // Pipe the SSE stream straight through to the client.
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      return res.end();
    } catch (err) {
      if (!res.headersSent) return sendJson(res, 502, { error: `Upstream fetch failed: ${err.message}` });
      return res.end();
    }
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Bloxd Code Helper API on :${PORT} (model: ${MODEL}, key: ${API_KEY ? "set" : "MISSING"})`);
});
