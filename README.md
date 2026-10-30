# BieLuanZha Dev AutoPilot — Codex 實作交付包

版本：1.1 (2026-10-19)｜類型：Windows 本機開發工具｜目標專案：`howochen/BieLuanZha`，目前使用 `master` 分支。

## 目標
目前實作狀態：V1.1 M1A 部分完成，尚未通過真實 ChatGPT 雙向驗收。執行 `node connection-tool/server.mjs` 後開啟 `http://127.0.0.1:4319` 使用【測試連線】。不需安裝依賴；目前是 Node.js 本機 Web 介面，尚非 Windows 桌面安裝程式。狀態與限制見 `PROJECT_STATUS.md`、`BUG_TRACKER.md`。

建立一款 **獨立於 Cocos 遊戲專案** 的 Windows 本機控制台，協助使用者以最低合理 Codex 使用量，將 ChatGPT 核准的任務交給本機 Codex，執行測試，提交 Git 開發分支，並交換報告。介面包含**執行次數**數值輸入、**測試連線**、**執行**、**自動執行**、**停止自動** 四個按鈕。

## 專屬對話綁定
可在 ChatGPT 中建立並保留一個《別亂炸！》專用對話，將登入後取得的原始對話 URL（`https://chatgpt.com/c/...` 等實際格式）填入工具設定。此對話 URL 只是瀏覽器導航定位，不是 API 授權，也不表示 ChatGPT 能向本機直接主動讀取。**不得以 `chatgpt.com/share/...` 共享快照取代原始可繼續對話網址**。

## 重要現實限制
- **ChatGPT 網頁對話不是正式工作佇列 API。** 沒有支援的公開介面可由本地程式直接呼叫當前指定聊天並繼承此對話推理上下文。網頁自動化屬實驗性連接器，不保證成功，且必須遵守平台允許的互動方式；不得繞過登入、驗證碼、反機器人機制或安全確認。
- **預設穩定管線**：任務 JSON / GitHub Issues → Codex CLI → 本機測試 → Git 分支 → 結果 JSON → GitHub。**實驗管線** 才啟用既有對話的瀏覽器互動。當 ChatGPT 網頁不可用時，不得憑空產生工作單、不得重複發文，也不得啟動新的 Codex 任務。
- 不承諾免付費或不消耗 ChatGPT / Codex 方案額度。所有使用量須按實際執行環境觀察。
- **不能替使用者自動核准危險操作**，例如金流、秘密金鑰、發布、推送至受保護主分支、刪除資料；遇到此類動作必須暫停。

## 開發前閱讀順序
1. `AGENTS.md` — 開發範圍與成本規範
2. `docs/CONNECTION_TEST.md` — 連線測試規格，優先實作且不觸發 Codex/ Git 寫入
3. `docs/PRODUCT_SPEC.md` — UI、狀態機、功能與錯誤處理
4. `docs/ARCHITECTURE.md` — 模組架構、進程與安全設計
5. `docs/ACCEPTANCE.md` — 分階段任務與驗收
6. `schemas/task.schema.json`、`schemas/result.schema.json` — 機器交接格式
7. `prompts/CODEX_START.md` — 第一輪執行提示詞

## 選用技術
- Windows 10/11，Node.js LTS + TypeScript
- 桌面介面：Electron（或 Tauri，若能以更小維護成本達到需求）
- 背景執行 Node child_process，stdout/stderr 串流；嚴格避免 command shell 注入
- `codex exec --json`，使用 stdin 輸入任務、輸出 JSONL 與最終 JSON 報告
- Git CLI（獨立分支）；GitHub CLI `gh` 以使用者登入身分取任務、更新 Issue 或 PR
- SQLite 作為執行狀態、重試計數、記錄的唯一真實來源；敏感資訊不寫入資料庫
- 可選 Playwright 做 **實驗性** 網頁連接器：獨立受控瀏覽器會話、明確選擇對話網址、不處理或擷取密碼、在網站阻止時立即中止

## MVP 成功定義
能在本機開啟 UI、設定執行次數 N、執行恰好 N 個有效任務、展示狀態/日誌、在停止後不再啟動新任務、在測試失敗時暫停、推送獨立開發分支、建立可供 ChatGPT 讀取的報告。瀏覽器自動送訊息是單獨的實驗性驗收項，不可拿它阻礙穩定核心交付。
