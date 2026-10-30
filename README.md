# rig

Keeps a lane's lights on while nobody is in it: a heartbeat every minute, a status board, and
(next) a morning digest of what ran overnight.

```sh
cp .env.example .env   # set LANE_MARKER
pnpm install
pnpm dev               # http://localhost:8787
```

Working on it with an agent: start at [AGENTS.md](AGENTS.md).

To save the marked digest page as one self-contained HTML file:

    pnpm preview:save -- var/preview/digest-2026-10-28.html

The output path is ignored by Git. Do not commit or attach the preview; after review, replace the
public copy with a marker-free one at the same URL.
