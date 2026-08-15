import { GRAPH_LANE_COLORS, type GraphRow } from "./commit-graph";

export const LANE_WIDTH = 14;
const DOT_RADIUS = 3.5;

interface CommitGraphProps {
  row: GraphRow;
  maxLanes: number;
  rowHeight: number;
  /** HEAD commit renders as a filled dot, everything else hollow */
  isHead: boolean;
  /** merge commits (2+ parents) render as a diamond instead of a circle */
  isMerge: boolean;
}

function laneX(lane: number): number {
  return lane * LANE_WIDTH + LANE_WIDTH / 2;
}

export default function CommitGraph({ row, maxLanes, rowHeight, isHead, isMerge }: CommitGraphProps) {
  const width = Math.max(1, maxLanes) * LANE_WIDTH;
  const midY = rowHeight / 2;
  const dotX = laneX(row.dot.lane);
  const dotColor = GRAPH_LANE_COLORS[row.dot.colorIndex];
  const dotFill = isHead ? dotColor : "#1e1e1e";

  return (
    <svg width={width} height={rowHeight} className="shrink-0 overflow-visible">
      {row.passThrough.map((p) => (
        <line
          key={`pass-${p.lane}`}
          x1={laneX(p.lane)}
          y1={0}
          x2={laneX(p.lane)}
          y2={rowHeight}
          stroke={GRAPH_LANE_COLORS[p.colorIndex]}
          strokeWidth={1.5}
        />
      ))}

      {row.dot.hasIncoming && (
        <line x1={dotX} y1={0} x2={dotX} y2={midY} stroke={dotColor} strokeWidth={1.5} />
      )}

      {row.edgesToNext.map((edge, i) => {
        const x1 = laneX(edge.fromLane);
        const x2 = laneX(edge.toLane);
        const color = GRAPH_LANE_COLORS[edge.colorIndex];
        if (x1 === x2) {
          return (
            <line key={`edge-${i}`} x1={x1} y1={midY} x2={x2} y2={rowHeight} stroke={color} strokeWidth={1.5} />
          );
        }
        return (
          <path
            key={`edge-${i}`}
            d={`M ${x1} ${midY} C ${x1} ${midY + rowHeight * 0.3}, ${x2} ${rowHeight - rowHeight * 0.3}, ${x2} ${rowHeight}`}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
          />
        );
      })}

      {isMerge ? (
        <rect
          x={dotX - DOT_RADIUS}
          y={midY - DOT_RADIUS}
          width={DOT_RADIUS * 2}
          height={DOT_RADIUS * 2}
          transform={`rotate(45 ${dotX} ${midY})`}
          fill={dotFill}
          stroke={dotColor}
          strokeWidth={1.5}
        />
      ) : (
        <circle cx={dotX} cy={midY} r={DOT_RADIUS} fill={dotFill} stroke={dotColor} strokeWidth={1.5} />
      )}
    </svg>
  );
}
