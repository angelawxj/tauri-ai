import { IconX } from "../icons";
import { useI18n } from "../../i18n";
import type { PoppedBrowser } from "./Browser";
import BrowserView from "./BrowserView";

interface PoppedBrowserTabProps {
  browser: PoppedBrowser;
  onClose: () => void;
}

export default function PoppedBrowserTab({ browser, onClose }: PoppedBrowserTabProps) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col overflow-hidden bg-vscode-bg">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-vscode-border px-3">
        <span className="min-w-0 truncate text-[12px] text-vscode-fg-muted" title={browser.title}>
          {browser.title}
        </span>
        <button type="button" onClick={onClose} title={t.common.close} className="shrink-0 rounded p-1 text-vscode-fg-muted hover:bg-vscode-list-hover hover:text-vscode-fg">
          <IconX size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <BrowserView resolved={browser.resolved} />
      </div>
    </div>
  );
}
