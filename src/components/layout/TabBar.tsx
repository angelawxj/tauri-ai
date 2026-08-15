import { useI18n } from "../../i18n";

export interface TabDef {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabBarProps {
  tabs: TabDef[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function TabBar({ tabs, activeId, onChange }: TabBarProps) {
  const { t } = useI18n();
  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-vscode-border bg-vscode-panel-header">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            title={tab.disabled ? t.tabs.comingSoon : undefined}
            className={`relative px-3 text-[12px] transition-colors ${
              tab.disabled
                ? "cursor-not-allowed text-vscode-fg-dim"
                : isActive
                  ? "text-vscode-fg"
                  : "text-vscode-fg-muted hover:text-vscode-fg"
            }`}
          >
            {tab.label}
            {isActive && !tab.disabled && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-vscode-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
