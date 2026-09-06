import reference from "./data/reference.json";

export type ApiEntry = {
  name: string;
  kind: "function" | "callback";
  description: string;
  params: { name: string; type: string; description: string }[];
  returns: { type: string; description: string } | null;
};

export type Example = { title: string; code: string };
export type GuidePage = { id: string; title: string; file: string; content: string };

export type Reference = {
  meta: { generated: string; source: string; counts: Record<string, number> };
  functions: ApiEntry[];
  callbacks: ApiEntry[];
  blocks: string[];
  items: string[];
  icons: string[];
  examples: Example[];
  guidePages: GuidePage[];
};

export const data = reference as unknown as Reference;
