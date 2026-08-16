import type { Language } from "./language";

interface MockSession {
  id: string;
  title: string;
  time: string;
}

interface DemoMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface TranslationDict {
  common: {
    refresh: string;
    close: string;
    unknownError: string;
  };
  sidebar: {
    searchSessions: string;
    newChat: string;
    switchToLightTheme: string;
    switchToDarkTheme: string;
    settings: string;
    mockSessions: MockSession[];
    projects: string;
    addProject: string;
    noProjects: string;
    removeProject: string;
    confirmRemoveProject: (name: string) => string;
  };
  chat: {
    modelPreviewNote: string;
    typing: string;
    placeholder: string;
    send: string;
    you: string;
    initialMessages: DemoMessage[];
    demoReply: string;
    artifactReply: string;
    demoArtifactName: string;
    demoArtifactContent: string;
    demoHtmlArtifactName: string;
    demoHtmlArtifactContent: string;
    demoTextArtifactName: string;
    demoTextArtifactContent: string;
    viewArtifact: string;
  };
  tabs: {
    chat: string;
    explorer: string;
    sourceControl: string;
    files: string;
    terminal: string;
    browser: string;
    artifacts: string;
    comingSoon: string;
  };
  detailPanel: {
    resizePanel: string;
  };
  browser: {
    addressPlaceholder: string;
    loading: string;
    loadFailed: string;
    empty: string;
    notConnected: string;
    crossOriginNotice: string;
    popOut: string;
  };
  artifacts: {
    empty: string;
  };
}

// 单文件 HTML+JS 扫雷游戏示例产物：经典 9x9/10 雷，左键翻开(首次必安全+连锁展开)，
// 右键插旗，胜负判定。中英文共用同一份内容。
const DEMO_MINESWEEPER_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; font-family: -apple-system, "Segoe UI", sans-serif; background: #1e1e1e; color: #ccc; }
  #hud { display: flex; align-items: center; gap: 16px; font-size: 14px; }
  #reset { cursor: pointer; background: #007acc; color: #fff; border: none; border-radius: 4px; padding: 4px 10px; font-size: 13px; }
  #reset:hover { background: #1177bb; }
  #board { display: grid; grid-template-columns: repeat(9, 28px); grid-template-rows: repeat(9, 28px); gap: 1px; background: #454545; border: 1px solid #454545; }
  .cell { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: #3c3c3c; font-size: 14px; font-weight: 600; cursor: pointer; user-select: none; }
  .cell.revealed { background: #2a2a2a; cursor: default; }
  .cell.mine { background: #c74e39; }
  .c1 { color: #4ea1ff; } .c2 { color: #73c991; } .c3 { color: #ff6568; } .c4 { color: #b57bff; }
  .c5 { color: #e2c08d; } .c6 { color: #4dd0e1; } .c7 { color: #ccc; } .c8 { color: #9d9d9d; }
  #status { font-size: 13px; min-height: 18px; }
</style>
</head>
<body>
  <div id="hud">
    <span>剩余雷数: <span id="mineCount">10</span></span>
    <button id="reset">重新开始</button>
    <span id="status"></span>
  </div>
  <div id="board"></div>
  <script>
    const SIZE = 9, MINES = 10;
    let cells = [], mineSet = new Set(), revealedCount = 0, flagCount = 0, over = false;
    const board = document.getElementById("board");
    const mineCountEl = document.getElementById("mineCount");
    const statusEl = document.getElementById("status");

    function idx(x, y) { return y * SIZE + x; }
    function neighbors(x, y) {
      const out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) out.push([nx, ny]);
      }
      return out;
    }

    function placeMines(safeX, safeY) {
      mineSet = new Set();
      while (mineSet.size < MINES) {
        const x = Math.floor(Math.random() * SIZE), y = Math.floor(Math.random() * SIZE);
        if (x === safeX && y === safeY) continue;
        mineSet.add(idx(x, y));
      }
    }

    function countAdjacent(x, y) {
      return neighbors(x, y).filter(([nx, ny]) => mineSet.has(idx(nx, ny))).length;
    }

    function build() {
      board.innerHTML = "";
      cells = [];
      mineSet = new Set();
      revealedCount = 0; flagCount = 0; over = false;
      statusEl.textContent = "";
      mineCountEl.textContent = String(MINES);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const el = document.createElement("div");
          el.className = "cell";
          el.addEventListener("click", () => onReveal(x, y));
          el.addEventListener("contextmenu", (e) => { e.preventDefault(); onFlag(x, y); });
          board.appendChild(el);
          cells.push({ el, revealed: false, flagged: false });
        }
      }
    }

    function onFlag(x, y) {
      if (over) return;
      const cell = cells[idx(x, y)];
      if (cell.revealed) return;
      cell.flagged = !cell.flagged;
      cell.el.textContent = cell.flagged ? "\u{1F6A9}" : "";
      flagCount += cell.flagged ? 1 : -1;
      mineCountEl.textContent = String(MINES - flagCount);
    }

    function onReveal(x, y) {
      if (over) return;
      const cell = cells[idx(x, y)];
      if (cell.revealed || cell.flagged) return;
      if (mineSet.size === 0) placeMines(x, y);
      if (mineSet.has(idx(x, y))) {
        revealAllMines();
        over = true;
        statusEl.textContent = "\u{1F4A5} 踩到地雷了";
        return;
      }
      flood(x, y);
      checkWin();
    }

    function flood(x, y) {
      const cell = cells[idx(x, y)];
      if (cell.revealed || cell.flagged) return;
      cell.revealed = true;
      revealedCount++;
      cell.el.classList.add("revealed");
      const n = countAdjacent(x, y);
      if (n > 0) {
        cell.el.textContent = String(n);
        cell.el.classList.add("c" + n);
      } else {
        neighbors(x, y).forEach(([nx, ny]) => flood(nx, ny));
      }
    }

    function revealAllMines() {
      mineSet.forEach((i) => {
        const cell = cells[i];
        cell.el.classList.add("revealed", "mine");
        cell.el.textContent = "\u{1F4A3}";
      });
    }

    function checkWin() {
      if (revealedCount === SIZE * SIZE - MINES) {
        over = true;
        statusEl.textContent = "\u{1F389} 扫雷成功";
      }
    }

    document.getElementById("reset").addEventListener("click", build);
    build();
  </script>
</body>
</html>`;

const zh: TranslationDict = {
  common: {
    refresh: "刷新",
    close: "关闭",
    unknownError: "未知错误",
  },
  sidebar: {
    searchSessions: "搜索会话",
    newChat: "新建对话",
    switchToLightTheme: "切换到亮色主题",
    switchToDarkTheme: "切换到暗色主题",
    settings: "设置",
    mockSessions: [
      { id: "1", title: "重构 Git 状态解析逻辑", time: "10:24" },
      { id: "2", title: "为什么 useEffect 触发了两次", time: "昨天" },
      { id: "3", title: "解释 git2 的 revwalk 排序", time: "昨天" },
      { id: "4", title: "生成提交信息文案", time: "周二" },
      { id: "5", title: "Tailwind v4 主题变量迁移", time: "上周" },
    ],
    projects: "项目",
    addProject: "添加项目",
    noProjects: "还没有项目，点击上方 + 添加本地 Git 仓库",
    removeProject: "移除项目",
    confirmRemoveProject: (name) => `确定要移除项目「${name}」吗？（不会删除本地文件）`,
  },
  chat: {
    modelPreviewNote: "UI 预览 · 未接入真实模型",
    typing: "正在输入…",
    placeholder: "发消息给 AI…（Enter 发送，Shift+Enter 换行）",
    send: "发送",
    you: "我",
    initialMessages: [
      { id: "m1", role: "user", content: "这个应用现在能做什么？" },
      {
        id: "m2",
        role: "assistant",
        content:
          "右侧面板里有资源管理器和源代码管理，中间这里是对话区。你可以先在这里试着聊聊看。",
      },
    ],
    demoReply: "（示例回复，尚未接入真实模型 —— 当前只搭建了问答区的界面壳子）",
    artifactReply: "已经帮你创建了一个文件，点击下面的卡片查看内容（示例产物，尚未接入真实模型）。",
    demoArtifactName: "demo.md",
    demoArtifactContent: "# 示例产物\n\n这是一个示例文件，用来演示「产物」功能：点击这张卡片会在上方新增一个只读标签页显示这段内容。\n\n真实模型接入后，这里会换成模型实际创建/修改的文件。",
    demoHtmlArtifactName: "minesweeper.html",
    demoHtmlArtifactContent: DEMO_MINESWEEPER_HTML,
    demoTextArtifactName: "notes.txt",
    demoTextArtifactContent: "这是一个纯文本示例产物，用来验证非 HTML/Markdown 的产物仍然走原来的纯文本标签页，而不是浏览器渲染。\n\n真实模型接入后，这里会是模型实际创建的代码/文本文件内容。",
    viewArtifact: "点击查看",
  },
  tabs: {
    chat: "对话",
    explorer: "资源管理器",
    sourceControl: "源代码管理",
    files: "文件",
    terminal: "终端",
    browser: "浏览器",
    artifacts: "产物",
    comingSoon: "即将支持",
  },
  detailPanel: {
    resizePanel: "调整右侧面板宽度",
  },
  browser: {
    addressPlaceholder: "输入项目内文件路径或 https:// 网址…",
    loading: "加载中…",
    loadFailed: "加载失败",
    empty: "没有可显示的内容",
    notConnected: "无法连接本地文件系统。当前处于浏览器预览模式，请在 Tauri 应用窗口中打开以浏览项目文件。",
    crossOriginNotice: "部分网站会拒绝被嵌入显示（浏览器的 X-Frame-Options/CSP 限制），这种情况无法绕过。",
    popOut: "在中间区域打开",
  },
  artifacts: {
    empty: "对话里创建产物后会显示在这里",
  },
};

const en: TranslationDict = {
  common: {
    refresh: "Refresh",
    close: "Close",
    unknownError: "Unknown error",
  },
  sidebar: {
    searchSessions: "Search sessions",
    newChat: "New Chat",
    switchToLightTheme: "Switch to light theme",
    switchToDarkTheme: "Switch to dark theme",
    settings: "Settings",
    mockSessions: [
      { id: "1", title: "Refactor Git status parsing logic", time: "10:24" },
      { id: "2", title: "Why does useEffect fire twice", time: "Yesterday" },
      { id: "3", title: "Explain git2's revwalk ordering", time: "Yesterday" },
      { id: "4", title: "Generate commit message copy", time: "Tue" },
      { id: "5", title: "Tailwind v4 theme variable migration", time: "Last week" },
    ],
    projects: "Projects",
    addProject: "Add Project",
    noProjects: "No projects yet — click + above to add a local Git repository",
    removeProject: "Remove project",
    confirmRemoveProject: (name) => `Remove project "${name}"? (local files are untouched)`,
  },
  chat: {
    modelPreviewNote: "UI preview · not connected to a real model",
    typing: "Typing…",
    placeholder: "Message AI… (Enter to send, Shift+Enter for newline)",
    send: "Send",
    you: "Me",
    initialMessages: [
      { id: "m1", role: "user", content: "What can this app do right now?" },
      {
        id: "m2",
        role: "assistant",
        content:
          "The right panel has an Explorer and Source Control, and this middle area is the chat. Try chatting here first.",
      },
    ],
    demoReply: "(Sample reply — no real model is connected yet, this is just the UI shell for the chat area)",
    artifactReply: "I've created a file for you — click the card below to view it (sample artifact, no real model connected yet).",
    demoArtifactName: "demo.md",
    demoArtifactContent: "# Sample artifact\n\nThis is a sample file demonstrating the artifact feature: clicking this card opens a new read-only tab above showing this content.\n\nOnce a real model is connected, this will be whatever file the model actually created or edited.",
    demoHtmlArtifactName: "minesweeper.html",
    demoHtmlArtifactContent: DEMO_MINESWEEPER_HTML,
    demoTextArtifactName: "notes.txt",
    demoTextArtifactContent: "This is a plain-text sample artifact, used to verify that non-HTML/Markdown artifacts still open the original plain-text tab instead of the browser renderer.\n\nOnce a real model is connected, this will be whatever code/text file the model actually created.",
    viewArtifact: "Click to view",
  },
  tabs: {
    chat: "Chat",
    explorer: "Explorer",
    sourceControl: "Source Control",
    files: "Files",
    terminal: "Terminal",
    browser: "Browser",
    artifacts: "Artifacts",
    comingSoon: "Coming soon",
  },
  detailPanel: {
    resizePanel: "Resize right panel",
  },
  browser: {
    addressPlaceholder: "Enter a project file path or an https:// URL…",
    loading: "Loading…",
    loadFailed: "Failed to load",
    empty: "Nothing to display",
    notConnected: "Cannot connect to the local file system. Currently in browser preview mode — open this app inside the Tauri window to browse project files.",
    crossOriginNotice: "Some sites refuse to be embedded (browser X-Frame-Options/CSP restrictions) — this can't be worked around.",
    popOut: "Open in the main area",
  },
  artifacts: {
    empty: "Artifacts created in the chat will show up here",
  },
};

export const translations: Record<Language, TranslationDict> = { zh, en };
