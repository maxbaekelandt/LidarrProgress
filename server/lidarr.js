const CACHE_TTL_MS = 10_000;
const cache = new Map();

function getConfig() {
  const baseUrl = (process.env.LIDARR_URL || '').trim().replace(/\/+$/, '');
  const apiKey = (process.env.LIDARR_API_KEY || '').trim();
  if (!baseUrl || !apiKey) {
    const err = new Error('Server is missing LIDARR_URL and/or LIDARR_API_KEY environment variables.');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }
  return { baseUrl, apiKey };
}

async function lidarrFetch(path) {
  const cached = cache.get(path);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }

  const { baseUrl, apiKey } = getConfig();
  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      headers: { 'X-Api-Key': apiKey },
    });
  } catch (err) {
    throw new Error(`Could not reach Lidarr at ${baseUrl} (${err.message})`);
  }

  if (!res.ok) {
    throw new Error(`Lidarr returned ${res.status} ${res.statusText} for ${path}`);
  }

  const data = await res.json();
  cache.set(path, { time: Date.now(), data });
  return data;
}

module.exports = { lidarrFetch, getConfig };
