interface RefBadgeProps {
  name: string;
}

export default function RefBadge({ name }: RefBadgeProps) {
  return (
    <span
      title={name}
      className="inline-flex max-w-[80px] shrink-0 items-center truncate rounded-full border border-vscode-border-light bg-vscode-badge-bg px-1.5 py-[1px] text-[10px] leading-tight text-vscode-fg-muted"
    >
      {name}
    </span>
  );
}
