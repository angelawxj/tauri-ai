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

export function IconChevronRight({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

export function IconChevronDown({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.5 6 8 10.5 12.5 6" />
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

export function IconCheck({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 8.3 6.3 11.5 13 4.5" />
    </svg>
  );
}

export function IconMore({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} strokeWidth={2.2}>
      <path d="M3.5 8h.01M8 8h.01M12.5 8h.01" />
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

/** Orca-style code document glyph used by Source Control file rows. */
export function IconCommitFile({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 1.8h5.2L12 4.6v9.6H4z" />
      <path d="M9.2 1.8v2.8H12M6.4 7.2 4.9 8.6l1.5 1.4M9.6 7.2l1.5 1.4-1.5 1.4" />
    </svg>
  );
}

export function IconUndo({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 4.5H10a3.5 3.5 0 0 1 0 7H7" />
      <path d="M6 2 3.5 4.5 6 7" />
    </svg>
  );
}

export function IconMinus({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2.8 8h10.4" />
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

export function IconUpload({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 12.5V4M8 4 4.5 7.5M8 4l3.5 3.5" />
      <path d="M3 13.5h10" />
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
