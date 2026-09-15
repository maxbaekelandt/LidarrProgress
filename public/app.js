const REFRESH_MS = 15000;

let artistsData = [];
let sortKey = 'percent';
let sortDir = 'asc';
let searchTerm = '';

const el = (id) => document.getElementById(id);

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatNumber(n) {
  if (n === null || n === undefined) return '--';
  return n.toLocaleString();
}

function setStatus(state, message) {
  const pill = el('statusPill');
  pill.className = `pill pill-${state}`;
  pill.textContent = message;
}

function showError(message) {
  const banner = el('errorBanner');
  if (!message) {
    banner.hidden = true;
    banner.textContent = '';
    return;
  }
  banner.hidden = false;
  banner.textContent = message;
}

async function fetchJson(path) {
  const res = await fetch(path);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request to ${path} failed`);
  }
  return body;
}

function renderSummary(summary) {
  el('overallPercent').textContent = summary.percentComplete.toFixed(1);
  el('overallFill').style.width = `${Math.min(summary.percentComplete, 100)}%`;
  el('overallSub').textContent =
    `${formatNumber(summary.totalTrackFiles)} of ${formatNumber(summary.totalTracks)} tracks downloaded`;

  el('statArtists').textContent = formatNumber(summary.totalArtists);
  el('statAlbums').textContent = formatNumber(summary.totalAlbums);
  el('statMissing').textContent = summary.missingAlbums === null ? '--' : formatNumber(summary.missingAlbums);
  el('statSize').textContent = formatBytes(summary.sizeOnDisk);

  el('updatedAt').textContent = `Updated ${new Date(summary.updatedAt).toLocaleTimeString()}`;
}

function renderQueue(records) {
  el('queueCount').textContent = records.length;
  const wrap = el('queueTableWrap');
  const empty = el('queueEmpty');
  const body = el('queueBody');

  if (records.length === 0) {
    wrap.hidden = true;
    empty.hidden = false;
    return;
  }

  wrap.hidden = false;
  empty.hidden = true;
  body.innerHTML = records
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.title || '—')}</td>
        <td>${escapeHtml(r.artist || '—')}</td>
        <td>${escapeHtml(r.trackedDownloadStatus || r.status || '—')}</td>
        <td>${progressCell(r.percent)}</td>
        <td>${escapeHtml(r.timeleft || '—')}</td>
      </tr>`
    )
    .join('');
}

function progressCell(percent) {
  const p = Math.max(0, Math.min(100, percent || 0));
  return `
    <div class="row-progress">
      <div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div>
      <span>${p.toFixed(0)}%</span>
    </div>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function renderArtists() {
  const body = el('artistBody');
  let rows = artistsData.filter((a) => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  rows.sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    let cmp;
    if (typeof av === 'string') {
      cmp = av.localeCompare(bv);
    } else {
      cmp = av - bv;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  body.innerHTML = rows
    .map(
      (a) => `
      <tr>
        <td>${escapeHtml(a.name)}${a.monitored ? '' : ' <span style="color:var(--text-muted)">(unmonitored)</span>'}</td>
        <td>${formatNumber(a.albumCount)}</td>
        <td>${formatNumber(a.trackFileCount)}/${formatNumber(a.totalTrackCount)}</td>
        <td>${progressCell(a.percent)}</td>
        <td>${formatBytes(a.sizeOnDisk)}</td>
      </tr>`
    )
    .join('');
}

async function refresh() {
  try {
    const [summary, queue, artists] = await Promise.all([
      fetchJson('/api/summary'),
      fetchJson('/api/queue'),
      fetchJson('/api/artists'),
    ]);

    renderSummary(summary);
    renderQueue(queue);
    artistsData = artists;
    renderArtists();

    setStatus('ok', 'Connected');
    showError(null);
  } catch (err) {
    setStatus('error', 'Connection error');
    showError(err.message);
  }
}

function setupSorting() {
  document.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDir = 'asc';
      }
      renderArtists();
    });
  });
}

el('refreshBtn').addEventListener('click', refresh);
el('artistSearch').addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderArtists();
});

setupSorting();
refresh();
setInterval(refresh, REFRESH_MS);
