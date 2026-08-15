import type { CommitInfo } from "./types";

export const GRAPH_PALETTE = ["#007acc", "#e2a336", "#73c991", "#c586c0", "#f14c4c"] as const;

export interface GraphNode {
  id: string;
  colorIndex: number;
}

export interface GraphRow {
  commitIndex: number;
  inputSwimlanes: GraphNode[];
  outputSwimlanes: GraphNode[];
  commitHash: string;
  parents: string[];
  parentCount: number;
  laneCount: number;
}

function cloneNode(node: GraphNode): GraphNode {
  return { ...node };
}

/** Port of Orca's input/output swimlane model. */
export function computeCommitGraph(commits: CommitInfo[]): GraphRow[] {
  const rows: GraphRow[] = [];
  let colorSequence = -1;

  commits.forEach((commit, commitIndex) => {
    const inputSwimlanes = (rows[rows.length - 1]?.outputSwimlanes ?? []).map(cloneNode);
    const outputSwimlanes: GraphNode[] = [];
    let firstParentAdded = false;

    if (commit.parents.length > 0) {
      for (const node of inputSwimlanes) {
        if (node.id === commit.hash) {
          if (!firstParentAdded) {
            outputSwimlanes.push({ id: commit.parents[0], colorIndex: node.colorIndex });
            firstParentAdded = true;
          }
          continue;
        }
        outputSwimlanes.push(cloneNode(node));
      }
    }

    for (let parentIndex = firstParentAdded ? 1 : 0; parentIndex < commit.parents.length; parentIndex += 1) {
      colorSequence = (colorSequence + 1) % GRAPH_PALETTE.length;
      outputSwimlanes.push({ id: commit.parents[parentIndex], colorIndex: colorSequence });
    }

    rows.push({
      commitIndex,
      inputSwimlanes,
      outputSwimlanes,
      commitHash: commit.hash,
      parents: commit.parents,
      parentCount: commit.parents.length,
      laneCount: Math.max(inputSwimlanes.length, outputSwimlanes.length, 1),
    });
  });

  return rows;
}
