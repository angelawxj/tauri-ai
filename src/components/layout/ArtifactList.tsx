import { IconSparkle } from "../icons";
import { useI18n } from "../../i18n";
import type { Artifact } from "./types";

interface ArtifactListProps {
  artifacts: Artifact[];
  onOpen: (artifact: Artifact) => void;
}

export default function ArtifactList({ artifacts, onOpen }: ArtifactListProps) {
  const { t } = useI18n();

  if (artifacts.length === 0) {
    return <div className="px-3 py-2 text-[12px] text-vscode-fg-dim">{t.artifacts.empty}</div>;
  }

  return (
    <div className="overflow-y-auto">
      {artifacts.map((artifact) => (
        <div
          key={artifact.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(artifact)}
          title={artifact.name}
          className="flex h-[23px] w-full cursor-pointer items-center gap-1.5 px-3 text-[12px] text-vscode-fg hover:bg-vscode-list-hover"
        >
          <IconSparkle size={14} className="shrink-0 text-vscode-fg-muted" />
          <span className="min-w-0 flex-1 truncate">{artifact.name}</span>
        </div>
      ))}
    </div>
  );
}
