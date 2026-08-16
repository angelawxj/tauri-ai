const RENDERABLE_EXTENSIONS = [".html", ".htm", ".md"];

/** Whether a file/artifact name should open in the 浏览器 (Browser) tab instead of a raw-text tab. */
export function isRenderableName(name: string): boolean {
  const lower = name.toLowerCase();
  return RENDERABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
