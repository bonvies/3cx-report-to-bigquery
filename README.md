# 3CX Report to BigQuery

從 3CX X-API 抓報表資料，寫進 BigQuery。設計成 Cloud Run Job：跑一次、做完就結束，靠環境變數決定要跑哪個 report、要抓多長的時間區間。

## 專案結構

```
src/
  config.ts                    讀環境變數、組出全域設定物件
  index.ts                     進入點：算時間區間 → 依 REPORT_TYPE 分派 → fetch + insert
  services/
    bigquery.ts                寫入 BigQuery
    api/
      connectToken.ts          跟 3CX 要 OAuth token（cache + 自動 refresh），提供已掛 Authorization 的 axios instance
      getQueueCallbacks.ts     打 ReportQueueCallbacks/Pbx.GetQueueCallbacksData
  util/
    getSyncWindow.ts           算 periodFrom/periodTo 時間區間（PERIOD_PRESET 快速選項或自訂 backfill 區間）
    describeError.ts           把 axios 錯誤轉成好讀的字串
```

## 環境變數

複製 `.env.example` 成 `.env` 並填值：

| 變數 | 說明 |
| --- | --- |
| `REPORT_TYPE` | 要跑哪個 report，對應 `src/index.ts` 裡的 `switch`，**必填、沒有預設值**。同時也直接當作要寫入的 BigQuery table 名稱（見下） |
| `BASE_URL_3CX` | 3CX PBX 網址，例如 `https://yourpbx.3cx.tw` |
| `CLIENT_ID_3CX` / `CLIENT_SECRET_3CX` | 3CX X-API 的 client credentials |
| `BQ_PROJECT_ID` / `BQ_DATASET` | 要寫入的 BigQuery 專案／dataset |
| `GOOGLE_APPLICATION_CREDENTIALS` | BigQuery 認證用的服務帳戶金鑰路徑，選填。留空則走 ADC 後援機制（本機用 `gcloud auth application-default login` 登入的個人帳號，部署到 GCP 服務上則用該服務綁定的身分） |
| `PERIOD_PRESET` | 同步區間，比照 3CX 網頁報表的快速選項：`custom` \| `thisMinute` \| `lastMinute` \| `last5Minutes` \| `last10Minutes` \| `last15Minutes` \| `lastHalfHour` \| `thisHour` \| `lastHour` \| `today` \| `yesterday` \| `last7Days` \| `lastWeek` \| `last30Days` \| `thisMonth` \| `lastMonth` \| `thisYear` \| `lastYear`，**必填、沒有預設值** |
| `PERIOD_FROM` / `PERIOD_TO` | 自訂 backfill 區間（ISO 8601），只有 `PERIOD_PRESET=custom` 時才會讀取，兩個都要填 |

> BigQuery table 名稱不是獨立設定，直接沿用 `REPORT_TYPE` 的值（`config.ts` 裡 `bigquery.table = REPORT_TYPE`）。要跑哪個 report，就要先在 `BQ_DATASET` 裡手動建一張同名的 table，例如 `REPORT_TYPE=callLog` 就要有一張叫 `callLog` 的 table。
>
> 目前 3CX API 呼叫的 `queueDnStr` 固定帶 `null`（抓全部 queue），endpoint 路徑也是寫死在 `getQueueCallbacks.ts` 裡，這兩個都不會變動，所以沒有做成環境變數。

## 本機開發

```bash
npm install
npm run dev         # tsx 直接跑 src/index.ts，不需要先 build
npm run typecheck   # tsc --noEmit
npm run build        # tsc + tsc-alias，輸出到 dist/
npm start            # node dist/index.js（跑 build 出來的結果）
```

專案用 `@/*` 對應 `src/*` 這個 path alias（見 `tsconfig.json`）。`tsx` 開發時會自動吃 `tsconfig.json` 的 `paths`；正式 build 因為 `tsc` 不會重寫 alias，所以 `npm run build` 多跑一次 `tsc-alias` 把編譯後的 `@/...` import 轉回相對路徑，`dist/` 底下的 JS 才能直接被 Node 執行。

## 部署（Cloud Run Job）

這個專案設計成 Cloud Run Job（跑一次就結束），不是 HTTP service。同一個 image，靠不同的環境變數決定行為。

```bash
# 本機 build image、push 到 Artifact Registry
docker build -t <region>-docker.pkg.dev/<project>/<repo>/3cx-report-to-bigquery .
docker push <region>-docker.pkg.dev/<project>/<repo>/3cx-report-to-bigquery

# 建立 Job（CLIENT_SECRET_3CX 建議走 Secret Manager，不要用 --set-env-vars 明文帶）
gcloud run jobs create 3cx-sync \
  --image <region>-docker.pkg.dev/<project>/<repo>/3cx-report-to-bigquery \
  --region <region> \
  --set-env-vars=REPORT_TYPE=queueCallbacks,BASE_URL_3CX=...,CLIENT_ID_3CX=...,BQ_PROJECT_ID=...,BQ_DATASET=... \
  --set-secrets=CLIENT_SECRET_3CX=3cx-client-secret:latest \
  --service-account=<service-account>

# 手動跑一次
gcloud run jobs execute 3cx-sync --region <region>

# 覆蓋參數：改抓上個月
gcloud run jobs execute 3cx-sync --region <region> \
  --update-env-vars=PERIOD_PRESET=lastMonth

# 覆蓋參數：backfill 指定區間
gcloud run jobs execute 3cx-sync --region <region> \
  --update-env-vars=PERIOD_PRESET=custom,PERIOD_FROM=2026-01-01T00:00:00Z,PERIOD_TO=2026-01-31T23:59:59Z
```

排程用 Cloud Scheduler 打 Cloud Run Jobs Admin API 觸發 execute，不是打程式自己的 HTTP endpoint（這個專案沒有、也不需要 HTTP server）。

跑這個 Job 的 service account 需要 BigQuery 寫入權限（`roles/bigquery.dataEditor` + `roles/bigquery.jobUser`）；3CX 端的驗證是走 `CLIENT_ID_3CX`/`CLIENT_SECRET_3CX` 的 client credentials，跟 GCP IAM 無關。

### 注意事項

- 如果改用 `gcloud builds submit` 讓 Cloud Build 遠端建置（而不是本機 build+push），要確保有 `.gcloudignore`（已內建）— 否則整個原始碼資料夾會被上傳到 GCS，`.env` 裡的密碼可能外流。
- Mac（尤其 Apple Silicon）本機 build 出來的 image 預設是 arm64，push 到 Cloud Run（跑 amd64）前記得用 `docker buildx build --platform linux/amd64`。

## 新增 report 類型

1. 在 `src/services/api/` 底下新增對應的 fetch function（參考 `getQueueCallbacks.ts`）。
2. 在 `src/services/bigquery.ts` 或新的檔案裡加對應的 insert function。
3. 在 `src/index.ts` 的 `switch (config.reportType)` 多加一個 `case`。
4. 在 `BQ_DATASET` 裡手動建一張跟這個 `REPORT_TYPE` 值同名的 table。
5. 部署時用 `REPORT_TYPE=<新的值>` 觸發，同時決定要跑哪個 report 和寫進哪張 table。
