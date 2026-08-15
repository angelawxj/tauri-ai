import { GRAPH_PALETTE, type GraphRow } from "./commit-graph";

export const LANE_WIDTH = 11;
const ROW_HEIGHT = 24;
const CURVE_RADIUS = 5;
const NODE_Y = ROW_HEIGHT / 2;
const CIRCLE_RADIUS = 3.5;
const CIRCLE_STROKE_WIDTH = 1.5;

interface CommitGraphProps {
  row: GraphRow;
  maxLanes: number;
  rowHeight: number;
  isHead?: boolean;
}

function graphColor(colorIndex: number): string { return GRAPH_PALETTE[colorIndex]; }

export default function CommitGraph({ row, isHead = false }: CommitGraphProps) {
  const input = row.inputSwimlanes;
  const output = row.outputSwimlanes;
  const inputIndex = input.findIndex((node) => node.id === row.commitHash);
  const circleIndex = inputIndex === -1 ? input.length : inputIndex;
  const circleColor = output[circleIndex]?.colorIndex ?? input[circleIndex]?.colorIndex ?? 0;
  const width = LANE_WIDTH * (Math.max(input.length, output.length, 1) + 1);
  const paths: JSX.Element[] = [];
  let outputIndex = 0;

  for (let index = 0; index < input.length; index += 1) {
    const node = input[index];
    const color = graphColor(node.colorIndex);
    if (node.id === row.commitHash) {
      if (index !== circleIndex) {
        paths.push(<path key={`merge-${index}`} d={`M ${LANE_WIDTH * (index + 1)} 0 A ${LANE_WIDTH} ${LANE_WIDTH} 0 0 1 ${LANE_WIDTH * index} ${NODE_Y} H ${LANE_WIDTH * (circleIndex + 1)}`} fill="none" stroke={color} strokeLinecap="round" strokeWidth={1} />);
      } else { outputIndex += 1; }
      continue;
    }
    if (outputIndex < output.length && node.id === output[outputIndex].id) {
      if (index === outputIndex) {
        paths.push(<path key={`vertical-${index}`} d={`M ${LANE_WIDTH * (index + 1)} 0 V ${ROW_HEIGHT}`} fill="none" stroke={color} strokeLinecap="round" strokeWidth={1} />);
      } else {
        const x = LANE_WIDTH * (index + 1);
        const targetX = LANE_WIDTH * (outputIndex + 1);
        paths.push(<path key={`shift-${index}-${outputIndex}`} d={`M ${x} 0 V 6 A ${CURVE_RADIUS} ${CURVE_RADIUS} 0 0 1 ${x - CURVE_RADIUS} ${ROW_HEIGHT / 2} H ${targetX + CURVE_RADIUS} A ${CURVE_RADIUS} ${CURVE_RADIUS} 0 0 0 ${targetX} ${ROW_HEIGHT / 2 + CURVE_RADIUS} V ${ROW_HEIGHT}`} fill="none" stroke={color} strokeLinecap="round" strokeWidth={1} />);
      }
      outputIndex += 1;
    }
  }

  for (let parentIndex = 1; parentIndex < row.parentCount; parentIndex += 1) {
    const parentHash = row.parents[parentIndex];
    let parentOutputIndex = -1;
    for (let index = output.length - 1; index >= 0; index -= 1) {
      if (output[index].id === parentHash) {
        parentOutputIndex = index;
        break;
      }
    }
    if (parentOutputIndex === -1) continue;
    const color = graphColor(output[parentOutputIndex].colorIndex);
    paths.push(<path key={`parent-${parentIndex}`} d={`M ${LANE_WIDTH * parentOutputIndex} ${ROW_HEIGHT / 2} A ${LANE_WIDTH} ${LANE_WIDTH} 0 0 1 ${LANE_WIDTH * (parentOutputIndex + 1)} ${ROW_HEIGHT} M ${LANE_WIDTH * parentOutputIndex} ${ROW_HEIGHT / 2} H ${LANE_WIDTH * (circleIndex + 1)}`} fill="none" stroke={color} strokeLinecap="round" strokeWidth={1} />);
  }

  if (inputIndex !== -1) paths.push(<path key="into-node" d={`M ${LANE_WIDTH * (circleIndex + 1)} 0 V ${ROW_HEIGHT / 2}`} fill="none" stroke={graphColor(input[inputIndex].colorIndex)} strokeLinecap="round" strokeWidth={1} />);
  if (row.parentCount > 0) paths.push(<path key="out-node" d={`M ${LANE_WIDTH * (circleIndex + 1)} ${ROW_HEIGHT / 2} V ${ROW_HEIGHT}`} fill="none" stroke={graphColor(circleColor)} strokeLinecap="round" strokeWidth={1} />);

  const cx = LANE_WIDTH * (circleIndex + 1);
  const isMerge = row.parentCount > 1;
  return (
    <svg aria-hidden="true" className="shrink-0 overflow-visible" width={width} height={ROW_HEIGHT} viewBox={`0 0 ${width} ${ROW_HEIGHT}`}>
      {paths}
      {isHead ? <><circle cx={cx} cy={NODE_Y} r={CIRCLE_RADIUS + 3} fill={graphColor(circleColor)} stroke="var(--color-vscode-panel)" strokeWidth={CIRCLE_STROKE_WIDTH} /><circle cx={cx} cy={NODE_Y} r={CIRCLE_STROKE_WIDTH} fill="var(--color-vscode-panel)" /></> : isMerge ? <><circle cx={cx} cy={NODE_Y} r={CIRCLE_RADIUS + 1} fill={graphColor(circleColor)} /><circle cx={cx} cy={NODE_Y} r={CIRCLE_RADIUS - 1.5} fill="var(--color-vscode-panel)" /></> : <circle cx={cx} cy={NODE_Y} r={CIRCLE_RADIUS} fill={graphColor(circleColor)} />}
    </svg>
  );
}
