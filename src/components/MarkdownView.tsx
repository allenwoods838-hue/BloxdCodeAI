import { CodeBlock } from "./CodeBlock";

// Minimal, dependency-free markdown renderer covering the subset used by the
// Bloxd code-api docs: headings, fenced code, tables, lists, blockquotes, inline code/bold.
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s: string) {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return out;
}

export function MarkdownView({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: { type: string; content: any }[] = [];
  let i = 0;

  const flushList = (buf: string[], ordered: boolean) => {
    if (!buf.length) return;
    const items = buf.map((l) => `<li>${inline(l)}</li>`).join("");
    blocks.push({ type: "list", content: `<${ordered ? "ol" : "ul"}>${items}</${ordered ? "ol" : "ul"}>` });
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push({ type: "code", content: code.join("\n") });
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length + 1; // shift down one (doc # → h2)
      blocks.push({ type: "h", content: { level: Math.min(level, 4), text: inline(h[2]) } });
      i++;
      continue;
    }

    // blockquote
    if (line.trim().startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", content: inline(buf.join(" ")) });
      continue;
    }

    // table
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\s*\|[\s-:|]+\|/.test(lines[i + 1])) {
      const header = line.split("|").slice(1, -1).map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      blocks.push({ type: "table", content: { header, rows } });
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      flushList(buf, false);
      continue;
    }
    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      flushList(buf, true);
      continue;
    }

    // blank
    if (line.trim() === "") {
      i++;
      continue;
    }

    // paragraph (gather consecutive non-empty, non-special lines)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith(">") &&
      !lines[i].trim().startsWith("|") &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", content: inline(buf.join(" ")) });
  }

  return (
    <div className="md">
      {blocks.map((b, idx) => {
        if (b.type === "code") return <CodeBlock key={idx} code={b.content} lang="js" />;
        if (b.type === "h") {
          const Tag = `h${b.content.level}` as any;
          return <Tag key={idx} dangerouslySetInnerHTML={{ __html: b.content.text }} />;
        }
        if (b.type === "p") return <p key={idx} dangerouslySetInnerHTML={{ __html: b.content }} />;
        if (b.type === "quote") return <blockquote key={idx} dangerouslySetInnerHTML={{ __html: b.content }} />;
        if (b.type === "list") return <div key={idx} dangerouslySetInnerHTML={{ __html: b.content }} />;
        if (b.type === "table") {
          return (
            <table key={idx}>
              <thead>
                <tr>{b.content.header.map((h: string, j: number) => <th key={j} dangerouslySetInnerHTML={{ __html: inline(h) }} />)}</tr>
              </thead>
              <tbody>
                {b.content.rows.map((r: string[], j: number) => (
                  <tr key={j}>{r.map((c, k) => <td key={k} dangerouslySetInnerHTML={{ __html: inline(c) }} />)}</tr>
                ))}
              </tbody>
            </table>
          );
        }
        return null;
      })}
    </div>
  );
}
