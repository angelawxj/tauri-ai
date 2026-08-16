import { marked } from "marked";

export interface Resolved {
  mode: "iframe-doc" | "iframe-url" | "text";
  html?: string;
  url?: string;
  text?: string;
}

const MARKDOWN_DOC_STYLE = `
  body { margin: 0; padding: 24px 32px; font-family: -apple-system, "Segoe UI", sans-serif; line-height: 1.65; color: #1f1f1f; background: #ffffff; max-width: 860px; }
  pre { background: #f3f3f3; padding: 12px; border-radius: 6px; overflow-x: auto; }
  code { font-family: ui-monospace, "SFMono-Regular", Consolas, monospace; }
  a { color: #007acc; }
`;

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export async function resolveContent(name: string, content: string): Promise<Resolved> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md")) {
    const body = await marked.parse(content);
    return { mode: "iframe-doc", html: `<!doctype html><html><head><meta charset="utf-8"><style>${MARKDOWN_DOC_STYLE}</style></head><body>${body}</body></html>` };
  }
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return { mode: "iframe-doc", html: content };
  }
  return { mode: "text", text: content };
}
