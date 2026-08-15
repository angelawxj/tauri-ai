interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 16 16", fill: "none" as const, stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export function IconPlus({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M8 2.5v11M2.5 8h11" /></svg>; }
export function IconSearch({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><circle cx="6.8" cy="6.8" r="4.3" /><path d="M10.2 10.2 13.5 13.5" /></svg>; }
export function IconChevronRight({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M6 3.5 10.5 8 6 12.5" /></svg>; }
export function IconChevronDown({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M3.5 6 8 10.5 12.5 6" /></svg>; }
export function IconGitBranch({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><circle cx="4.2" cy="3.3" r="1.4" /><circle cx="4.2" cy="12.7" r="1.4" /><circle cx="11.8" cy="6.3" r="1.4" /><path d="M4.2 4.7v6.6M4.2 7.5c0-1.8 1.4-3.2 3.2-3.5l2.7-.5M11.8 7.7V6.3" /></svg>; }
export function IconRefresh({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.8V5.6h-2.8" /></svg>; }
export function IconCheck({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M3 8.3 6.3 11.5 13 4.5" /></svg>; }
export function IconCommitFile({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M4 1.8h5.2L12 4.6v9.6H4zM9.2 1.8v2.8H12M6.4 7.2 4.9 8.6l1.5 1.4M9.6 7.2l1.5 1.4-1.5 1.4" /></svg>; }
export function IconUndo({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M4 4.5H10a3.5 3.5 0 0 1 0 7H7M6 2 3.5 4.5 6 7" /></svg>; }
export function IconMinus({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M2.8 8h10.4" /></svg>; }
export function IconUpload({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M8 12.5V4M8 4 4.5 7.5M8 4l3.5 3.5M3 13.5h10" /></svg>; }
export function IconX({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" /></svg>; }
export function IconSparkle({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><path d="M7.345 1.876a.667.667 0 0 1 1.311 0l.701 3.705a1.333 1.333 0 0 0 1.063 1.063l3.705.701a.667.667 0 0 1 0 1.311l-3.705.701a1.333 1.333 0 0 0-1.063 1.063l-.701 3.705a.667.667 0 0 1-1.311 0l-.701-3.705a1.333 1.333 0 0 0-1.063-1.063l-3.705-.701a.667.667 0 0 1 0-1.311l3.705-.701a1.333 1.333 0 0 0 1.063-1.063z" /><path d="M13.333 1.333v2.667M14.667 2.667h-2.667" /><circle cx="2.667" cy="13.333" r="1.333" /></svg>; }
export function IconGitMerge({ size = 16, className }: IconProps) { return <svg {...base(size)} className={className}><circle cx="12" cy="12" r="2" /><circle cx="4" cy="4" r="2" /><path d="M4 14V6a6 6 0 0 0 6 6" /></svg>; }
