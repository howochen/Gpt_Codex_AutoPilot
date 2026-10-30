# 問題與驗證

- OPEN：M1A 真實 ChatGPT 連接器缺少，無法驗證登入、目標對話或雙向回覆。正式介面禁止啟用及發送。
- OPEN：未提供原始對話 URL、帳號及瀏覽器 profile。
- OPEN：環境未找到 gh；GitHub 登入／repo 讀取跳過。
- OPEN：Git 命令回報 cannot change to D:/CocosProject/GameBieLuanZha，無法取得工作目錄狀態；未更動 Git 設定。
- RESOLVED：報告測試使用系統暫存目錄時 rename 被環境拒絕；改在 workspace 建立並清理測試暫存目錄。
- 2026-10-19：`node --test connection-tool/test/probe.test.mjs`：15/15 通過。涵蓋錯誤 ID、截斷、重複、逾時、重導、錯誤帳號、登出、CAPTCHA、發送失敗、停用／未授權及持久化。
- 本機唯讀 probe：FAIL；git_cli / codex_cli / codex_auth PASS，gh_cli / git_repo / chat_url FAIL，其餘相關檢查 SKIPPED。
- 瀏覽器視覺操作與真實 ChatGPT 端對端未測試；不宣稱成功。
