# 產品需求規格 PRD — Dev AutoPilot V1.1

## 1. 使用者旅程
1. 開啟 Windows 控制台。首次設定本地 Cocos 專案路徑、GitHub repo `howochen/BieLuanZha`、既有 ChatGPT 對話 URL（選填）、Codex CLI 路徑與安全參數。
2. 在「執行次數」輸入整數 N (1~100；預設 3)。
3. 按【執行】→ 依序執行最多 N 個**完整的任務循環**；若沒有經核准的下一份任務，停止並回報「等待任務」，不得無限重複上一個任務。
4. 按【自動執行】→ 持續取得下一個有效任務，在任務供應和資源允許下循環；須有強制的會話安全上限（預設 5 次、可在設定調整至最高 20 次）；達上限自動暫停，使用者可再按一次繼續。即使自動執行不受上方執行次數輸入限制，也不能真的無上限。
5. 按【停止自動】→ 設定 stopRequested；不再開始新任務，正在執行的 Codex 先完成當前安全步驟，允許使用者選擇另行強制中止。

## 2. 主畫面必備元件
- 標題「別亂炸！Dev AutoPilot」；連線狀態（ChatGPT / Codex / Git / GitHub）四指示。
- **執行次數數字輸入框**，在三按鈕**上方**，最小 1、最大 100、預設 3；非法值不得執行。
- 四個按鈕：**測試連線**（位於執行按鈕群之前；不啟動 Codex，不寫入 Git）、**執行**（恰好 N 次或提早停在異常／沒有任務）、**自動執行**（帶會話上限的連續循環）、**停止自動**。
- 當前任務 ID、任務標題、目標分支、當前步驟、完成次數 / 目標、執行時間、失敗摘要、最近 Git SHA。
- 展開式日誌、任務歷史、重試資訊、人工確認列；設定頁支援本機路徑與帳號狀態，不顯示任何 API Key 明文。
- UI 不能只模擬成功狀態：按鈕必須呼叫實際後端 runner，WebSocket / IPC 更新狀態；程式關閉重啟後能看到上次結果。

## 2A. 測試連線按鈕（獨立前置驗證）
- 按下後執行無副作用預檢：確認本機 repo 路徑、git/gh/codex 可用性與登入狀態、GitHub repo 可讀取；不提交、不推送、不呼叫 Codex 模型。
- 針對 ChatGPT 指定對話：先確認 URL 格式、瀏覽器登入、實際開啟 URL 與頁面可辨識；此階段標為「可開啟」而非「可雙向通訊」。
- 提供獨立可選的「發送測試訊息」步驟（需使用者首次明確核准）：送入具有隨機 `probe_id` 的 `AUTOPILOT_PING` 訊息，等待同一對話回覆 `AUTOPILOT_PONG` 並核對 ID。這一步會真的在對話留下訊息，須先告知使用者。
- 測試回覆必須採結構化格式且驗證完整與對應 ID；取得 PONG 只能證明本次讀寫成功，**不能證明全自動長期穩定、也不能代表可繼承 API 會話**。
- 分別顯示 `CHAT_URL_VALID`、`CHAT_OPENED`、`CHAT_AUTH_OK`、`CHAT_SEND_OK`、`CHAT_REPLY_MATCHED`、`GITHUB_READ_OK`、`CODEX_CLI_READY`；各項 `PASS/FAIL/SKIPPED/UNKNOWN` 加時間戳與錯誤資訊。
- 測試逾時、錯誤帳號、聊天網址漂移、重複訊息、驗證碼／安全要求時停止，不重送、不繞過。
- 產出 `reports/connection-test-latest.json`（本機檔案），不自動推送或上傳完整聊天內容。
- 詳細標準見 `docs/CONNECTION_TEST.md`。

## 3. 主流程（每輪）
`LOAD_TASK → VALIDATE → SYNC_REPO → CREATE_BRANCH → RUN_CODEX → RUN_TESTS → INSPECT_DIFF → COMMIT → PUSH_BRANCH → WRITE_REPORT → NEXT_TASK`。
- 任務來源優先順序：本機已核准工作單；已核准 GitHub Issue；可選瀏覽器對話連接器。
- Task 必須含唯一 task_id、版本、基準 commit、允許檔案範圍、禁止操作、驗收測試。
- 在 SYNC_REPO 前檢查 dirty working tree；若有未提交變更，必須暫停，不自動覆蓋。
- 執行 Git 操作只在 repo root + user-specified working directory；新分支 `autopilot/<task-id>-<short-sha>`。
- Codex 非互動執行，stderr/stdout 留在本機，最後結構化報告不得直接據此認定驗收通過。
- 由 runner 獨立執行允許的測試；超時停止。測試錯誤不執行下一輪，也不自動提交到 master。
- `INSPECT_DIFF` 檢查 path allowlist、檔案變更數量上限、Git secrets 掃描與必要使用者審批。
- 推送**新分支**，可自動建立 draft PR，但不自動合併。把 final result 寫入 `reports/LAST_RESULT.json` 及 GitHub Issue / PR comment（可設定）。
- 請注意，`reports/LAST_RESULT.json` 若要同步至 GitHub，須先寫檔再 commit。不得先 push 然後聲稱報告已上傳。

## 4. ChatGPT 既有對話連接器（實驗性）
- 明確設定並固定特定 chat URL、帳號標識與瀏覽器 profile；在送出前確認網址與登入帳號一致。
- 只在沒有待審核或待執行任務時，附上本輪結果摘要，請求輸出唯一 JSON 工作單。不可無限制送「繼續」。
- 需要回覆帶 `protocol_version`, `request_id`, `task_id`, `base_commit`；若解析不出唯一 JSON、欄位不全、回覆截斷、網址漂移、登入逾時、網站要求驗證，立即暫停並顯示提示。
- 只允許取得任務 JSON，不執行回覆內任意 shell 指令；需由 schema + 安全檢查轉換成固定的操作。
- 在等待回覆時使用有期限的狀態偵測和去重，不使用無期限 polling；若頁面自動化不可靠，改為 GitHub Issues / 本地任務的穩定管線。
- 禁止繞過驗證碼、登入挑戰與安全確認，亦不利用 session cookie / token 外洩的方式接管對話。
- ChatGPT 網頁連接器屬可選功能，若平台不支援／阻擋，自動停止並要求使用者切回受支援的模式。

## 5. 停止與恢復
- 正常停止：不啟動下一個任務；已完成的 git/測試日誌保留；停止旗標持久化。
- 強制中止：終止 Codex process tree，標記 `INTERRUPTED`、保留 working tree 待人工確認，禁止自動覆寫。
- App 重啟：從 SQLite 恢復最後狀態；若任務曾處於執行中，標記 `RECOVERY_REQUIRED`，不得直接重跑。
- 任務結果只有 `PASSED` 才算成功；Codex 宣稱「完成」但測試未跑，標記 `UNVERIFIED`。

## 6. 錯誤分類
`INVALID_TASK`, `GIT_DIRTY`, `AUTH_EXPIRED`, `CODEX_UNAVAILABLE`, `CODEX_FAILED`, `TEST_FAILED`, `DIFF_OUT_OF_SCOPE`, `GIT_CONFLICT`, `PUSH_FAILED`, `CHATGPT_UNAVAILABLE`, `STOP_REQUESTED`, `APPROVAL_REQUIRED`, `REVIEW_REQUIRED`。
每個錯誤有固定的下一步與提示；預設不自動重新啟動 Codex。允許同一任務最多重試 1 次（需明確原因與使用者啟用）。
