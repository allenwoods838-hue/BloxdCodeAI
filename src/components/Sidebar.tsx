import type { Reference } from "../data";

export type View =
  | { type: "home" }
  | { type: "functions"; id?: string }
  | { type: "callbacks"; id?: string }
  | { type: "blocks" }
  | { type: "items" }
  | { type: "icons" }
  | { type: "examples" }
  | { type: "guide"; id: string };

const NAV: { type: View["type"]; label: string; icon: string; countKey?: string }[] = [
  { type: "home", label: "Home", icon: "⌂" },
  { type: "functions", label: "API Functions", icon: "ƒ", countKey: "functions" },
  { type: "callbacks", label: "Callbacks", icon: "↻", countKey: "callbacks" },
  { type: "blocks", label: "Block Names", icon: "▦", countKey: "blocks" },
  { type: "items", label: "Item Names", icon: "⚒", countKey: "items" },
  { type: "icons", label: "Ingame Icons", icon: "★", countKey: "icons" },
  { type: "examples", label: "Examples", icon: "❯", countKey: "examples" },
];

export function Sidebar({
  data,
  view,
  query,
  onQuery,
  onNav,
  open,
}: {
  data: Reference;
  view: View;
  query: string;
  onQuery: (q: string) => void;
  onNav: (v: View) => void;
  open: boolean;
}) {
  return (
    <aside className={open ? "sidebar open" : "sidebar"}>
      <div className="brand">
        <div className="brand-title">
          <div className="brand-logo">⚒</div>
          Bloxd Code Helper
        </div>
        <div className="brand-sub">Custom Gamemode API Reference</div>
      </div>

      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input
          className="search"
          placeholder="Search functions, blocks…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>

      <nav className="nav">
        <div className="nav-section">Reference</div>
        {NAV.map((n) => (
          <div
            key={n.type}
            className={view.type === n.type ? "nav-item active" : "nav-item"}
            onClick={() => { onNav({ type: n.type } as View); onQuery(""); }}
          >
            <span className="ic">{n.icon}</span>
            {n.label}
            {n.countKey && <span className="nav-count">{data.meta.counts[n.countKey]}</span>}
          </div>
        ))}

        <div className="nav-section">Guides</div>
        {data.guidePages.map((g) => (
          <div
            key={g.id}
            className={view.type === "guide" && (view as any).id === g.id ? "nav-item active" : "nav-item"}
            onClick={() => { onNav({ type: "guide", id: g.id } as View); onQuery(""); }}
          >
            <span className="ic">▸</span>
            {g.title}
          </div>
        ))}
      </nav>

      <div className="nav-footer">
        Docs from{" "}
        <a href={data.meta.source} target="_blank" rel="noreferrer">
          Bloxdy/code-api
        </a>
      </div>
    </aside>
  );
}
