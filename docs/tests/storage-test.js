'use strict';

/* ─── Helpers ─── */
function setStatus(id, msg, isError) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'status' + (isError ? ' error' : '');
}

function renderTable(tbodyId, rows) {
  const tbody = document.getElementById(tbodyId);
  if (!rows.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="2">（暂无数据）</td></tr>';
    return;
  }
  tbody.innerHTML = rows
    .map(([k, v]) => `<tr><td class="key">${esc(k)}</td><td class="val">${esc(String(v))}</td></tr>`)
    .join('');
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ═══════════════════════════════════════
   LocalStorage
═══════════════════════════════════════ */
const LS_KEYS = ['ls_test_user', 'ls_test_theme', 'ls_test_timestamp'];

function readLocalStorage() {
  try {
    const rows = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      rows.push([k, localStorage.getItem(k)]);
    }
    renderTable('ls-tbody', rows);
  } catch (e) {
    renderTable('ls-tbody', []);
    setStatus('ls-status', '读取失败: ' + e.message, true);
  }
}

function writeLocalStorage() {
  try {
    localStorage.setItem(LS_KEYS[0], 'Alice_' + Date.now());
    localStorage.setItem(LS_KEYS[1], 'dark');
    localStorage.setItem(LS_KEYS[2], new Date().toISOString());
    setStatus('ls-status', '✓ 已写入 3 个键值');
    readLocalStorage();
  } catch (e) {
    setStatus('ls-status', '写入失败: ' + e.message, true);
  }
}

function clearLocalStorage() {
  try {
    LS_KEYS.forEach(k => localStorage.removeItem(k));
    setStatus('ls-status', '✓ 已清除测试键');
    readLocalStorage();
  } catch (e) {
    setStatus('ls-status', '清除失败: ' + e.message, true);
  }
}

/* ═══════════════════════════════════════
   Cookies
═══════════════════════════════════════ */
const CK_KEYS = ['ck_test_session', 'ck_test_lang', 'ck_test_visited'];

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function getAllCookies() {
  return document.cookie
    ? document.cookie.split('; ').map(pair => {
        const idx = pair.indexOf('=');
        return [decodeURIComponent(pair.slice(0, idx)), decodeURIComponent(pair.slice(idx + 1))];
      })
    : [];
}

function readCookies() {
  renderTable('ck-tbody', getAllCookies());
}

function writeCookies() {
  setCookie(CK_KEYS[0], 'sess_' + Math.random().toString(36).slice(2), 7);
  setCookie(CK_KEYS[1], 'zh-CN', 7);
  setCookie(CK_KEYS[2], new Date().toISOString(), 7);
  setStatus('ck-status', '✓ 已写入 3 个 Cookie（7 天有效期）');
  readCookies();
}

function clearCookies() {
  CK_KEYS.forEach(deleteCookie);
  setStatus('ck-status', '✓ 已删除测试 Cookie');
  readCookies();
}

/* ═══════════════════════════════════════
   IndexedDB
═══════════════════════════════════════ */
const IDB_NAME = 'storage_test_db';
const IDB_STORE = 'kv_store';
const IDB_VERSION = 1;
const IDB_KEYS = ['idb_test_profile', 'idb_test_score', 'idb_test_lastSeen'];

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

async function readIndexedDB() {
  try {
    const database = await openDB();
    const tx = database.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const rows = [];
    await new Promise((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          const val = typeof cursor.value === 'object'
            ? JSON.stringify(cursor.value)
            : String(cursor.value);
          rows.push([String(cursor.key), val]);
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = e => reject(e.target.error);
    });
    renderTable('idb-tbody', rows);
  } catch (e) {
    renderTable('idb-tbody', []);
    setStatus('idb-status', '读取失败: ' + e.message, true);
  }
}

async function writeIndexedDB() {
  try {
    const database = await openDB();
    const tx = database.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put({ name: 'Alice', age: 28 }, IDB_KEYS[0]);
    store.put(Math.floor(Math.random() * 10000), IDB_KEYS[1]);
    store.put(new Date().toISOString(), IDB_KEYS[2]);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = e => rej(e.target.error); });
    setStatus('idb-status', '✓ 已写入 3 条记录');
    await readIndexedDB();
  } catch (e) {
    setStatus('idb-status', '写入失败: ' + e.message, true);
  }
}

async function clearIndexedDB() {
  try {
    const database = await openDB();
    const tx = database.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    IDB_KEYS.forEach(k => store.delete(k));
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = e => rej(e.target.error); });
    setStatus('idb-status', '✓ 已删除测试记录');
    await readIndexedDB();
  } catch (e) {
    setStatus('idb-status', '清除失败: ' + e.message, true);
  }
}

/* ─── 绑定按钮事件 ─── */
document.getElementById('ls-write-btn').addEventListener('click', writeLocalStorage);
document.getElementById('ls-clear-btn').addEventListener('click', clearLocalStorage);
document.getElementById('ck-write-btn').addEventListener('click', writeCookies);
document.getElementById('ck-clear-btn').addEventListener('click', clearCookies);
document.getElementById('idb-write-btn').addEventListener('click', writeIndexedDB);
document.getElementById('idb-clear-btn').addEventListener('click', clearIndexedDB);

/* ─── 页面加载时读取所有存储 ─── */
(async () => {
  readLocalStorage();
  readCookies();
  await readIndexedDB();
})();
