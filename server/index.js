const express = require('express');
const path = require('path');
const { lidarrFetch, getConfig } = require('./lidarr');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  let configured = true;
  try {
    getConfig();
  } catch {
    configured = false;
  }
  res.json({ ok: true, lidarrConfigured: configured });
});

app.get('/api/summary', async (req, res) => {
  try {
    const [artists, missing] = await Promise.all([
      lidarrFetch('/api/v1/artist'),
      lidarrFetch('/api/v1/wanted/missing?pageSize=1&page=1').catch(() => ({ totalRecords: null })),
    ]);

    let totalAlbums = 0;
    let totalTracks = 0;
    let totalTrackFiles = 0;
    let sizeOnDisk = 0;
    let monitoredArtists = 0;

    for (const a of artists) {
      const stats = a.statistics || {};
      totalAlbums += stats.albumCount || 0;
      totalTracks += stats.totalTrackCount || 0;
      totalTrackFiles += stats.trackFileCount || 0;
      sizeOnDisk += stats.sizeOnDisk || 0;
      if (a.monitored) monitoredArtists += 1;
    }

    const percentComplete = totalTracks > 0 ? (totalTrackFiles / totalTracks) * 100 : 0;

    res.json({
      totalArtists: artists.length,
      monitoredArtists,
      totalAlbums,
      totalTracks,
      totalTrackFiles,
      percentComplete: Math.round(percentComplete * 10) / 10,
      sizeOnDisk,
      missingAlbums: typeof missing.totalRecords === 'number' ? missing.totalRecords : null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/artists', async (req, res) => {
  try {
    const artists = await lidarrFetch('/api/v1/artist');
    const simplified = artists.map((a) => {
      const stats = a.statistics || {};
      const totalTrackCount = stats.totalTrackCount || 0;
      const trackFileCount = stats.trackFileCount || 0;
      const percent = totalTrackCount > 0 ? (trackFileCount / totalTrackCount) * 100 : 0;
      return {
        id: a.id,
        name: a.artistName,
        monitored: a.monitored,
        albumCount: stats.albumCount || 0,
        trackFileCount,
        totalTrackCount,
        sizeOnDisk: stats.sizeOnDisk || 0,
        percent: Math.round(percent * 10) / 10,
      };
    });
    res.json(simplified);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/queue', async (req, res) => {
  try {
    const queue = await lidarrFetch('/api/v1/queue?pageSize=100&includeArtist=true&includeAlbum=true');
    const records = (queue.records || []).map((r) => {
      const size = r.size || 0;
      const sizeleft = r.sizeleft || 0;
      const percent = size > 0 ? ((size - sizeleft) / size) * 100 : 0;
      return {
        id: r.id,
        title: r.title,
        artist: r.artist?.artistName || null,
        album: r.album?.title || null,
        status: r.status,
        trackedDownloadStatus: r.trackedDownloadStatus || null,
        quality: r.quality?.quality?.name || null,
        timeleft: r.timeleft || null,
        size,
        sizeleft,
        percent: Math.round(percent * 10) / 10,
      };
    });
    res.json(records);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`LidarrProgress listening on port ${PORT}`);
});
