import {
  Database, File, FileArchive, FileAxis3D, FileBox, FileBraces, FileChartColumn,
  FileCode, FileCog, FileDiff, FileImage, FileJson, FileKey, FileLock, FileMusic,
  FileSliders, FileSpreadsheet, FileTerminal, FileText, FileType, FileVideo,
  type LucideIcon,
} from "lucide-react";

const byName: Record<string, LucideIcon> = {};

function names(icon: LucideIcon, values: string[]) {
  values.forEach((value) => { byName[value] = icon; });
}

names(FileSliders, [".babelrc", ".dockerignore", ".editorconfig", ".eslintrc", ".eslintrc.cjs", ".eslintrc.js", ".eslintrc.yaml", ".eslintrc.yml", ".gitattributes", ".gitignore", ".npmrc", ".prettierrc", ".prettierrc.yaml", ".prettierrc.yml", "components.json", "postcss.config.cjs", "postcss.config.js", "postcss.config.mjs", "postcss.config.ts", "tailwind.config.cjs", "tailwind.config.js", "tailwind.config.mjs", "tailwind.config.ts", "tsconfig.json", "vite.config.js", "vite.config.mjs", "vite.config.ts", "vitest.config.js", "vitest.config.mjs", "vitest.config.ts"]);
names(FileJson, [".eslintrc.json", ".prettierrc.json"]);
names(FileText, ["agents.md", "authors", "changelog", "changelog.md", "contributing", "contributing.md", "readme", "readme.md", "todo"]);
names(FileBox, ["bun.lock", "bun.lockb", "cargo.lock", "cargo.toml", "composer.json", "composer.lock", "gemfile", "go.mod", "go.sum", "package-lock.json", "package.json", "pipfile", "pnpm-lock.yaml", "pnpm-workspace.yaml", "poetry.lock", "pom.xml", "pyproject.toml", "requirements-dev.txt", "requirements.txt", "yarn.lock"]);
names(FileCog, ["cmakelists.txt", "dockerfile", "meson.build", "settings.gradle", "settings.gradle.kts"]);
names(FileKey, ["codeowners", "copying", "license", "notice"]);
names(FileLock, ["security", "security.md"]);
names(FileTerminal, ["makefile"]);

const byExtension: Record<string, LucideIcon> = {};
function extensions(icon: LucideIcon, values: string) {
  values.split(" ").forEach((value) => { byExtension[value] = icon; });
}

extensions(FileArchive, "7z br bz2 dmg gz iso rar tar tar.bz2 tar.gz tar.xz tbz2 tgz txz xz zip");
extensions(FileMusic, "aac flac m4a mp3 ogg opus wav");
extensions(FileText, "adoc doc docx log md mdx pdf rst rtf tex txt");
extensions(FileImage, "ai avif bmp eps gif heic ico jpeg jpg png psd svg tif tiff webp");
extensions(FileKey, "asc cer crt gpg key pem pub");
extensions(FileCode, "astro c cc cjs clj cpp cs cts cxx dart erl ex exs fs fsx go h hpp hrl hs htm html java js jsx kt kts lua mjs mts nim php pl pm py r rb rs scala sol svelte swift ts tsx vb vue xhtml xml zig");
extensions(FileTerminal, "bash bat cmd fish nu ps1 sh zsh");
extensions(FileAxis3D, "blend fbx glb gltf obj stl");
extensions(FileType, "css eot less otf sass scss ttf woff woff2");
extensions(FileSpreadsheet, "csv ods tsv xls xlsx");
extensions(Database, "db duckdb prisma sql sqlite sqlite3");
extensions(FileDiff, "diff patch");
extensions(FileVideo, "avi m4v mkv mov mp4 mpeg mpg webm");
extensions(FileSliders, "cfg conf hcl ini properties tf tfvars toml yaml yml");
extensions(FileChartColumn, "ipynb mmd ppt pptx");
extensions(FileJson, "json json5 jsonc");
extensions(FileBraces, "gql graphql proto");
extensions(FileCog, "gradle");
extensions(FileLock, "lock p12 pfx");

const compoundExtensions = ["tar.bz2", "tar.gz", "tar.xz"];

export function getFileTypeIcon(path: string | null | undefined): LucideIcon {
  const filename = (path ?? "").split(/[\\/]/).pop() ?? "";
  if (!filename) return File;
  const lowerName = filename.toLowerCase();
  if (byName[lowerName]) return byName[lowerName];
  if (lowerName === ".env" || lowerName.startsWith(".env.")) return FileLock;
  if (lowerName === "dockerfile" || lowerName.startsWith("dockerfile.")) return FileCog;
  if (lowerName === "makefile" || lowerName.startsWith("makefile.")) return FileTerminal;
  const compound = compoundExtensions.find((extension) => lowerName.endsWith(`.${extension}`));
  const dot = lowerName.lastIndexOf(".");
  const extension = compound ?? (dot > 0 && dot < lowerName.length - 1 ? lowerName.slice(dot + 1) : "");
  return byExtension[extension] ?? File;
}
