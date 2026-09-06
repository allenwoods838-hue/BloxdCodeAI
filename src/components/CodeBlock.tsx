import { useState } from "react";

export function CodeBlock({ title, code, lang }: { title?: string; code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="codeblock">
      <div className="cb-head">
        <span className="cb-title">{title || lang || "js"}</span>
        <button className={copied ? "copy-btn done" : "copy-btn"} onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
