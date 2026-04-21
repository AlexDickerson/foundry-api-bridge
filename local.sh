#!/usr/bin/env bash
# Local Docker Desktop helper for foundry-api-bridge.
# See dev.sh for the remote-server-on-server.ad equivalent.
#
# Typical loop:
#   ./local.sh up            # first time or after Dockerfile changes
#   <edit src/>
#   ./local.sh rebuild       # npm build + container restart (seconds)
#   ./local.sh logs          # tail container logs
#   ./local.sh stop          # stop without removing data

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE="docker compose -f docker-compose.local.yml"
cd "$SCRIPT_DIR"

usage() {
  cat <<EOF
Usage: ./local.sh <command>

Commands:
  up         Build image, install deps, build dist, start container (first-time setup)
  start      Start the container without rebuilding the image
  stop       Stop the container (keeps data volume)
  down       Stop and remove the container (keeps data volume)
  nuke       Stop, remove, and delete the data volume (destroys the world)
  rebuild    Rebuild module dist locally and restart the container
  logs       Tail container logs
  shell      Open a bash shell in the running container
  status     Show container status
  ps         Compose status

First-time:
  1. Copy .env.example to .env and fill in FOUNDRY_USERNAME/PASSWORD
  2. ./local.sh up
  3. Open http://localhost:30000 — log in, create a world, install the
     foundry-api-bridge module from /data/Data/modules
EOF
  exit 1
}

build_local() {
  # npm's --silent suppresses errors too, which hides legitimate install
  # failures. Use --loglevel=warn: quiet during success, still surfaces
  # warnings/errors so VS Code task output is actionable on failure.
  echo "==> Installing deps..."
  npm install --loglevel=warn
  echo "==> Building module..."
  npx vite build 2>&1 | tail -3
  # Static assets not produced by vite
  cp -r dist/module.json dist/styles dist/templates dist/ 2>/dev/null || true
}

cmd_up() {
  if [ ! -f .env ]; then
    echo "ERROR: .env not found. Copy .env.example to .env and fill in credentials." >&2
    exit 1
  fi
  build_local
  echo "==> Starting container (building image if needed)..."
  $COMPOSE up -d --build
  sleep 3
  cmd_status
}

cmd_start() {
  $COMPOSE up -d
  sleep 2
  cmd_status
}

cmd_stop() {
  $COMPOSE stop
}

cmd_down() {
  $COMPOSE down
}

cmd_nuke() {
  read -r -p "Remove container AND delete data volume? This erases the Foundry world. [y/N] " ans
  case "$ans" in
    [yY]|[yY][eE][sS]) $COMPOSE down -v ;;
    *) echo "Aborted." ;;
  esac
}

cmd_rebuild() {
  build_local
  echo "==> Restarting container..."
  # `docker compose restart` no-ops silently if the container doesn't exist
  # (e.g. first run after nuke, or Docker Desktop was restarted and didn't
  # bring containers back up automatically). `up -d --no-recreate` creates
  # and starts if missing, no-ops if running, and won't recreate on config
  # drift. Then `restart` forces Foundry to reload the new dist
  # when the container was already up.
  $COMPOSE up -d --no-recreate
  $COMPOSE restart
  sleep 2
  cmd_status
}

cmd_logs() {
  $COMPOSE logs -f --tail=100
}

cmd_shell() {
  $COMPOSE exec foundry-local bash
}

cmd_status() {
  echo "Container:"
  docker ps --filter name=foundry-local --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo "  not running"
}

cmd_ps() {
  $COMPOSE ps
}

[ $# -lt 1 ] && usage

case "$1" in
  up)       cmd_up ;;
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  down)     cmd_down ;;
  nuke)     cmd_nuke ;;
  rebuild)  cmd_rebuild ;;
  logs)     cmd_logs ;;
  shell)    cmd_shell ;;
  status)   cmd_status ;;
  ps)       cmd_ps ;;
  *)        usage ;;
esac
