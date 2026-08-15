import { useI18n } from "../../i18n";

interface DiffViewProps {
  patch: string | null;
  loading: boolean;
  error: string | null;
}

function lineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "text-vscode-fg-dim";
  if (line.startsWith("@@")) return "text-vscode-accent";
  if (line.startsWith("+")) return "bg-git-added/10 text-git-added";
  if (line.startsWith("-")) return "bg-git-deleted/10 text-git-deleted";
  return "text-vscode-fg-muted";
}

export default function DiffView({ patch, loading, error }: DiffViewProps) {
  const { t } = useI18n();
  return (
    <div className="px-3 py-2 font-mono text-[12.5px] leading-[1.6]">
      {loading && <div className="px-1 py-1 text-vscode-fg-dim">{t.git.loadingDiff}</div>}
      {!loading && error && <div className="px-1 py-1 text-git-deleted">{error}</div>}
      {!loading && !error && (!patch || patch.length === 0) && (
        <div className="px-1 py-1 text-vscode-fg-dim">{t.git.noDiffToShow}</div>
      )}
      {!loading && !error && patch && patch.length > 0 && (
        <div>
          {patch.split("\n").map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap break-all ${lineClass(line)}`}>
              {line || " "}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
