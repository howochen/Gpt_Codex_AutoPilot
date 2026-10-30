# 程式索引

- connection-tool/probe.mjs：固定唯讀 CLI 預檢、URL 驗證、假瀏覽器介面及一次性 probe/PONG 驗證、報告儲存。
- connection-tool/server.mjs：127.0.0.1:4319 本機 HTTP、來源檢查、單次執行鎖，正式瀏覽器停用。
- connection-tool/public/：測試連線表單、結果列表、複製 JSON。
- connection-tool/test/：Node 內建假瀏覽器／CLI 與報告持久化測試。
- docs/CONNECTION_TEST.md：V1.1 診斷規格；docs/ACCEPTANCE.md：分期驗收。

啟動：`node connection-tool/server.mjs`；瀏覽 http://127.0.0.1:4319。
驗證：`node --test connection-tool/test/probe.test.mjs`。
