# =============================================================================
# foundry-api-bridge — Foundry VTT + module image
# Chains Foundry VTT (felddy) with the API bridge module baked in.
# The MCP server runs separately; point its FOUNDRY_WS_URL at this container.
# =============================================================================

# -- Build: Foundry module --
FROM node:20-alpine AS build-module
WORKDIR /app
COPY package.json package-lock.json* .npmrc ./
RUN npm ci
COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN npx vite build

# Copy the static dist assets that aren't produced by vite
COPY dist/module.json ./dist/module.json
COPY dist/styles ./dist/styles
COPY dist/templates ./dist/templates

# -- Production: layer onto felddy/foundryvtt --
FROM felddy/foundryvtt:14

# Module staged for install on first boot
COPY --from=build-module /app/dist /opt/foundry-api-bridge

# Entrypoint wrapper (--chmod avoids needing root for RUN chmod)
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

ENV FOUNDRY_DATA_DIR=/data/Data

EXPOSE 30000

ENTRYPOINT ["docker-entrypoint.sh"]
# Restore the CMD that felddy's entrypoint expects — our ENTRYPOINT
# override resets it to empty, causing "$1: unbound variable".
CMD ["resources/app/main.js", "--port=30000", "--headless", "--noupdate", "--dataPath=/data"]
