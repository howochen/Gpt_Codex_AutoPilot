# 系統架構與安全規格

## 主要模組
- `ui/`: 四按鈕（測試連線、執行、自動執行、停止自動）與次數輸入、狀態/歷史/設定頁
- `core/runner.ts`: 事件驅動狀態機，不依賴 Electron
- `core/taskQueue.ts`: task_id 去重、批准狀態與持續化
- `adapters/taskProviders/`: localJson, githubIssue, chatgptBrowserExperimental
- `core/connectionProbe.ts`: **獨立於 runner** 的 read-only 預檢；可選對話往返探測，必須有明確授權且不可觸發 Codex 執行
- `adapters/chatgptBrowserProbe.ts`: 固定原始聊天網址、帳號／頁面檢查、probe_id 及回覆驗證；若不受支援則回報阻礙，不繞過
- `adapters/codex.ts`: `codex exec --json` 安全呼叫、JSONL parser、output schema、timeout、process tree 停止
- `adapters/git.ts`: status, fetch, checkout branch, commit, push; 不使用 shell string
- `adapters/tests.ts`: only pre-approved test commands from settings (no remote task-defined arbitrary shell commands)
- `adapters/github.ts`: `gh` issue/PR report；身份驗證由 `gh auth` 提供
- `storage/`: SQLite journal + JSON 結果摘要；Log 脫敏
- `security/`: scope guard、git diff checker、secret scan、approval gate
- `tests/`: runner 模擬器 + adapter fake fixtures + GUI smoke tests

## 開發要求
- GitHub 任務內容和 ChatGPT 回覆都是不可信輸入。JSON 工作單不能任意新增測試命令或調整 sandbox 權限。
- Codex 限制為 workspace-write，只在專案工作目錄操作。檢查支援的 CLI flags，依實際版本調整，不硬編不存在的旗標。
- 單一 active runner，同時按下兩個執行按鈕不可啟動雙執行緒。
- Git 分支命名防止路徑／指令注入，task_id 僅接受 `[A-Za-z0-9_-]`。
- 不自動在 `master` 上 commit，也不可使用 `git push --force`。
- 保護遊戲專案 `assets/` 及二進位檔。large assets 應另行檢查 Git LFS 設定，MVP 不自動修改美術檔。
- 使用者可以按一鍵複製錯誤摘要，但不必複製 Codex 完整日誌貼到 ChatGPT。
- 規劃「能力檢測」步驟：首次啟動確認 `node`, `git`, `gh`, `codex` 版本及權限。驗證環境後才顯示可執行。

## 成本控制
- `max_tasks_per_session=5` 預設；`max_codex_runs_per_task=1` 預設；`max_task_minutes=20` 預設可設；只允許任務相關檔案進 prompt。
- 避免每輪重新送全 GDD；從 `CODE_INDEX.md` 加 task scope 找所需文件。
- 只用腳本蒐集 git diff stat、test exit code、commit sha；不消耗額外 AI 產生機器資料。
- 每輪記錄 Codex 的可用 usage 指標（若 CLI 有提供），未提供則顯示「未知」，不要推估或宣稱零費用。

## 執行時可用的 CLI 形式（依安裝版本實測）
`codex exec --json --sandbox workspace-write -`（從 stdin 傳入限定任務 prompt，並將 JSONL 串流保存）

環境相容性、系統授權、CLI 與 Playwright 可行性，需要以真實 Windows 環境驗證。
