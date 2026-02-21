#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════╗"
echo "║        Flora AR Prototype        ║"
echo "╚══════════════════════════════════╝"
echo ""

# Backend
echo "▶ Starting backend on http://localhost:8000"
cd "$(dirname "$0")/backend"

if [ ! -f .env ]; then
  echo "  ⚠ No .env found — copying .env.example (fill in your API keys)"
  cp .env.example .env
fi

uv sync -q

uv run uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

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
cd "$(dirname "$0")/frontend/v0"

if [ ! -d node_modules ]; then
  echo "  Installing dependencies..."
  pnpm install
fi

pnpm dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "✓ Both processes running"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
