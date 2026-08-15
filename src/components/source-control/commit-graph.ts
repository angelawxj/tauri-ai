import type { CommitInfo } from "./types";

/** swimlane 分支线颜色循环 */
export const GRAPH_LANE_COLORS = [
  "#3794ff",
  "#e2a336",
  "#73c991",
  "#c586c0",
  "#f14c4c",
  "#4ec9b0",
  "#dcdcaa",
] as const;

export interface GraphDot {
  lane: number;
  colorIndex: number;
  /** false when this lane has no line coming in from the row above (new branch tip) */
  hasIncoming: boolean;
}

export interface GraphPassLine {
  lane: number;
  colorIndex: number;
}

export interface GraphEdge {
  fromLane: number;
  toLane: number;
  colorIndex: number;
}

export interface GraphRow {
  dot: GraphDot;
  /** lanes that only pass straight through this row (no dot), drawn as vertical lines */
  passThrough: GraphPassLine[];
  /** edges drawn from this row's dot down to the next row (parent lane(s), incl. merges) */
  edgesToNext: GraphEdge[];
  /** total lane columns alive after this row, used to size the SVG grid width */
  laneCount: number;
}

/**
 * 由提交列表（新→旧，含 parents，parent 顺序在前的一定先出现）计算 swimlane 布局。
 * 维护一组"活跃 lane"，每个 lane 记录它正等待出现的父 commit hash；
 * 遇到该 hash 时把提交放进对应 lane，多个 lane 同时等待同一 hash 即为合并提交的汇入点。
 */
export function computeSwimlanes(commits: CommitInfo[]): GraphRow[] {
  const lanes: (string | null)[] = [];
  const laneColors: number[] = [];
  let colorSeq = 0;
  const rows: GraphRow[] = [];

  const nextColor = () => {
    const c = colorSeq % GRAPH_LANE_COLORS.length;
    colorSeq += 1;
    return c;
  };

  const claimLane = (): number => {
    const free = lanes.findIndex((h) => h === null);
    if (free !== -1) return free;
    lanes.push(null);
    laneColors.push(0);
    return lanes.length - 1;
  };

  for (const commit of commits) {
    let lane = lanes.findIndex((h) => h === commit.hash);
    let hasIncoming = true;
    if (lane === -1) {
      lane = claimLane();
      laneColors[lane] = nextColor();
      hasIncoming = false;
    }
    const colorIndex = laneColors[lane];

    // 其它同样在等待这个 hash 的 lane：说明它们的子提交把这个 commit 当作另一个 parent（合并提交在此汇入）
    const mergingLanes: number[] = [];
    lanes.forEach((h, i) => {
      if (i !== lane && h === commit.hash) mergingLanes.push(i);
    });

    const passThrough: GraphPassLine[] = [];
    lanes.forEach((h, i) => {
      if (i === lane || mergingLanes.includes(i) || h === null) return;
      passThrough.push({ lane: i, colorIndex: laneColors[i] });
    });

    mergingLanes.forEach((i) => {
      lanes[i] = null;
    });

    const edgesToNext: GraphEdge[] = [];
    const parents = commit.parents;
    if (parents.length === 0) {
      lanes[lane] = null;
    } else {
      lanes[lane] = parents[0];
      edgesToNext.push({ fromLane: lane, toLane: lane, colorIndex });

      for (let i = 1; i < parents.length; i += 1) {
        const parentHash = parents[i];
        let mergeLane = lanes.findIndex((h) => h === parentHash);
        if (mergeLane === -1) {
          mergeLane = claimLane();
          lanes[mergeLane] = parentHash;
          laneColors[mergeLane] = nextColor();
        }
        edgesToNext.push({ fromLane: lane, toLane: mergeLane, colorIndex: laneColors[mergeLane] });
      }
    }

    rows.push({
      dot: { lane, colorIndex, hasIncoming },
      passThrough,
      edgesToNext,
      laneCount: lanes.length,
    });
  }

  return rows;
}
