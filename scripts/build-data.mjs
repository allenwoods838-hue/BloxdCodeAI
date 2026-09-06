// Parses the downloaded Bloxd.io code-api docs into structured JSON the React app consumes.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docs = join(__dirname, "..", "docs");
const outDir = join(__dirname, "..", "src", "data");
mkdirSync(outDir, { recursive: true });

function read(name) {
  return readFileSync(join(docs, name), "utf8");
}

function stripInline(s) {
  return (s || "").replace(/`/g, "").replace(/\\\|/g, "|").trim();
}

// ---------- Parse API_REFERENCE.md / CALLBACKS.md (same format) ----------
function parseTocFile(fileName, kind) {
  const md = read(fileName);
  // Split on level-2 headers. The first chunk is the file title/intro.
  const chunks = md.split(/\n(?=## )/);
  const entries = [];
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const lines = chunk.split("\n");
    const name = lines[0].replace(/^##\s+/, "").trim();
    if (!name) continue;
    const body = lines.slice(1).join("\n");

    let description = "";
    let params = [];
    let returns = null;

    // Description: text up to the first "### " heading.
    const firstH3 = body.indexOf("\n### ");
    const descRaw = firstH3 === -1 ? body : body.slice(0, firstH3);
    description = descRaw.replace(/^[^\S\n]*\n/, "").trim();

    // Parameters
    const paramsMatch = body.match(/### Parameters:\s*\n([\s\S]*?)(?=\n### |\n## |$)/);
    if (paramsMatch) {
      const table = paramsMatch[1];
      const rows = table.split("\n").filter((l) => l.trim().startsWith("|"));
      // skip header + separator
      const dataRows = rows.filter((l) => !/^\|[\s-:|]+\|?\s*$/.test(l)).slice(1);
      for (const row of dataRows) {
        // Split on | not preceded by backslash, then unescape \| -> |.
        const cells = row
          .split(/(?<!\\)\|/)
          .map((c) => c.replace(/\\\|/g, "|").trim());
        if (cells.length && cells[0] === "") cells.shift();
        if (cells.length && cells[cells.length - 1] === "") cells.pop();
        if (cells.length >= 3) {
          const pname = cells[0];
          const ptype = cells[1];
          const pdesc = cells.slice(2).join(" | ");
          params.push({
            name: stripInline(pname),
            type: stripInline(ptype),
            description: stripInline(pdesc),
          });
        }
      }
    }

    // Returns
    const retMatch = body.match(/### Returns:\s*\n([\s\S]*?)(?=\n### |\n## |$)/);
    if (retMatch) {
      const retBlock = retMatch[1].trim();
      const retLines = retBlock.split("\n").map((l) => l.trim()).filter(Boolean);
      if (retLines.length) {
        returns = {
          type: stripInline(retLines[0]),
          description: retLines.slice(1).join(" ").trim(),
        };
      }
    }

    entries.push({ name, kind, description, params, returns });
  }
  return entries;
}

const functions = parseTocFile("API_REFERENCE.md", "function");
const callbacks = parseTocFile("CALLBACKS.md", "callback");

// ---------- Parse list files (lines not starting with #) ----------
function parseList(fileName) {
  return read(fileName)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

const blocks = [...new Set(parseList("BLOCK_NAMES.txt"))];
const items = [...new Set(parseList("ITEM_NAMES.txt"))];

// ---------- Parse icons from ICONS.md ----------
function parseIcons() {
  const md = read("ICONS.md");
  const idx = md.indexOf("## Ingame Icons");
  if (idx === -1) return [];
  const after = md.slice(idx);
  const fence = after.indexOf("```");
  if (fence === -1) return [];
  const end = after.indexOf("```", fence + 3);
  if (end === -1) return [];
  return after
    .slice(fence + 3, end)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
const icons = parseIcons();

// ---------- Parse examples from README.md ----------
function parseExamples() {
  const md = read("README.md");
  const examples = [];
  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim().startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const code = codeLines.join("\n").trim();
      if (code) {
        // Find the most recent non-empty text line above the fence as the title.
        let title = "Example";
        for (let j = examples.length ? 0 : 0; ; ) break;
        examples.push({ title, code });
      }
    } else {
      i++;
    }
  }
  // Better: pair each code fence with the preceding non-empty paragraph.
  const better = [];
  const re = /([^\n]+?)\s*```(?:js|javascript)?\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md)) !== null) {
    const titleRaw = m[1].trim();
    // Clean a leading "Code Block to " style or "Push the player:" → use as title
    const title = titleRaw.replace(/[:\s]+$/, "") || "Example";
    better.push({ title, code: m[2].trim() });
  }
  return better;
}
const examples = parseExamples();

// ---------- Guides: extra doc pages rendered as markdown ----------
const guidePages = [
  { id: "getting-started", title: "Getting Started", file: "README.md" },
  { id: "client-options", title: "Client Options", file: "CLIENT_OPTIONS.md" },
  { id: "entity-settings", title: "Entity Settings", file: "ENTITY_SETTINGS.md" },
  { id: "mob-settings", title: "Mob Settings", file: "MOB_SETTINGS.md" },
  { id: "mesh-entities", title: "Mesh Entities", file: "MESH_ENTITY_DOCS.md" },
  { id: "particles", title: "Particles", file: "PARTICLES.md" },
  { id: "qte", title: "Quick Time Events", file: "QTE_DOCS.md" },
  { id: "skins-poses", title: "Skins & Poses", file: "SKINS_AND_POSES.md" },
  { id: "sounds-music", title: "Sounds & Music", file: "SOUNDS_AND_MUSIC.md" },
  { id: "icons", title: "Icons", file: "ICONS.md" },
].map((g) => ({ ...g, content: read(g.file) }));

const reference = {
  meta: {
    generated: new Date().toISOString(),
    source: "https://github.com/Bloxdy/code-api",
    counts: {
      functions: functions.length,
      callbacks: callbacks.length,
      blocks: blocks.length,
      items: items.length,
      icons: icons.length,
      examples: examples.length,
    },
  },
  functions,
  callbacks,
  blocks,
  items,
  icons,
  examples,
  guidePages,
};

writeFileSync(join(outDir, "reference.json"), JSON.stringify(reference, null, 2));
console.log("Built reference.json:");
console.log(`  functions: ${functions.length}`);
console.log(`  callbacks: ${callbacks.length}`);
console.log(`  blocks: ${blocks.length}`);
console.log(`  items: ${items.length}`);
console.log(`  icons: ${icons.length}`);
console.log(`  examples: ${examples.length}`);
console.log(`  guides: ${guidePages.length}`);
