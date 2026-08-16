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

export function IconPlus({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 2.5v11M2.5 8h11" />
    </svg>
  );
}

export function IconSearch({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="6.8" cy="6.8" r="4.3" />
      <path d="M10.2 10.2 13.5 13.5" />
    </svg>
  );
}

export function IconSettings({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="8" cy="8" r="2.1" />
      <path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.1 3.9l-1.1 1.1M5 10l-1.1 1.1M12.1 12.1 11 11M5 6l-1.1-1.1" />
    </svg>
  );
}

export function IconGitBranch({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="4.2" cy="3.3" r="1.4" />
      <circle cx="4.2" cy="12.7" r="1.4" />
      <circle cx="11.8" cy="6.3" r="1.4" />
      <path d="M4.2 4.7v6.6M4.2 7.5c0-1.8 1.4-3.2 3.2-3.5l2.7-.5" />
      <path d="M11.8 7.7V6.3" />
    </svg>
  );
}

export function IconRefresh({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M13 8a5 5 0 1 1-1.6-3.7" />
      <path d="M13 2.8V5.6h-2.8" />
    </svg>
  );
}

export function IconFile({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 1.8h5.2L12 4.6v9.6H4z" />
      <path d="M9.2 1.8v2.8H12" />
    </svg>
  );
}

export function IconSend({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M13.5 2.5 2 7.3l4.3 1.7L13.5 2.5Z" />
      <path d="M6.3 9 8 13.5l5.5-11" />
    </svg>
  );
}

export function IconTrash({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 4.5h10M6.2 4.5V3a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v1.5" />
      <path d="M4.3 4.5 4.9 13a1 1 0 0 0 1 .9h4.2a1 1 0 0 0 1-.9l.6-8.5" />
    </svg>
  );
}

export function IconSun({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="8" cy="8" r="3.2" />
      <path d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1M12.5 12.5l-1.1-1.1M4.6 4.6 3.5 3.5" />
    </svg>
  );
}

export function IconMoon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M13.5 9.8A5.8 5.8 0 0 1 6.2 2.5a5.8 5.8 0 1 0 7.3 7.3Z" />
    </svg>
  );
}

export function IconFolder({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2 4.2c0-.66.54-1.2 1.2-1.2h3l1.3 1.6h5.3c.66 0 1.2.54 1.2 1.2v6.4c0 .66-.54 1.2-1.2 1.2H3.2A1.2 1.2 0 0 1 2 11.4Z" />
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

/** 资源管理器 Tab 图标：等比缩放自 lucide 的 Files 图标（堆叠文档），对齐 Orca 右侧栏用的图标 */
export function IconFiles({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 1.33H7.33a1.33 1.33 0 0 0-1.33 1.33v7.33a1.33 1.33 0 0 0 1.33 1.33h5.33a1.33 1.33 0 0 0 1.33-1.33V5.33" />
      <path d="M11.14 1.8A1.6 1.6 0 0 0 10 1.33v3.33a0.67 0.67 0 0 0 0.67 0.67h3.33a1.6 1.6 0 0 0-0.47-1.14z" />
      <path d="M3.33 4.67a1.33 1.33 0 0 0-1.33 1.33v7.33a1.33 1.33 0 0 0 1.33 1.33h5.33a1.33 1.33 0 0 0 1.15-0.67" />
    </svg>
  );
}

/** 对话 Tab 图标，一个简单的消息气泡 */
export function IconMessageCircle({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2 8.2c0-3.1 2.7-5.6 6-5.6s6 2.5 6 5.6-2.7 5.6-6 5.6c-.7 0-1.4-.1-2-.3L3 14.5l.8-2.7C2.7 10.8 2 9.6 2 8.2Z" />
    </svg>
  );
}

/** 终端 Tab 图标 */
export function IconTerminal({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.2" />
      <path d="M4.2 6.2 6.8 8l-2.6 1.8M8 10.8h3.4" />
    </svg>
  );
}

/** "在中间区域打开"按钮图标：方框 + 右上箭头，对齐常见的 external-link 语义 */
export function IconExternalLink({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6.5 3H3.6c-.66 0-1.2.54-1.2 1.2v7.2c0 .66.54 1.2 1.2 1.2h7.2c.66 0 1.2-.54 1.2-1.2V9.5" />
      <path d="M8.8 2.7h4.5v4.5M13.1 2.9 7.6 8.4" />
    </svg>
  );
}

/** 浏览器 Tab 图标 */
export function IconCompass({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="8" cy="8" r="6.3" />
      <path d="M10.3 5.7 9 9l-3.3 1.3L7 7Z" />
    </svg>
  );
}

/** 用于 AI 产物标签，样式对齐 Orca 的 lucide Sparkles 图标 */
export function IconSparkle({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7.345 1.876a.667.667 0 0 1 1.311 0l.701 3.705a1.333 1.333 0 0 0 1.063 1.063l3.705.701a.667.667 0 0 1 0 1.311l-3.705.701a1.333 1.333 0 0 0-1.063 1.063l-.701 3.705a.667.667 0 0 1-1.311 0l-.701-3.705a1.333 1.333 0 0 0-1.063-1.063l-3.705-.701a.667.667 0 0 1 0-1.311l3.705-.701a1.333 1.333 0 0 0 1.063-1.063z" />
      <path d="M13.333 1.333v2.667" />
      <path d="M14.667 2.667h-2.667" />
      <circle cx="2.667" cy="13.333" r="1.333" />
    </svg>
  );
}
