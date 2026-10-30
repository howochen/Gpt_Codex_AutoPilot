# 測試連線與專屬 ChatGPT 對話：工程規格 V1.1

## 本輪實作狀態
- 已實作獨立本機測試按鈕、CLI 唯讀預檢、結果顯示及本機 JSON 報告。
- 正式 EXPERIMENTAL 瀏覽器連接器尚未實作，ChatOpen / ChatRoundtrip 必須跳過；不得以假瀏覽器通過替代端對端驗收。
- 往返訊息標記以本文件的 `AUTOPILOT_CONNECTION_TEST` 為準；產品規格中的 `AUTOPILOT_PING` 為舊名稱。
- 每次發送需獨立授權；逾時後不重送。正式 UI 在連接器完成前不提供發送功能。
- 本輪僅處理 M1A；未完成必要真實驗收前不啟動後續自動開發。

## 使用情境
使用者按下【測試連線】，希望在不產生 Codex 模型執行、不修改 Git 的前提下，知道應用程式能否使用同一個 ChatGPT 對話，以及本機 Codex CLI 與 GitHub 是否已備妥。

## 前提與限制
- 可保留此聊天為《別亂炸！》專屬規劃對話，也可手動新建另一個專屬對話；此選擇並不提供 API 自動接入能力。
- 使用者必須提供在已登入瀏覽器地址欄取得的**原始對話 URL**，不可用 `https://chatgpt.com/share/...` 共享快照作為可寫入連接。
- 分享連結可能只是快照或另開分支，不能保證讀取最新訊息、繼續原對話。不可把使用者的私人遊戲企劃公開分享，只為取得 URL。
- ChatGPT 原生網頁不是穩定的受支援訊息交換 API；UI 自動化是實驗性功能。若平台不允許或失效，立即停用該功能。

## 按鈕及測試階段
1. `Preflight`: 驗證路徑、執行環境、讀取 GitHub repo，檢查是否有可執行的 `git`, `gh`, `codex`，不呼叫 AI。
2. `ChatOpen`: 在使用者授權的瀏覽器 profile 開啟原始聊天 URL；校驗網域、最終 URL 和登入狀態；狀態 `OPENED` 不等於往返成功。
3. `ChatRoundtrip`：**可選且需額外同意**。產生 `probe_id` (UUID)，在同一對話送出下列測試訊息，僅等待一次回覆並檢查 ID、完整性和時間戳；嚴禁盲目重送。

範例訊息（只用於連線診斷，不觸發開發任務）：

```text
AUTOPILOT_CONNECTION_TEST
請只回覆單一 JSON：{"type":"AUTOPILOT_PONG","probe_id":"<本次生成UUID>","status":"ok"}
這是連線測試，請勿執行任何開發任務。
```

4. `Report`: 本機寫出 `reports/connection-test-latest.json`，含各步驟耗時、結果、非敏感錯誤摘要；可一鍵複製到剪貼簿。不 commit、不 push，不讀取或儲存 ChatGPT session cookie、密碼或整段聊天紀錄。

## 報告 schema 要求
```json
{
  "schema_version": "1.0",
  "tested_at": "2026-10-19T00:00:00Z",
  "chat_url_type": "original_conversation",
  "checks": {
    "git_cli": "PASS",
    "gh_cli": "PASS",
    "codex_cli": "PASS",
    "github_read": "PASS",
    "chat_url": "PASS",
    "chat_open": "PASS",
    "chat_auth": "PASS",
    "chat_send": "SKIPPED",
    "chat_reply_match": "SKIPPED"
  },
  "roundtrip_tested": false,
  "overall": "PARTIAL",
  "errors": []
}
```
上述值只示範資料欄位，不代表實測通過。

## 結論判定
- `PASS`: 指定 ChatGPT 原始對話的一次發送與回覆驗證成功，且其餘必要連線與環境檢查通過。
- `PARTIAL`: 預檢成功，但未實際進行雙向測試，或僅驗證 GitHub、Codex 的部分能力。
- `FAIL`: 任一必要檢查失敗、逾時、無法識別帳號、對話異常、回覆格式不正確。
- 即使 `PASS`，仍不得聲稱 UI 通道有官方長期可靠性或允許無人值守；正式自動模式還需獨立整合測試及人工核准的安全限制。

## 測試項目
- 假瀏覽器：已登入、未登入、原始 URL、不合法域名、share 快照、URL 重導、網站版型變更。
- 回覆：有效 PONG、錯誤 UUID、回覆截斷、重複 PONG、逾時、訊息送出但沒有回覆。
- 安全：確認任何 FAIL 均不呼叫 codex exec、不提交或推送、不自動重試傳訊、不繞過 CAPTCHA。
