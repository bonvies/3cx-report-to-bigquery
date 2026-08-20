#!/bin/bash
# PreToolUse guard on Bash: 攔截這個專案裡明確約定「要留給使用者自己執行」或風險較高的指令。
# git commit / bq mk / bq rm：使用者這幾天明確要求只給指令、不要自動執行。
# gcloud ... delete / --force：破壞性操作，create 類指令不受影響，直接放行。
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // ""')

reason=""
if echo "$cmd" | grep -qE '(^|[;&|]) *git +commit\b'; then
  reason="git commit — 依照這個專案的慣例，commit 留給使用者自己執行，只能給指令不能自動跑。"
elif echo "$cmd" | grep -qE '\bbq +(mk|rm)\b'; then
  reason="bq mk/rm — 依照這個專案的慣例，BigQuery 資源建立/刪除留給使用者自己執行，只能給指令不能自動跑。"
elif echo "$cmd" | grep -qE '\bgcloud\b.*\bdelete\b'; then
  reason="gcloud ... delete — 刪除類操作風險較高，需要使用者明確確認才能執行。"
elif echo "$cmd" | grep -qE '\bgcloud\b.*--force\b'; then
  reason="gcloud ... --force — 帶有跳過確認的破壞性旗標，需要使用者明確確認才能執行。"
fi

if [ -n "$reason" ]; then
  jq -n --arg reason "$reason" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: $reason}}'
fi
