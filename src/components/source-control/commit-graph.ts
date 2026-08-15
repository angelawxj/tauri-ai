import type { CommitInfo } from "./types";

// Orca's graph palette: current ref, base ref, remote ref, then unlabelled lanes.
export const GRAPH_LANE_COLORS = ["#007acc", "#ea5c00", "#b66dff", "#ffb000", "#dc267f", "#40b0a6", "#ce9178"] as const;

export interface GraphNode {
  id: string;
  colorIndex: number;
}

export interface GraphRow {
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
function refColor(commit: CommitInfo, currentBranch?: string): number | undefined {
  if (currentBranch && commit.refs.includes(currentBranch)) return 0;
  if (commit.refs.some((ref) => ref.endsWith("/main"))) return 1;
  if (currentBranch && commit.refs.includes(`origin/${currentBranch}`)) return 2;
  return undefined;
}

export function computeSwimlanes(commits: CommitInfo[], currentBranch?: string): GraphRow[] {
  const rows: GraphRow[] = [];
  let colorSequence = -1;

  for (const commit of commits) {
    const inputSwimlanes = (rows[rows.length - 1]?.outputSwimlanes ?? []).map(cloneNode);
    const outputSwimlanes: GraphNode[] = [];
    let firstParentAdded = false;

    if (commit.parents.length > 0) {
      for (const node of inputSwimlanes) {
        if (node.id === commit.hash) {
          if (!firstParentAdded) {
            outputSwimlanes.push({ id: commit.parents[0], colorIndex: refColor(commit, currentBranch) ?? node.colorIndex });
            firstParentAdded = true;
          }
          continue;
        }
        outputSwimlanes.push(cloneNode(node));
      }
    }

    for (let parentIndex = firstParentAdded ? 1 : 0; parentIndex < commit.parents.length; parentIndex += 1) {
      const parentCommit = commits.find((candidate) => candidate.hash === commit.parents[parentIndex]);
      const labeledColor = parentIndex === 0 ? refColor(commit, currentBranch) : parentCommit && refColor(parentCommit, currentBranch);
      if (labeledColor !== undefined) {
        outputSwimlanes.push({ id: commit.parents[parentIndex], colorIndex: labeledColor });
      } else {
        colorSequence = (colorSequence + 1) % (GRAPH_LANE_COLORS.length - 3);
        outputSwimlanes.push({ id: commit.parents[parentIndex], colorIndex: colorSequence + 3 });
      }
    }

    rows.push({
      inputSwimlanes,
      outputSwimlanes,
      commitHash: commit.hash,
      parents: commit.parents,
      parentCount: commit.parents.length,
      laneCount: Math.max(inputSwimlanes.length, outputSwimlanes.length, 1),
    });
  }

  return rows;
}
