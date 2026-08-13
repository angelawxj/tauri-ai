import Sidebar from "./components/layout/Sidebar";
import ChatArea from "./components/layout/ChatArea";
import DetailPanel from "./components/layout/DetailPanel";

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-vscode-bg text-vscode-fg">
      <Sidebar />
      <ChatArea />
      <DetailPanel />
    </div>
  );
}
