#!/usr/bin/env bash
set -e

# Load NVM
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "=== Starting PressWire Services ==="

# 1. Start FastAPI backend in background
echo "-> Starting Backend on http://0.0.0.0:8000"
source backend/venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend &
BACKEND_PID=$!

# 2. Start Frontend dev server
echo "-> Starting Newsroom Desk Frontend on http://localhost:5173"
cd frontend
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
