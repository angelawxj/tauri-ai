import type { ComponentType } from "react";
import { useI18n } from "../../i18n";

interface TabIconProps {
  size?: number;
  className?: string;
}

export interface TabDef {
  id: string;
  label: string;
  icon: ComponentType<TabIconProps>;
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
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            title={tab.disabled ? t.tabs.comingSoon : tab.label}
            aria-label={tab.label}
            className={`relative flex w-10 items-center justify-center transition-colors ${
              tab.disabled
                ? "cursor-not-allowed text-vscode-fg-dim"
                : isActive
                  ? "text-vscode-fg"
                  : "text-vscode-fg-muted hover:text-vscode-fg"
            }`}
          >
            <Icon size={16} />
            {isActive && !tab.disabled && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-vscode-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
