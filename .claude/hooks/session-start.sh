#!/bin/bash
# SessionStart hook: install dependencies so linting, typechecking and builds
# work immediately in Claude Code on the web sessions.
set -euo pipefail

# Only run in remote (web) sessions; local checkouts manage their own deps.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Root Next.js app. npm install (not ci) so the cached container layer is reused.
npm install --no-audit --no-fund

# The MCP server is a separate workspace package with its own lockfile.
if [ -d packages/mcp ]; then
  npm install --no-audit --no-fund --prefix packages/mcp
fi
