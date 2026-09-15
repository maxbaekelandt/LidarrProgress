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

A `docker-compose.yml` is also included if you prefer Compose.

## Deploying on Dokploy

1. **Create the app.** In your Dokploy dashboard, go to the project that
   already has Jellyfin and Lidarr in it, and add a new application. You can
   use either:
   - **Dockerfile / Application** type, pointing at this GitHub repo (Dokploy
     will build the included `Dockerfile`), or
   - **Docker Compose** type, pointing at this repo's `docker-compose.yml`.
2. **Set environment variables** on the new app in Dokploy:
   - `LIDARR_URL`
   - `LIDARR_API_KEY`
   - (optional) `PORT`
3. **Networking to Lidarr.** Because this app lives in the *same Dokploy
   project* as Lidarr, it should be able to reach Lidarr over Dokploy's
   internal Docker network using Lidarr's service name as the hostname —
   for example `http://lidarr:8686` (swap `lidarr` for whatever your Lidarr
   service is actually called in that project). This means you do **not**
   need to expose Lidarr's port to the internet just for this dashboard to
   work.
   - If that hostname doesn't resolve, check the service name Dokploy gave
     your Lidarr container (visible in its service settings), or fall back to
     your server's LAN IP + Lidarr's port.
4. **Expose the dashboard.** Give the app a domain or port mapping in Dokploy
   like you would for any other service (e.g. `progress.yourdomain.com`, or a
   port like `8080` if you're accessing it via IP). Nothing else needs a
   public port — only the dashboard itself.
5. **Deploy.** Dokploy will build the image and start the container. Open the
   dashboard URL — you should see your library's progress within a few
   seconds.

If the dashboard shows a "Connection error" banner, it means the server
couldn't reach Lidarr or the API key was rejected — double-check `LIDARR_URL`
and `LIDARR_API_KEY` in the Dokploy environment settings.

## Ideas for later

- Push notifications (e.g. Discord/ntfy webhook) when a long-running import
  finishes or an album finally completes.
- A history chart of library completion % over time.
- Breaking down progress by genre or by release year.
- Basic auth / a password gate if you expose the dashboard publicly.
