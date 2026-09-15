# Claude Code 划词编辑

文件页的“编辑 → 发送”通过 Tauri 后端启动已登录的 Claude Code，聊天页仍使用原有演示逻辑。

## 使用

1. 安装 Claude Code，在终端运行 `claude` 并完成登录，确认能够正常提问。
2. 启动桌面项目 `npm run tauri dev`。
3. 打开文件，选中文字，选择“编辑”，输入要求并发送。
4. 检查 diff；“编辑”恢复选区和输入，“拒绝”丢弃预览，“接受”校验原文后保存。

不需要在项目中填写 API Key。使用 Claude Code 当前用户配置及登录；模型未额外指定，跟随 CLI 默认配置。请求会使用对应账号的额度。

Windows 自动查找用户原生安装及 npm 安装的可执行文件，其他安装可设置 `CLAUDE_CODE_EXECUTABLE` 为实际可执行文件绝对路径（不要填带参数的命令或脚本）。

## 数据与隔离

- 输入通过 stdin 传递，包含路径、指令、选区及前后各最多 12,000 个 UTF-16 单元的上下文；不会自动发送其他文件。
- 输出使用 `--json-schema`，只接受成功结果中的 `structured_output.replacement` 字符串。空字符串代表删除；无效、失败、截断响应不会写文件。
- 每次请求独立进程，不继续历史会话、不保存会话，禁用内置工具、MCP、技能和 hooks。使用临时目录，不加载项目配置。
- 后端阻塞工作在独立线程池运行，不阻塞其他文件请求。超时为 180 秒。
- 关闭文件会忽略旧响应；当前没有用户取消按钮，已经启动的进程会运行至完成或超时。
- 替换内容换行符跟随文件；不 trim 缩进或结尾空白。
- diff 目前仍使用完整 Monaco DiffEditor，局部 diff 性能优化尚未实施。

## 验证

`cargo test --manifest-path src-tauri/Cargo.toml ai::tests` 验证错误、缺失字段、删除及空白保留。

`cargo test --manifest-path src-tauri/Cargo.toml ai::tests::live_selection_edit -- --ignored` 使用真实账号执行 hello → world 的小型验证，会调用模型。
