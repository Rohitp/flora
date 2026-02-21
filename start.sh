#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════╗"
echo "║        Flora AR Prototype        ║"
echo "╚══════════════════════════════════╝"
echo ""

# Backend
echo "▶ Starting backend on http://localhost:8000"
cd "$ROOT/backend"

if [ ! -f .env ]; then
  echo "  ⚠ No .env found — copying .env.example (fill in your API keys)"
  cp .env.example .env
fi

uv sync -q

mkdir -p "$ROOT/logs"
BACKEND_LOG="$ROOT/logs/backend.log"
FRONTEND_LOG="$ROOT/logs/frontend.log"

uv run uvicorn main:app --reload --port 8000 2>&1 | tee "$BACKEND_LOG" &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID  →  tail -f logs/backend.log"

# Wait for backend to be ready
echo "  Waiting for backend..."
for i in {1..20}; do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✓ Backend ready"
    break
  fi
  sleep 1
done

# Frontend
echo ""
echo "▶ Starting frontend on http://localhost:3000"
cd "$ROOT/frontend/v0"

if [ ! -d node_modules ]; then
  echo "  Installing dependencies..."
  pnpm install
fi

pnpm dev 2>&1 | tee "$FRONTEND_LOG" &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID  →  tail -f logs/frontend.log"

echo ""
echo "✓ Both processes running"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "  Logs: tail -f logs/backend.log"
echo "        tail -f logs/frontend.log"
echo ""
echo "Press Ctrl+C to stop both"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
