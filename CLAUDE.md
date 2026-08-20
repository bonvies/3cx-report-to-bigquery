# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev         # tsx runs src/index.ts directly, reads .env, no build needed
npm run typecheck   # tsc --noEmit
npm run build        # tsc + tsc-alias (rewrites @/* imports to relative paths for dist/)
npm start            # node dist/index.js (runs the build output)
```

There is no test suite and no lint script. `npm run dev` against a real `.env` (3CX credentials + a target BigQuery table) is the only way to exercise a report end-to-end; see "Adding a new report" below for the fetch-before-write-test discipline this repo relies on instead of automated tests.

## Architecture

This is a one-shot Cloud Run Job, not a server: `src/index.ts` runs `main()` once, dispatches on `REPORT_TYPE` (an env var), fetches from the 3CX X-API, writes to BigQuery, and exits. Cloud Scheduler triggers repeated executions on a cron per report (see `logs/CLOUD_SCHEDULER_SETUP.md`); there is no HTTP server or polling loop in the code itself.

**Request flow for every report:** `index.ts` computes a `{periodFrom, periodTo}` window via `src/util/getSyncWindow.ts` (from `PERIOD_PRESET`, e.g. `lastHour`/`yesterday`/`today`), calls the report's `get<ReportName>()` function in `src/services/api/`, then passes the records to `insertRecords()` in `src/services/bigquery.ts`.

**`REPORT_TYPE` is also the BigQuery table name** (`config.ts`: `bigquery.table = REPORT_TYPE`, no separate table-name setting) — the value must exactly match an existing table in `BQ_DATASET`.

### Adding a new report

1. Add `src/services/api/get<ReportName>.ts` — pattern: a `path()` function builds the OData function-call URL, `axios3CXInstance` (from `connectToken.ts`, handles OAuth token caching/refresh) does the GET, paginate with `$top`/`$skip` until a page comes back short.
2. Add the response shape to `src/types/apiType.ts` as soon as you have one real sample — don't use `{ [key: string]: unknown }` placeholders. **3CX omits a key entirely when its value is null/zero, rather than sending `null`** — mark those fields optional (`?:`), not `| null`. This has bitten several reports (see the type comments in `apiType.ts` for which fields are affected).
3. Add a `case` in the `switch` in `src/index.ts`.
4. If the report has a real business timestamp field (e.g. `StartTime`, `CallTime`, `Day`, `DateTimeInterval`), add `<REPORT_TYPE>: '<fieldName>'` to `PARTITION_FIELD_BY_TABLE` in `bigquery.ts` — aggregate reports with no natural time field are partitioned on `PeriodFrom` instead and need no entry.
5. Create the BigQuery table (`bq mk --table`, DAY partitioning on whichever field from step 4) and write up the schema/sample-payload in `logs/BIGQUERY_SETUP.md` following the existing per-report sections there.
6. Update `logs/REPORTS_TODO.md`'s checklist.

### 3CX X-API quirks worth knowing before guessing at a new endpoint's parameters

- Some endpoints 404 if OData parameters aren't in the exact order the 3CX web dashboard sends them, even with all the right names/values — don't assume 404 means a wrong parameter name.
- `clientTimeZone` (where an endpoint takes it) is inconsistent: some endpoints need a UTC-offset string like `+08:00` and 404 on an IANA name like `Asia/Taipei`; others accept the IANA name fine. Verify per-endpoint, don't reuse a prior finding.
- A department/queue-style filter param (`groupNumber`, `groupFilter`, as opposed to a Dn-style filter) passed as `''` for "all" can return `200` with an empty result set instead of erroring — silently wrong, not obviously broken. Confirm coverage with a known-real value before trusting an empty-looking result.
- `$metadata` (`GET {BASE_URL_3CX}/xapi/v1/$metadata`) is the source of truth for a function's real parameter names/order/types when there's no web dashboard screen to capture a request from.

### BigQuery write path (`src/services/bigquery.ts`)

- **Dedup is check-then-skip, not upsert**: before inserting, it queries whether a row with the exact same `PeriodFrom`/`PeriodTo` already exists for that table; if so, the whole batch is skipped rather than inserted or merged. A period is captured on its first successful run only — there's no "in-progress period gets progressively completed" behavior, so the Cloud Scheduler cron frequency for a report must line up with its `PERIOD_PRESET` granularity (see `getSyncWindow.ts`'s comments and `logs/CLOUD_SCHEDULER_SETUP.md`) or windows get silently skipped or missed.
- **`tabledata.insertAll` has a 10MB per-request payload limit** — a report with a large per-call row count (e.g. `callLog` with `PERIOD_PRESET=today`) can exceed it in one call. This repo's fix is choosing a small enough `PERIOD_PRESET` per report rather than batching the insert in code.
- Every inserted row gets `PeriodFrom`/`PeriodTo` stamped on by `insertRecords()` regardless of whether the report's own payload has a time field — this is also what the dedup check keys on.

### Where the operational history lives

`logs/` (gitignored, local-only) has the working notes this repo has accumulated per report — read the relevant file before assuming something is unverified or undocumented:
- `REPORTS_TODO.md` — per-report implementation/test status checklist
- `BIGQUERY_SETUP.md` — per-report schema, sample payload, and partitioning rationale
- `CLOUD_SCHEDULER_SETUP.md` — the deployed Cloud Run Job + Cloud Scheduler setup, cadence table, and current rollout status
- `DEDUP_NOTES.md`, `BIGQUERY_PARTITIONING_NOTES.md`, `PROGRESS_LOG.md`, `DATA_CONNECTOR_NOTES.md` — design rationale and session-by-session history

## Deployment

Builds to a Docker image and runs as a Cloud Run Job (`Dockerfile`), one job per report, each with `REPORT_TYPE`/`PERIOD_PRESET` baked into `--set-env-vars` rather than passed as a per-execution override — see the README's "部署（Cloud Run Job）" section and `logs/CLOUD_SCHEDULER_SETUP.md` for the concrete `gcloud run jobs create` / `gcloud scheduler jobs create` commands and the current 18-job rollout.

Bash commands matching `git commit`, `bq mk`/`bq rm`, or destructive `gcloud ... delete`/`--force` calls are intercepted by a `PreToolUse` hook (`.claude/hooks/bash-guard.sh`) and require explicit confirmation — this project's convention is that the user runs those themselves; give the command rather than running it unprompted.
