'use strict';

const targets = [
  { name: 'VNC Native', port: 5900, path: '/', type: 'native' },
  { name: 'RDP Native', port: 3389, path: '/', type: 'native' },
  { name: 'VNC Web Legacy', port: 5800, path: '/', type: 'web' },
  { name: 'noVNC', port: 6080, path: '/', type: 'web' },
  { name: 'VNC Web Common', port: 6901, path: '/', type: 'web' },
  { name: 'Guacamole', port: 8080, path: '/guacamole/', type: 'web' },
  { name: 'Guacamole TLS', port: 8443, path: '/guacamole/', type: 'web' }
];

const resultBody = document.getElementById('resultBody');
const hostInput = document.getElementById('hostInput');
const timeoutInput = document.getElementById('timeoutInput');
const singlePortInput = document.getElementById('singlePortInput');
const singleResult = document.getElementById('singleResult');

const sReachable = document.getElementById('sReachable');
const sClosed = document.getElementById('sClosed');
const sUncertain = document.getElementById('sUncertain');
const sLastRun = document.getElementById('sLastRun');

function nowLabel() {
  return new Date().toLocaleTimeString();
}

function renderLoadingRows(host) {
  resultBody.innerHTML = targets.map((t) => {
    const httpUrl = `http://${host}:${t.port}${t.path}`;
    const wsUrl = `ws://${host}:${t.port}${t.path}`;
    return `
      <tr>
        <td>${t.name}</td>
        <td><code>${httpUrl}</code></td>
        <td><code>${wsUrl}</code></td>
        <td><span class="pill pill-info">probing</span></td>
        <td><span class="pill pill-info">probing</span></td>
        <td>...</td>
        <td>Waiting for HTTP + WS response</td>
      </tr>
    `;
  }).join('');
}

async function probeHttp(url, timeoutMs) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });

    return {
      status: 'reachable',
      details: 'HTTP stack responded (opaque/no-cors response).',
      duration: Math.round(performance.now() - started)
    };
  } catch (err) {
    const duration = Math.round(performance.now() - started);
    if (err && err.name === 'AbortError') {
      return {
        status: 'uncertain',
        details: 'Timed out. Host or port may filter/drop packets.',
        duration
      };
    }

    return {
      status: 'closed',
      details: 'Connection failed or blocked by browser/network policy.',
      duration
    };
  } finally {
    clearTimeout(timer);
  }
}

function probeWebSocket(url, timeoutMs) {
  return new Promise((resolve) => {
    const started = performance.now();
    let settled = false;
    let ws;

    const finish = (status, details) => {
      if (settled) return;
      settled = true;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      resolve({
        status,
        details,
        duration: Math.round(performance.now() - started)
      });
    };

    const timer = setTimeout(() => {
      if (ws) ws.close();
      finish('uncertain', 'WS connect timeout.');
    }, timeoutMs);

    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        clearTimeout(timer);
        finish('reachable', 'WS handshake succeeded.');
      };
      ws.onerror = () => {
        clearTimeout(timer);
        finish('closed', 'WS handshake failed or blocked.');
      };
      ws.onclose = (evt) => {
        if (!settled) {
          clearTimeout(timer);
          finish('closed', `WS closed before open (code ${evt.code}).`);
        }
      };
    } catch (err) {
      clearTimeout(timer);
      finish('closed', `WS exception: ${err && err.message ? err.message : 'unknown'}`);
    }
  });
}

function makeResultPill(target, result) {
  if (result.status === 'reachable') {
    return '<span class="pill pill-ok">reachable</span>';
  }

  if (result.status === 'uncertain') {
    return '<span class="pill pill-warn">uncertain</span>';
  }

  if (target.type === 'native') {
    return '<span class="pill pill-warn">not-http/native</span>';
  }

  return '<span class="pill pill-bad">likely closed</span>';
}

function makeWsResultPill(target, result) {
  if (result.status === 'reachable') {
    return '<span class="pill pill-ok">reachable</span>';
  }

  if (result.status === 'uncertain') {
    return '<span class="pill pill-warn">uncertain</span>';
  }

  if (target.type === 'native') {
    return '<span class="pill pill-warn">not-ws/native</span>';
  }

  return '<span class="pill pill-bad">likely closed</span>';
}

function updateSummary(allResults) {
  let reachable = 0;
  let closed = 0;
  let uncertain = 0;

  for (const row of allResults) {
    const statuses = [row.httpResult.status, row.wsResult.status];
    for (const st of statuses) {
      if (st === 'reachable') reachable += 1;
      else if (st === 'closed') closed += 1;
      else uncertain += 1;
    }
  }

  sReachable.textContent = String(reachable);
  sClosed.textContent = String(closed);
  sUncertain.textContent = String(uncertain);
  sLastRun.textContent = nowLabel();
}

async function runProbe() {
  const host = (hostInput.value || '127.0.0.1').trim();
  const timeoutMs = Math.max(200, Number(timeoutInput.value) || 1600);

  renderLoadingRows(host);

  const rows = [];
  for (const t of targets) {
    const httpUrl = `http://${host}:${t.port}${t.path}`;
    const wsUrl = `ws://${host}:${t.port}${t.path}`;
    const [httpResult, wsResult] = await Promise.all([
      probeHttp(httpUrl, timeoutMs),
      probeWebSocket(wsUrl, timeoutMs)
    ]);
    rows.push({ target: t, httpUrl, wsUrl, httpResult, wsResult });
  }

  resultBody.innerHTML = rows.map((item) => `
    <tr>
      <td>${item.target.name}</td>
      <td><code>${item.httpUrl}</code></td>
      <td><code>${item.wsUrl}</code></td>
      <td>${makeResultPill(item.target, item.httpResult)}</td>
      <td>${makeWsResultPill(item.target, item.wsResult)}</td>
      <td>HTTP ${item.httpResult.duration} ms / WS ${item.wsResult.duration} ms</td>
      <td>HTTP: ${item.httpResult.details}<br>WS: ${item.wsResult.details}</td>
    </tr>
  `).join('');

  updateSummary(rows);
}

async function runSinglePortProbe() {
  const host = (hostInput.value || '127.0.0.1').trim();
  const timeoutMs = Math.max(200, Number(timeoutInput.value) || 1600);
  const port = Number(singlePortInput.value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    singleResult.innerHTML = '<span class="pill pill-bad">invalid</span> Port must be 1-65535.';
    return;
  }

  const httpUrl = `http://${host}:${port}/`;
  const wsUrl = `ws://${host}:${port}/`;

  singleResult.innerHTML = '<span class="pill pill-info">probing</span> Running HTTP + WS probe...';

  const [httpResult, wsResult] = await Promise.all([
    probeHttp(httpUrl, timeoutMs),
    probeWebSocket(wsUrl, timeoutMs)
  ]);

  singleResult.innerHTML = `
    <div><strong>Target:</strong> <code>${host}:${port}</code></div>
    <div><strong>HTTP:</strong> ${makeResultPill({ type: 'custom' }, httpResult)} ${httpResult.duration} ms, ${httpResult.details}</div>
    <div><strong>WS:</strong> ${makeWsResultPill({ type: 'custom' }, wsResult)} ${wsResult.duration} ms, ${wsResult.details}</div>
  `;
}

document.getElementById('runBtn').addEventListener('click', runProbe);
document.getElementById('localhostBtn').addEventListener('click', () => {
  hostInput.value = 'localhost';
  runProbe();
});
document.getElementById('runSinglePortBtn').addEventListener('click', runSinglePortProbe);

runProbe();