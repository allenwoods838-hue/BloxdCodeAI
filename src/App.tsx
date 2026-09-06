import { useMemo, useState } from "react";
import { data } from "./data";
import { Sidebar, type View } from "./components/Sidebar";
import { EntryDetail } from "./components/EntryDetail";
import { CodeBlock } from "./components/CodeBlock";
import { MarkdownView } from "./components/MarkdownView";
import { AiChat } from "./components/AiChat";

const iconFor = (e: { kind: string; name: string; description: string }) =>
  e.kind === "callback" ? "cb" : "fn";

export default function App() {
  const [view, setView] = useState<View>({ type: "home" });
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false);

  const onNav = (v: View) => {
    setView(v);
    setQuery("");
    setDrawer(false);
  };

  // merged searchable index for the global search box
  const allEntries = useMemo(
    () => [...data.functions.map((f) => ({ ...f, kind: "function" as const })), ...data.callbacks],
    []
  );

  const go = (v: View) => setView(v);

  // ---------- home ----------
  if (view.type === "home") {
    return (
      <Shell data={data} view={view} query={query} setQuery={setQuery} onNav={onNav} drawer={drawer} setDrawer={setDrawer}>
        <div className="home">
          <h1>Bloxd Code Helper</h1>
          <p className="lead">
            A searchable companion for building custom Bloxd.io gamemodes with the{" "}
            <a href={data.meta.source} target="_blank" rel="noreferrer">
              Code API
            </a>
            . Browse every <code>api.*</code> function, world-code callback, block, item, and icon —
            with copy-ready snippets. Use the search box to jump to anything.
          </p>

          <div className="stat-grid">
            {[
              { n: data.meta.counts.functions, l: "API Functions", v: { type: "functions" } as View },
              { n: data.meta.counts.callbacks, l: "Callbacks", v: { type: "callbacks" } as View },
              { n: data.meta.counts.blocks, l: "Block Names", v: { type: "blocks" } as View },
              { n: data.meta.counts.items, l: "Item Names", v: { type: "items" } as View },
              { n: data.meta.counts.icons, l: "Ingame Icons", v: { type: "icons" } as View },
              { n: data.meta.counts.examples, l: "Examples", v: { type: "examples" } as View },
            ].map((s, i) => (
              <div key={i} className="stat" onClick={() => go(s.v)}>
                <div className="num">{s.n}</div>
                <div className="lbl">{s.l}</div>
              </div>
            ))}
          </div>

          <h2>Quick Examples</h2>
          <div className="home-examples">
            {data.examples.slice(0, 4).map((ex, i) => (
              <div key={i}>
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 2 }}>{ex.title}</div>
                <CodeBlock code={ex.code} lang="js" />
              </div>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- AI chat ----------
  if (view.type === "chat") {
    return (
      <Shell data={data} view={view} query={query} setQuery={setQuery} onNav={onNav} drawer={drawer} setDrawer={setDrawer}>
        <AiChat />
      </Shell>
    );
  }

  // ---------- examples ----------
  if (view.type === "examples") {
    return (
      <Shell data={data} view={view} query={query} setQuery={setQuery} onNav={onNav} drawer={drawer} setDrawer={setDrawer}>
        <div className="home">
          <h1>Code Examples</h1>
          <p className="lead">Ready-to-paste snippets for code blocks and <code>press to code</code> boards.</p>
          {data.examples.map((ex, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13.5, color: "var(--text-dim)", marginBottom: 4 }}>{ex.title}</div>
              <CodeBlock code={ex.code} lang="js" />
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ---------- guide ----------
  if (view.type === "guide") {
    const g = data.guidePages.find((x) => x.id === view.id);
    if (!g) return <Shell data={data} view={view} query={query} setQuery={setQuery} onNav={onNav} drawer={drawer} setDrawer={setDrawer}><div className="empty">Guide not found.</div></Shell>;
    return (
      <Shell data={data} view={view} query={query} setQuery={setQuery} onNav={onNav} drawer={drawer} setDrawer={setDrawer}>
        <MarkdownView source={g.content} />
      </Shell>
    );
  }

  // ---------- string lists (blocks / items / icons) ----------
  if (view.type === "blocks" || view.type === "items" || view.type === "icons") {
    const list = view.type === "blocks" ? data.blocks : view.type === "items" ? data.items : data.icons;
    const q = query.trim().toLowerCase();
    const filtered = q ? list.filter((x) => x.toLowerCase().includes(q)) : list;
    const titles: Record<string, string> = { blocks: "Block Names", items: "Item Names", icons: "Ingame Icons" };
    return (
      <Shell data={data} view={view} query={query} setQuery={setQuery} onNav={onNav} drawer={drawer} setDrawer={setDrawer}>
        <div className="grid-page">
          <h1>{titles[view.type]}</h1>
          <div className="gdesc">
            {view.type === "blocks"
              ? "Root block names. Append meta suffixes (e.g. |meta|rot1) for variants."
              : view.type === "items"
              ? "Item names usable with api functions that take an ItemName."
              : "IngameIconName values for StyledIcon / effect icons."}
          </div>
          <div className="grid-bar">
            <input
              placeholder={`Filter ${list.length} ${view.type}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="gc">
              {filtered.length} of {list.length} shown
            </div>
          </div>
          <div className="chips">
            {filtered.slice(0, 600).map((name, i) => (
              <div
                key={i}
                className="chip"
                title="Click to copy"
                onClick={() => navigator.clipboard?.writeText(name)}
              >
                {name}
              </div>
            ))}
          </div>
          {filtered.length > 600 && <div className="empty">Showing first 600 — refine your filter to see more.</div>}
          {filtered.length === 0 && <div className="empty">No matches.</div>}
        </div>
      </Shell>
    );
  }

  // ---------- functions / callbacks (split list + detail) ----------
  const kind = view.type === "callbacks" ? "callback" : "function";
  const source = kind === "callback" ? data.callbacks : data.functions;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? source.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.params.some((p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q))
      )
    : source;

  const selectedId = (view as any).id as string | undefined;
  const selected = selectedId ? source.find((e) => e.name === selectedId) : filtered[0];

  return (
    <Shell data={data} view={view} query={query} setQuery={setQuery} onNav={onNav} drawer={drawer} setDrawer={setDrawer}>
      <div className="split">
        <div className="pane-list">
          <div className="list-head">
            <h2>{kind === "callback" ? "Callbacks" : "API Functions"}</h2>
            <div className="meta">
              {filtered.length} of {source.length}
            </div>
          </div>
          {filtered.map((e) => (
            <div
              key={e.name}
              className={selected?.name === e.name ? "list-item selected" : "list-item"}
              onClick={() => setView({ type: view.type, id: e.name } as View)}
            >
              <div className="li-name">
                {e.name}
                <span className={iconFor(e) === "fn" ? "li-badge fn" : "li-badge cb"}>
                  {iconFor(e) === "fn" ? "fn" : "cb"}
                </span>
              </div>
              <div className="li-desc">{e.description.split("\n")[0]}</div>
            </div>
          ))}
          {filtered.length === 0 && <div className="empty">No matches for “{query}”.</div>}
        </div>
        <div className="pane-detail">
          {selected ? <EntryDetail entry={selected} /> : <div className="empty">Select an item.</div>}
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  data,
  view,
  query,
  setQuery,
  onNav,
  drawer,
  setDrawer,
  children,
}: {
  data: ReturnType<typeof Object>;
  view: View;
  query: string;
  setQuery: (q: string) => void;
  onNav: (v: View) => void;
  drawer: boolean;
  setDrawer: (fn: (d: boolean) => boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="app">
      <div className={drawer ? "scrim show" : "scrim"} onClick={() => setDrawer(() => false)} />
      <Sidebar data={data as any} view={view} query={query} onQuery={setQuery} onNav={onNav} open={drawer} />
      <main className="main">
        <div className="topbar">
          <button className="menu-btn" onClick={() => setDrawer((d) => !d)} aria-label="Menu">
            ☰
          </button>
          <span className="tb-logo">⚒</span>
          <span className="tb-title">Bloxd Code Helper</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
