#!/usr/bin/env bash
set -euo pipefail

# ---- Install / update the foundry-api-bridge module into the data volume ----
MODULE_SRC="/opt/foundry-api-bridge"
MODULE_DST="/data/Data/modules/foundry-api-bridge"

# When SKIP_MODULE_COPY is set (docker-compose.local.yml sets this alongside
# a direct bind-mount of dist to MODULE_DST), the module is already
# live at the install path — copying would self-overwrite. Skip the copy and
# let edits to dist appear instantly to Foundry.
if [ -n "${SKIP_MODULE_COPY:-}" ]; then
  echo "[foundry-api-bridge] Module bind-mounted at $MODULE_DST — skipping copy"
elif [ -d "$MODULE_SRC" ]; then
  mkdir -p "$MODULE_DST"
  cp -r "$MODULE_SRC"/. "$MODULE_DST"/
  echo "[foundry-api-bridge] Module installed → $MODULE_DST"
fi

# ---- Hand off to the original felddy entrypoint -----------------------------
cd /home/node
exec ./entrypoint.sh "$@"
