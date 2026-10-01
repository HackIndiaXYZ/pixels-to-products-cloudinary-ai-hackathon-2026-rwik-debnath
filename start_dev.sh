#!/usr/bin/env bash
set -e

# Load NVM if present
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh"

echo "=== Starting PressWire Services ==="

# Initialize .env if missing
if [ ! -f .env ] && [ -f .env.example ]; then
    echo "-> Creating .env from .env.example"
    cp .env.example .env
fi

# Detect virtual environment activation script (Unix vs Windows Git Bash)
if [ -f "backend/venv/bin/activate" ]; then
    source backend/venv/bin/activate
elif [ -f "backend/venv/Scripts/activate" ]; then
    source backend/venv/Scripts/activate
elif [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
else
    echo "Warning: No virtual environment found in backend/venv or .venv."
    echo "Run: python -m venv backend/venv && backend/venv/Scripts/pip install -r backend/requirements.txt"
fi

# 1. Start FastAPI backend in background
echo "-> Starting Backend on http://127.0.0.1:8000"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --app-dir backend &
BACKEND_PID=$!

# 2. Start Frontend dev server
echo "-> Starting Newsroom Desk Frontend on http://localhost:5173"
cd frontend
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
