interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** 等比缩放自 lucide 的 ListFilter 图标，对齐 Orca FileExplorerNameFilter 用的过滤图标 */
export function IconListFilter({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M1.33 3.33h13.33" />
      <path d="M4 8h8" />
      <path d="M6 12.67h4" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 RefreshCw 图标，对齐 Orca FileExplorerToolbar 的刷新按钮 */
export function IconRefresh({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2 8a6 6 0 0 1 6-6 6.5 6.5 0 0 1 4.49 1.83L14 5.33" />
      <path d="M14 2v3.33h-3.33" />
      <path d="M14 8a6 6 0 0 1-6 6 6.5 6.5 0 0 1-4.49-1.83L2 10.67" />
      <path d="M5.33 10.67H2v3.33" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 LoaderCircle 图标，对齐 Orca 目录加载中时替换文件夹图标的转圈动画（配合 animate-spin） */
export function IconLoader({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M14 8a6 6 0 1 1-4.15-5.71" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 ChevronRight；折叠态用它，展开态外层加 rotate-90，对齐 Orca 的做法（同一个图标旋转，不换图标）。 */
export function IconChevronRight({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m6 12 4-4-4-4" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 Folder 图标 */
export function IconFolder({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M13.33 13.33a1.33 1.33 0 0 0 1.33-1.33V5.33a1.33 1.33 0 0 0-1.33-1.33h-5.27a1.33 1.33 0 0 1-1.13-.6L6.4 2.6A1.33 1.33 0 0 0 5.29 2H2.67a1.33 1.33 0 0 0-1.33 1.33v8.67a1.33 1.33 0 0 0 1.33 1.33Z" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 FolderOpen 图标，目录展开态用它 */
export function IconFolderOpen({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m4 9.33 1-1.93A1.33 1.33 0 0 1 6.16 6.67h7.17a1.33 1.33 0 0 1 1.29 1.67l-1.03 4a1.33 1.33 0 0 1-1.3 1H2.67a1.33 1.33 0 0 1-1.33-1.33V3.33a1.33 1.33 0 0 1 1.33-1.33h2.6a1.33 1.33 0 0 1 1.13.6l.54.8a1.33 1.33 0 0 0 1.11.6H12a1.33 1.33 0 0 1 1.33 1.33v1.33" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 File 图标 */
export function IconFile({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 14.67a1.33 1.33 0 0 1-1.33-1.33V2.67a1.33 1.33 0 0 1 1.33-1.33h5.33a1.6 1.6 0 0 1 1.14.47l2.39 2.39a1.6 1.6 0 0 1 .47 1.13v8a1.33 1.33 0 0 1-1.33 1.33z" />
      <path d="M9.33 1.33v3.33a0.67 0.67 0 0 0 0.67 0.67h3.33" />
    </svg>
  );
}

export function IconX({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 ListCollapse 图标，工具栏"折叠全部" */
export function IconListCollapse({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6.67 3.33h7.33" />
      <path d="M6.67 8h7.33" />
      <path d="M6.67 12.67h7.33" />
      <path d="m2 6.67 2-2-2-2" />
      <path d="m2 13.33 2-2-2-2" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 Ellipsis 图标，工具栏"更多" */
export function IconEllipsis({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 16 16" fill="currentColor" stroke="none" className={className}>
      <circle cx="8" cy="8" r="0.9" />
      <circle cx="12.67" cy="8" r="0.9" />
      <circle cx="3.33" cy="8" r="0.9" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 FilePlus 图标，右键菜单"新建文件" */
export function IconFilePlus({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 14.67a1.33 1.33 0 0 1-1.33-1.33V2.67a1.33 1.33 0 0 1 1.33-1.33h5.33a1.6 1.6 0 0 1 1.14.47l2.39 2.39a1.6 1.6 0 0 1 .47 1.13v8a1.33 1.33 0 0 1-1.33 1.33z" />
      <path d="M9.33 1.33v3.33a0.67 0.67 0 0 0 0.67 0.67h3.33" />
      <path d="M6 10h4" />
      <path d="M8 12v-4" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 FolderPlus 图标，右键菜单"新建文件夹" */
export function IconFolderPlus({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 6.67v4" />
      <path d="M6 8.67h4" />
      <path d="M13.33 13.33a1.33 1.33 0 0 0 1.33-1.33V5.33a1.33 1.33 0 0 0-1.33-1.33h-5.27a1.33 1.33 0 0 1-1.13-.6L6.4 2.6A1.33 1.33 0 0 0 5.29 2H2.67a1.33 1.33 0 0 0-1.33 1.33v8.67a1.33 1.33 0 0 0 1.33 1.33Z" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 Copy 图标 */
export function IconCopy({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect width="9.33" height="9.33" x="5.33" y="5.33" rx="1.33" ry="1.33" />
      <path d="M2.67 10.67c-0.73 0-1.33-0.6-1.33-1.33V2.67c0-0.73 0.6-1.33 1.33-1.33h6.67c0.73 0 1.33 0.6 1.33 1.33" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 Pencil 图标，右键菜单"重命名" */
export function IconPencil({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M14.12 4.54a0.67 0.67 0 0 0-2.66-2.66L2.56 10.78a1.33 1.33 0 0 0-.33.55l-.88 2.9a0.33 0.33 0 0 0 .42.41l2.9-.88a1.33 1.33 0 0 0 .55-.33z" />
      <path d="m10 3.33 2.67 2.67" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 Trash2 图标，右键菜单"删除" */
export function IconTrash2({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6.67 7.33v4" />
      <path d="M9.33 7.33v4" />
      <path d="M12.67 4v9.33a1.33 1.33 0 0 1-1.33 1.33H4.67a1.33 1.33 0 0 1-1.33-1.33V4" />
      <path d="M2 4h12" />
      <path d="M5.33 4V2.67a1.33 1.33 0 0 1 1.33-1.33h2.67a1.33 1.33 0 0 1 1.33 1.33v1.33" />
    </svg>
  );
}

/** 等比缩放自 lucide 的 ExternalLink 图标，右键菜单"在系统文件管理器中显示" */
export function IconExternalLink({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 2h4v4" />
      <path d="M6.67 9.33 14 2" />
      <path d="M12 8.67v4a1.33 1.33 0 0 1-1.33 1.33H3.33a1.33 1.33 0 0 1-1.33-1.33V5.33a1.33 1.33 0 0 1 1.33-1.33h4" />
    </svg>
  );
}

export function IconUndo({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 4 2.67 7.33 6 10.67" />
      <path d="M3 7.33h6.33a4 4 0 0 1 4 4" />
    </svg>
  );
}

export function IconRedo({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m10 4 3.33 3.33L10 10.67" />
      <path d="M13 7.33H6.67a4 4 0 0 0-4 4" />
    </svg>
  );
}
