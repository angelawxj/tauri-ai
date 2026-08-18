import type { CommitInfo, GitHistoryContext } from "./types";

// The first three entries are semantic reference lanes; the remainder are Orca's
// rotating, unlabelled lane palette.
export const GRAPH_LANE_COLORS = ["#007acc", "#b66dff", "#ea5c00", "#ffb000", "#dc267f", "#994f00", "#40b0a6", "#b66dff"] as const;

const CURRENT_REF_COLOR = 0;
const REMOTE_REF_COLOR = 1;
const BASE_REF_COLOR = 2;
const FIRST_LANE_COLOR = 3;

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
  kind: "commit" | "incoming-changes" | "outgoing-changes";
  isHead: boolean;
  commit?: CommitInfo;
}

function cloneNode(node: GraphNode): GraphNode {
  return { ...node };
}

function resolveBaseCommitHash(commits: CommitInfo[], context?: GitHistoryContext): string | undefined {
  // With history context available, only an explicitly resolved base branch
  // owns the base lane.  The merge base can instead be the upstream tip (for
  // example dev...origin/dev); coloring it as a base made Orca's purple remote
  // lane incorrectly turn orange.
  if (context) return context.baseRef?.revision;

  // Orca persists the selected base branch ("dev" in the inspected worktree).
  // Our lightweight backend has no branch-base selector yet, so use the first
  // matching local base reference as a deterministic equivalent.
  return commits.find((commit) =>
    commit.refs.some((ref) => ref === "dev" || ref === "main"),
  )?.hash;
}

function commitColor(
  commit: CommitInfo,
  context: GitHistoryContext | undefined,
  baseCommitHash: string | undefined,
): number | undefined {
  // The backend deliberately sends display names in CommitInfo.refs. Do not infer
  // a ref namespace from '/', because local branch names such as codex/foo also
  // contain it. Orca matches the resolved current/upstream references instead.
  if (commit.hash === context?.currentRef?.revision || (context?.currentRef && commit.refs.includes(context.currentRef.name))) return CURRENT_REF_COLOR;
  if (commit.hash === context?.remoteRef?.revision || (context?.remoteRef && commit.refs.includes(context.remoteRef.name))) return REMOTE_REF_COLOR;
  if (context?.baseRef && (commit.hash === context.baseRef.revision || commit.refs.includes(context.baseRef.name))) return BASE_REF_COLOR;
  // Orca switches to the base-ref lane at the merge base.  Without this
  // boundary the current branch's blue lane incorrectly continues through
  // the shared history, making the lower history graph monochrome.
  if (baseCommitHash === commit.hash) return BASE_REF_COLOR;
  return undefined;
}

function addOutgoingBoundary(rows: GraphRow[], currentRef?: GitHistoryContext["currentRef"]): void {
  const revision = currentRef?.revision;
  if (!revision) return;
  const currentIndex = rows.findIndex((row) => row.isHead && row.commitHash === revision);
  if (currentIndex === -1) return;

  const current = rows[currentIndex]!;
  const inputSwimlanes = current.inputSwimlanes.map(cloneNode);
  const outputSwimlanes = inputSwimlanes.concat({ id: revision, colorIndex: CURRENT_REF_COLOR });
  rows.splice(currentIndex, 0, {
    inputSwimlanes, outputSwimlanes, commitHash: "git-history-outgoing-changes", parents: [revision], parentCount: 1,
    laneCount: Math.max(inputSwimlanes.length, outputSwimlanes.length, 1), kind: "outgoing-changes", isHead: false,
  });
  current.inputSwimlanes.push({ id: revision, colorIndex: CURRENT_REF_COLOR });
  current.laneCount = Math.max(current.inputSwimlanes.length, current.outputSwimlanes.length, 1);
}

function addIncomingBoundary(rows: GraphRow[], remoteRef?: GitHistoryContext["remoteRef"], mergeBase?: string): void {
  if (!remoteRef?.revision || remoteRef.revision === mergeBase || !mergeBase) return;
  const afterIndex = rows.findIndex((row) => row.commitHash === mergeBase);
  if (afterIndex === -1) return;
  let beforeIndex = -1;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index]!.outputSwimlanes.some((node) => node.id === mergeBase)) { beforeIndex = index; break; }
  }
  const after = rows[afterIndex]!;
  const inputSwimlanes = beforeIndex === -1 ? after.inputSwimlanes.map(cloneNode) : rows[beforeIndex]!.outputSwimlanes.map((node) =>
    node.id === mergeBase && node.colorIndex === REMOTE_REF_COLOR ? { id: "git-history-incoming-changes", colorIndex: REMOTE_REF_COLOR } : cloneNode(node),
  );
  const outputSwimlanes = after.inputSwimlanes.map(cloneNode);
  if (!outputSwimlanes.some((node) => node.id === mergeBase && node.colorIndex === REMOTE_REF_COLOR)) {
    const localIndex = outputSwimlanes.findIndex((node) => node.id === mergeBase && node.colorIndex === CURRENT_REF_COLOR);
    outputSwimlanes.splice(localIndex === -1 ? outputSwimlanes.length : localIndex + 1, 0, { id: mergeBase, colorIndex: REMOTE_REF_COLOR });
  }
  if (!inputSwimlanes.some((node) => node.id === "git-history-incoming-changes" && node.colorIndex === REMOTE_REF_COLOR)) {
    const remoteIndex = outputSwimlanes.findIndex((node) => node.id === mergeBase && node.colorIndex === REMOTE_REF_COLOR);
    inputSwimlanes.splice(remoteIndex === -1 ? inputSwimlanes.length : remoteIndex, 0, { id: "git-history-incoming-changes", colorIndex: REMOTE_REF_COLOR });
  }
  rows.splice(afterIndex, 0, {
    inputSwimlanes, outputSwimlanes, commitHash: "git-history-incoming-changes", parents: [mergeBase], parentCount: 1,
    laneCount: Math.max(inputSwimlanes.length, outputSwimlanes.length, 1), kind: "incoming-changes", isHead: false,
  });
  after.inputSwimlanes = outputSwimlanes.map(cloneNode);
  after.laneCount = Math.max(after.inputSwimlanes.length, after.outputSwimlanes.length, 1);
}

/** Port of Orca's input/output swimlane algorithm, including upstream boundary rows. */
export function computeSwimlanes(commits: CommitInfo[], context?: GitHistoryContext): GraphRow[] {
  const rows: GraphRow[] = [];
  const commitsByHash = new Map(commits.map((commit) => [commit.hash, commit]));
  let laneSequence = -1;
  const baseCommitHash = resolveBaseCommitHash(commits, context);
  for (const commit of commits) {
    const inputSwimlanes = (rows[rows.length - 1]?.outputSwimlanes ?? []).map(cloneNode);
    const outputSwimlanes: GraphNode[] = [];
    let firstParentAdded = false;
    if (commit.parents.length > 0) {
      for (const node of inputSwimlanes) {
        if (node.id === commit.hash) {
          if (!firstParentAdded) { outputSwimlanes.push({ id: commit.parents[0]!, colorIndex: commitColor(commit, context, baseCommitHash) ?? node.colorIndex }); firstParentAdded = true; }
          continue;
        }
        outputSwimlanes.push(cloneNode(node));
      }
    }
    for (let index = firstParentAdded ? 1 : 0; index < commit.parents.length; index += 1) {
      const parent = commitsByHash.get(commit.parents[index]);
      let colorIndex = index === 0 ? commitColor(commit, context, baseCommitHash) : parent ? commitColor(parent, context, baseCommitHash) : undefined;
      if (colorIndex === undefined) { laneSequence = (laneSequence + 1) % (GRAPH_LANE_COLORS.length - FIRST_LANE_COLOR); colorIndex = FIRST_LANE_COLOR + laneSequence; }
      outputSwimlanes.push({ id: commit.parents[index]!, colorIndex });
    }
    rows.push({
      inputSwimlanes, outputSwimlanes, commitHash: commit.hash, parents: commit.parents, parentCount: commit.parents.length,
      laneCount: Math.max(inputSwimlanes.length, outputSwimlanes.length, 1), kind: "commit",
      isHead: commit.hash === context?.currentRef?.revision, commit,
    });
  }
  if (context?.hasIncomingChanges) addIncomingBoundary(rows, context.remoteRef, context.mergeBase);
  if (context?.hasOutgoingChanges) addOutgoingBoundary(rows, context.currentRef);
  return rows;
}
