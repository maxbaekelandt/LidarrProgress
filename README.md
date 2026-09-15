# Lidarr Progress

A small self-hosted dashboard that shows the overall download progress of your
Lidarr music library — not just one artist, but the whole library — plus
active downloads and a per-artist breakdown.

It works by having a tiny Node.js server talk to your Lidarr instance's API
(server-side, so your API key never reaches the browser) and serving a
dashboard page that polls that server every 15 seconds.

## What you get

- **Overall library progress bar** — total tracks downloaded vs. total tracks
  known to Lidarr, across every artist.
- **Stat cards** — total artists, total albums, missing albums, total size on
  disk.
- **Active downloads** — live progress of anything currently downloading via
  Lidarr's queue.
- **Artist table** — searchable and sortable, with a progress bar and size per
  artist, and a flag for unmonitored artists.

## Configuration

The app is configured entirely through environment variables — no code
changes needed:

| Variable         | Required | Description                                                                 |
|-------------------|----------|-------------------------------------------------------------------------------|
| `LIDARR_URL`      | Yes      | Base URL of your Lidarr instance, e.g. `http://lidarr:8686`                  |
| `LIDARR_API_KEY`  | Yes      | Found in Lidarr under **Settings → General → Security → API Key**            |
| `PORT`            | No       | Port the dashboard listens on inside the container (default `8080`)          |

See `.env.example` for a template.

## Running locally (optional, for testing)

```bash
cp .env.example .env
# edit .env with your Lidarr URL + API key
npm install
npm start
```

Then open http://localhost:8080.

## Deploying with Docker

```bash
docker build -t lidarr-progress .
docker run -d \
  --name lidarr-progress \
  -p 8080:8080 \
  -e LIDARR_URL=http://lidarr:8686 \
  -e LIDARR_API_KEY=your-api-key \
  lidarr-progress
```

A `docker-compose.yml` is also included if you prefer Compose — see the
Dokploy section below for the two ways to wire it into your existing
Jellyfin/Lidarr stack.

## Deploying on Dokploy

You have two ways to fit this into your existing Jellyfin/Lidarr setup,
depending on how that stack is defined in Dokploy.

### Option A — Add it to your existing Compose file (simplest)

If your Jellyfin + Lidarr setup in Dokploy is itself one **Docker Compose**
app (one `docker-compose.yml` with multiple `services:`), the easiest path
is to copy the `lidarr-progress` service block from this repo's
`docker-compose.yml` straight into *that* file, alongside your `jellyfin`
and `lidarr` services. Services in the same Compose file share a network
automatically, so `LIDARR_URL=http://lidarr:8686` (using whatever your
Lidarr service is named in that file) will just work — no extra networking
config needed. You'd just add the `LIDARR_URL`/`LIDARR_API_KEY` env vars to
that stack and redeploy it.

### Option B — Deploy this repo as its own app

If you'd rather keep this as a separate app in Dokploy (pointing at this
GitHub repo, so it updates independently), use this repo's
`docker-compose.yml` as-is:

1. **Find your existing network name.** In Dokploy, open your Lidarr
   service and look for its network name (usually under the service's
   **Advanced**/**Network** tab, or you can run `docker network ls` and
   `docker inspect <lidarr-container>` on the host to find which network
   it's attached to).
2. **Create the app.** Add a new application in Dokploy, type **Docker
   Compose**, pointing at this GitHub repo (it will use the included
   `docker-compose.yml`).
3. **Set environment variables** on the new app:
   - `LIDARR_URL` — e.g. `http://lidarr:8686` (the Lidarr service's name on
     that network)
   - `LIDARR_API_KEY`
   - `LIDARR_NETWORK` — the network name you found in step 1. The compose
     file joins this network (in addition to its own) so it can resolve
     `lidarr` by name.
   - (optional) `PORT`
4. **Expose the dashboard.** Give the app a domain or port mapping in
   Dokploy like any other service (e.g. `progress.yourdomain.com`, or just
   port `8080` if you're accessing it via IP). Nothing else needs a public
   port — only the dashboard itself.
5. **Deploy.** Dokploy will build the image and start the container. Open
   the dashboard URL — you should see your library's progress within a few
   seconds.

If you're unsure which option applies, Option A is less to configure and
guaranteed to have working networking, since it rides on the same Compose
file as Lidarr itself.

If the dashboard shows a "Connection error" banner, it means the server
couldn't reach Lidarr or the API key was rejected — double check
`LIDARR_URL`/`LIDARR_API_KEY` (and, for Option B, `LIDARR_NETWORK`) in the
Dokploy environment settings.

## Ideas for later

- Push notifications (e.g. Discord/ntfy webhook) when a long-running import
  finishes or an album finally completes.
- A history chart of library completion % over time.
- Breaking down progress by genre or by release year.
- Basic auth / a password gate if you expose the dashboard publicly.
