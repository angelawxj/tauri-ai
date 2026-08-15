import CommitGraph from "./CommitGraph";
import type { GraphRow } from "./commit-graph";

interface BoundaryRowProps {
  graphRow: GraphRow;
  maxLanes: number;
}

/** Orca-style marker for commits hidden behind the current branch's upstream boundary. */
export default function BoundaryRow({ graphRow, maxLanes }: BoundaryRowProps) {
  const label = graphRow.kind === "outgoing-changes" ? "Outgoing Changes" : "Incoming Changes";
  return (
    <div className="grid min-h-[26px] grid-cols-[auto_minmax(0,1fr)] items-center px-3 py-0.5 text-xs text-vscode-fg">
      <CommitGraph row={graphRow} maxLanes={maxLanes} rowHeight={26} isHead={false} />
      <span className="truncate">{label}</span>
    </div>
  );
}
