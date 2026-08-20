#!/bin/bash
# PostToolUse on Edit/Write: 改完 .ts 檔自動跑 npm run typecheck，失敗時把錯誤回報給 Claude。
input=$(cat)
file=$(echo "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // ""')

case "$file" in
  *.ts)
    cd /Users/leo/Desktop/Program/Project/3cx-report-to-bigquery/code/3cx-report-to-bigquery || exit 0
    output=$(npm run typecheck 2>&1)
    status=$?
    if [ $status -ne 0 ]; then
      jq -n --arg reason "npm run typecheck 失敗：
$output" '{decision: "block", reason: $reason}'
    fi
    ;;
esac
