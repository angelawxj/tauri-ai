import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import MainArea from "./components/layout/MainArea";
import DetailPanel from "./components/layout/DetailPanel";
import { useTheme } from "./hooks/useTheme";
import type { OpenDiffRequest } from "./components/source-control";

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [openDiff, setOpenDiff] = useState<OpenDiffRequest | null>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-vscode-bg text-vscode-fg">
      <Sidebar theme={theme} onToggleTheme={toggleTheme} />
      <MainArea openDiff={openDiff} onCloseDiff={() => setOpenDiff(null)} />
      <DetailPanel onOpenDiff={(path, staged) => setOpenDiff({ path, staged })} />
    </div>
  );
}
