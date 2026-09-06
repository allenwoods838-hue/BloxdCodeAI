import type { ApiEntry } from "../data";
import { CodeBlock } from "./CodeBlock";

function buildSignature(entry: ApiEntry): string {
  const ps = entry.params.map((p) => p.name).join(", ");
  if (entry.kind === "callback") {
    return `${entry.name} = (${ps}) => { }`;
  }
  return `api.${entry.name}(${ps})`;
}

function renderSignature(entry: ApiEntry) {
  const sig = buildSignature(entry);
  // Colorize: api. / callback name, param names, parens
  if (entry.kind === "function") {
    const open = sig.indexOf("(");
    const head = sig.slice(0, open);
    const inside = sig.slice(open + 1, sig.lastIndexOf(")"));
    const params = inside.split(", ").map((p, i) => (
      <span key={i}>
        {i > 0 && <span style={{ color: "var(--text-mute)" }}>, </span>}
        <span className="pn">{p}</span>
      </span>
    ));
    return (
      <>
        <span className="kw">{head}</span>
        <span style={{ color: "var(--text-mute)" }}>(</span>
        {params}
        <span style={{ color: "var(--text-mute)" }}>)</span>
      </>
    );
  }
  // callback
  const eq = sig.indexOf(" =");
  const head = sig.slice(0, eq);
  const rest = sig.slice(eq);
  return (
    <>
      <span className="kw2">{head}</span>
      <span style={{ color: "var(--text-mute)" }}>{rest}</span>
    </>
  );
}

export function EntryDetail({ entry }: { entry: ApiEntry }) {
  return (
    <div className="detail">
      <div className="crumb">
        <span className={entry.kind === "function" ? "kind-tag fn" : "kind-tag cb"}>
          {entry.kind === "function" ? "api function" : "callback"}
        </span>
        Bloxd.io Code API
      </div>
      <h1>{entry.name}</h1>
      {entry.description && <div className="desc">{entry.description}</div>}

      <div className="signature">
        {renderSignature(entry)}
        <div style={{ marginTop: 10 }}>
          <CodeBlock code={buildSignature(entry)} lang="js" />
        </div>
      </div>

      <div className="section-title">Parameters</div>
      {entry.params.length ? (
        <table className="params">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {entry.params.map((p, i) => (
              <tr key={i}>
                <td className="name">{p.name}</td>
                <td className="type">{p.type}</td>
                <td className="pdesc">{p.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="no-params">No parameters.</div>
      )}

      {entry.returns && (
        <>
          <div className="section-title">Returns</div>
          <div className="returns-box">
            <span className="rtype">{entry.returns.type || "void"}</span>
            {entry.returns.description && (
              <div style={{ color: "var(--text-dim)", marginTop: 6, fontSize: 13.5 }}>{entry.returns.description}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
