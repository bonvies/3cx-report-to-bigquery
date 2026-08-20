#!/bin/bash
# PreToolUse on Edit/Write: .env 裡有真實的 3CX client secret，編輯前提示要求確認。
# .env.example 只是範本，沒有真實密鑰，不擋。
input=$(cat)
file=$(echo "$input" | jq -r '.tool_input.file_path // ""')

case "$file" in
  *.env.example) ;;
  */.env|*.env)
    jq -n '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: ".env 裡有真實的 3CX client secret，編輯前請再次確認使用者當下明確要求這麼做。"}}'
    ;;
esac
