#!/usr/bin/env bash
# Stop hook: Claude may not end a turn while `npm run verify` fails.
# Skips when nothing changed since the last clean run (tree hash cached in .claude/.verified).
cd "$CLAUDE_PROJECT_DIR" || exit 0
state=$( { git rev-parse HEAD; git status --porcelain; git diff; } 2>/dev/null | sha1sum | cut -d' ' -f1 )
[ -f .claude/.verified ] && [ "$(cat .claude/.verified)" = "$state" ] && exit 0
out=$(npm run verify 2>&1)
if [ $? -ne 0 ]; then
  echo "npm run verify failed — fix every failure before stopping:" >&2
  echo "$out" | grep -iE "fail|error|✗|offend|expected" | head -60 >&2
  exit 2
fi
echo "$state" > .claude/.verified
exit 0
