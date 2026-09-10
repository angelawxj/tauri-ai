export interface FileSelection {
  path: string;
  text: string;
  start: number;
  end: number;
  startLine: number;
  endLine: number;
}

export function describeSelection(selection: FileSelection): string {
  return `${selection.path}:${selection.startLine}-${selection.endLine}\n\n${selection.text}`;
}
