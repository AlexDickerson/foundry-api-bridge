# foundry-api-bridge

Foundry VTT module that exposes a WebSocket command interface to a self-hosted MCP server. Paired with [foundry-mcp](https://github.com/AlexDickerson/foundry-mcp) for Claude / MCP-client control of a live Foundry world.

Forked from [Alex Ivenkov's foundry-api-bridge](https://github.com/alexivenkov/foundry-api-bridge-module) v7.7.0 (MIT). The fork removes all upstream SaaS connectivity (Patreon auth flow, auto-update manifest, external WebSocket default) and adds a `create-scene` command handler. All modifications are documented in [PATCHES.md](PATCHES.md). The original license and copyright are preserved in [LICENSE](LICENSE).

## A message from the author on AI Usage

These projects are intended as resources for the Pathfinder community to use as they desire. They are free and open source and will remain so forever.

These projects are made with extensive use of AI coding agents; I know this is a contentious issue among the community, for a number of valid reasons. I can say that these have been built with reasonable diligence and care, but I understand this will not assuage the concerns of many.

For those that find any AI unacceptable (and honestly, for anyone), I would encourage you to use and, importantly, support [Pathbuilder 2e](https://pathbuilder.app), an entirely handmade tool that continues to be an incredible pillar of the community.

## Architecture

```
MCP client ──HTTP──> foundry-mcp server ──WebSocket──> foundry-api-bridge (in GM browser)
                         (host:8765)                        (Foundry VTT v13+)
```

The module runs in the GM's browser tab, maintains a WebSocket to the MCP server, and executes commands against the Foundry API.

## Development

```bash
npm install
npm run dev          # Watch mode (vite build --watch)
npm run build        # Production build
npm run lint
npm run type-check
npm run test         # Jest
```

## Docker (Foundry + module, all-in-one image)

Layers the module onto `felddy/foundryvtt:14`, so the container serves Foundry with the bridge module pre-installed. The MCP server runs separately — point its `FOUNDRY_WS_URL` at this container's websocket once the module is enabled in your world.

```bash
cp .env.example .env         # fill in FOUNDRY_USERNAME/PASSWORD
./local.sh up                # build image, deps, dist, start container
# open http://localhost:30000 and set up a world

./local.sh rebuild           # rebuild dist + restart container (seconds)
./local.sh logs              # tail container logs
./local.sh status            # container status
./local.sh stop              # keep data
./local.sh nuke              # destroy the data volume (asks first)
```

Data lives in a named Docker volume (`foundry-data-local`) by default, so the workflow is OS-portable. Set `FOUNDRY_DATA=/some/host/path` in `.env` to bind to a host path instead. Port defaults to 30000 and can be overridden via `FOUNDRY_PORT` if you already have a production container running on the same machine.

## Installation in Foundry

1. Enable the module in **Game Settings → Configure Settings → Module Management**.
2. Configure the WebSocket URL under **Game Settings → Configure Settings → Module Settings → Foundry API Bridge**:
   - Self-hosted MCP server: `ws://<server-host>:8765/foundry`
3. Reload the world. The module header bar shows connection state.

## Compatibility

| Foundry VTT Version | Status |
|---------------------|--------|
| v14                 | Verified (Docker base image) |
| v13                 | Verified |
| v12                 | Works |

## Links

- [foundry-mcp](https://github.com/AlexDickerson/foundry-mcp) — the server that this module connects to
- [Upstream foundry-api-bridge](https://github.com/alexivenkov/foundry-api-bridge-module) — the fork source

## License

MIT — see [LICENSE](LICENSE).
