import { useI18n } from "../../i18n";
import type { Resolved } from "./browser-render";

interface BrowserViewProps {
  resolved: Resolved;
}

export default function BrowserView({ resolved }: BrowserViewProps) {
  const { t } = useI18n();

  if (resolved.mode === "iframe-doc") {
    return <iframe title="browser-doc" sandbox="allow-scripts" srcDoc={resolved.html} className="h-full w-full border-0 bg-white" />;
  }
  if (resolved.mode === "iframe-url") {
    return (
      <>
        <div className="px-3 py-1 text-[11px] text-vscode-fg-dim">{t.browser.crossOriginNotice}</div>
        <iframe title="browser-url" src={resolved.url} sandbox="allow-scripts allow-same-origin allow-forms" className="h-[calc(100%-22px)] w-full border-0 bg-white" />
      </>
    );
  }
  return <pre className="h-full overflow-y-auto whitespace-pre-wrap break-all px-3 py-2 font-mono text-[12.5px] leading-[1.6] text-vscode-fg">{resolved.text}</pre>;
}
