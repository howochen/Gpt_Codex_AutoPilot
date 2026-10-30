# 直接貼給 Codex 的第一輪指令

請依據此規格包，開發一套可安裝在 Windows 10/11 的《別亂炸！Dev AutoPilot》本機控制台，負責 ChatGPT 工作單、Codex CLI、Cocos Creator 遊戲專案與 GitHub 的自動交接。

**先閱讀** README.md、AGENTS.md、docs/PRODUCT_SPEC.md、docs/ARCHITECTURE.md、docs/ACCEPTANCE.md、schemas/ 下的資料契約。

**本輪只實作 M0 + M1**：建立可運作的程式架構、GUI、執行次數輸入欄位、【執行】【自動執行】【停止自動】三個按鈕、可測試的任務狀態機、假 Codex／假 Git／假 ChatGPT 接口、持久化執行紀錄。按鈕要真實驅動本機模擬任務 runner，而不是只有 UI 切換文字。

不要在這一輪呼叫付費 Codex 任務來反覆測試自動化，不要直接修改《別亂炸！》遊戲的 master 分支，不要執行 Git push，不要嘗試自動操控 ChatGPT 網頁。

跑完測試後，提供啟動方式、測試結果、檔案變更，以及 M2 的剩餘工作。M0 + M1 驗收合格後，再進入 M2～M5。每個階段都必須通過文件規定的測試，不要把瀏覽器交接能力標記為已完成，除非實際端對端成功。


## V1.1 追加優先要求
實作【測試連線】按鈕，先完成 `docs/CONNECTION_TEST.md` 的本機與假瀏覽器測試，不得直接把網頁開啟視為可雙向通訊。可選測試訊息必須事前取得使用者核准，並且絕不呼叫 Codex 模型或 Git 寫入。
