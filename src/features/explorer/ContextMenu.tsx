import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ComponentType } from "react";

export interface ExplorerMenuItem {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  onSelect: () => void;
  destructive?: boolean;
  separatorBefore?: boolean;
  shortcut?: string;
}

interface ExplorerContextMenuProps {
  x: number;
  y: number;
  items: ExplorerMenuItem[];
  onClose: () => void;
}

const MENU_WIDTH = 220;

/** 手写右键菜单，仿 CommitBox.tsx 里已经在用的 fixed 定位 portal 下拉菜单模式（这个项目没有引入 Radix context-menu）。 */
export default function ExplorerContextMenu({ x, y, items, onClose }: ExplorerContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideInteraction = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const left = Math.max(4, Math.min(x, window.innerWidth - MENU_WIDTH - 4));
  const top = Math.max(4, Math.min(y, window.innerHeight - items.length * 28 - 12));

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ left, top, width: MENU_WIDTH }}
      className="fixed z-[100] rounded-md border border-vscode-border-light bg-vscode-bg py-1 shadow-xl"
    >
      {items.map((item) => (
        <div key={item.label}>
        {item.separatorBefore && <div className="my-1 border-t border-vscode-border" />}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-vscode-list-hover ${item.destructive ? "text-red-400" : "text-vscode-fg"}`}
        >
          <item.icon size={13} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.shortcut && <span className="text-[10px] text-vscode-fg-muted">{item.shortcut}</span>}
        </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
