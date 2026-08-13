import type { CommitInfo } from "../types/git";

/** VSCode Graph 风格的分支线颜色循环 */
export const GRAPH_PALETTE = [
  "#3794ff", // blue
  "#e2a336", // orange
  "#73c991", // green
  "#c586c0", // purple
  "#f14c4c", // red
  "#4ec9b0", // teal
  "#dcdcaa", // yellow
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
  /** index into the commits array this row represents */
  commitIndex: number;
  dot: GraphDot;
  /** lanes that only pass straight through this row (no dot), drawn as vertical lines */
  passThrough: GraphPassLine[];
  /** edges drawn from this row's dot down to the next row (parent lane(s), incl. merges) */
  edgesToNext: GraphEdge[];
  /** total lane columns alive after this row, used to size the SVG grid width */
  laneCount: number;
}

/**
 * 由提交列表（新→旧，含 parents，parent 顺序在前的一定先出现）计算分支图布局。
 * 维护一组"活跃 lane"，每个 lane 记录它正等待出现的父 commit hash；
 * 遇到该 hash 时把提交放进对应 lane，多个 lane 同时等待同一 hash 即为合并提交的汇入点。
 */
export function computeCommitGraph(commits: CommitInfo[]): GraphRow[] {
  const lanes: (string | null)[] = [];
  const laneColor: number[] = [];
  let colorCounter = 0;
  const rows: GraphRow[] = [];

  const nextColor = () => {
    const c = colorCounter % GRAPH_PALETTE.length;
    colorCounter += 1;
    return c;
  };

  const findFreeLane = (): number => {
    const idx = lanes.findIndex((h) => h === null);
    if (idx !== -1) return idx;
    lanes.push(null);
    laneColor.push(0);
    return lanes.length - 1;
  };

  commits.forEach((commit, commitIndex) => {
    let laneIdx = lanes.findIndex((h) => h === commit.hash);
    let hasIncoming = true;
    if (laneIdx === -1) {
      laneIdx = findFreeLane();
      laneColor[laneIdx] = nextColor();
      hasIncoming = false;
    }
    const colorIndex = laneColor[laneIdx];

    // 其它同样在等待这个 hash 的 lane：说明它们的子提交把这个 commit 当作另一个 parent（合并提交在此汇入）
    const mergingLaneIdxs: number[] = [];
    lanes.forEach((h, i) => {
      if (i !== laneIdx && h === commit.hash) mergingLaneIdxs.push(i);
    });

    // 本行未被占用、仍存活的 lane：画穿行竖线（在汇入 lane 清空之前取快照）
    const passThrough: GraphPassLine[] = [];
    lanes.forEach((h, i) => {
      if (i === laneIdx || mergingLaneIdxs.includes(i) || h === null) return;
      passThrough.push({ lane: i, colorIndex: laneColor[i] });
    });

    mergingLaneIdxs.forEach((i) => {
      lanes[i] = null;
    });

    const edgesToNext: GraphEdge[] = [];
    const parents = commit.parents;
    if (parents.length === 0) {
      lanes[laneIdx] = null;
    } else {
      lanes[laneIdx] = parents[0];
      edgesToNext.push({ fromLane: laneIdx, toLane: laneIdx, colorIndex });

      for (let pi = 1; pi < parents.length; pi += 1) {
        const parentHash = parents[pi];
        let mergeLaneIdx = lanes.findIndex((h) => h === parentHash);
        if (mergeLaneIdx === -1) {
          mergeLaneIdx = findFreeLane();
          lanes[mergeLaneIdx] = parentHash;
          laneColor[mergeLaneIdx] = nextColor();
        }
        edgesToNext.push({ fromLane: laneIdx, toLane: mergeLaneIdx, colorIndex: laneColor[mergeLaneIdx] });
      }
    }

    rows.push({
      commitIndex,
      dot: { lane: laneIdx, colorIndex, hasIncoming },
      passThrough,
      edgesToNext,
      laneCount: lanes.length,
    });
  });

  return rows;
}
