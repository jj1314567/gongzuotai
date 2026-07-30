/* ============================================================
   cloud-sync.js · 云同步（手机 ↔ 电脑）
   纯前端方案：把工作台数据序列化后存进你的 GitHub 私密 Gist，
   手机/电脑配置同一个 PAT 即自动双向同步，无需自建后端。
   - push：本地 → 私密 Gist（无 gistId 时自动创建）
   - pull：私密 Gist → 本地（远端优先覆盖）
   - 可选口令加密（Web Crypto AES-GCM），file:// 非安全上下文降级明文
   ============================================================ */
(function (global) {
  'use strict';

  const CFG_KEY = 'gw_cloud_cfg';
  const FILENAME = 'gongzuotai-backup.json';
  const API = 'https://api.github.com/gists';
  // 固定 salt（仅用于口令派生，非密钥）
  const SALT = new TextEncoder().encode('gongzuotai-cloud-sync-salt');
  let DEBOUNCE = 2000;

  let cfg = loadCfg();
  let timer = null;
  let statusHandler = null;

  function loadCfg() {
    try {
      return Object.assign(
        { token: '', pwd: '', gistId: '', enabled: false, lastSync: 0 },
        JSON.parse(localStorage.getItem(CFG_KEY) || '{}')
      );
    } catch (e) {
      return { token: '', pwd: '', gistId: '', enabled: false, lastSync: 0 };
    }
  }
  function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function setStatus(s) { if (statusHandler) statusHandler(s); }

  /* ---------------- 加密（Web Crypto AES-GCM） ---------------- */
  const subtle = (global.crypto && global.crypto.subtle) ? global.crypto.subtle : null;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  async function deriveKey(password) {
    const baseKey = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey(
      { name: 'PBKDF2', salt: SALT, iterations: 100000, hash: 'SHA-256' },
      baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }
  // 口令为空时退而用 token 派生（有 token 才能解密，多一层防护）；都无则用默认值
  function passphrase() { return cfg.pwd || cfg.token || 'default'; }
  async function encrypt(plain) {
    if (!subtle) return plain; // 非安全上下文降级明文
    const key = await deriveKey(passphrase());
    const iv = global.crypto.getRandomValues(new Uint8Array(12));
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(plain));
    return 'enc:' + bufToB64(iv) + ':' + bufToB64(ct);
  }
  async function decrypt(payload) {
    if (!payload || payload.indexOf('enc:') !== 0) return payload; // 明文
    if (!subtle) throw new Error('当前环境不支持解密（非安全上下文，请用 https 链接访问）');
    const parts = payload.split(':');
    const iv = b64ToBuf(parts[1]);
    const ct = b64ToBuf(parts[2]);
    const key = await deriveKey(passphrase());
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
    return dec.decode(pt);
  }

  /* ---------------- Gist API ---------------- */
  function headers() {
    return {
      'Authorization': 'Bearer ' + cfg.token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }
  async function push() {
    if (!cfg.enabled || !cfg.token) { setStatus('未启用或缺少 token'); return false; }
    const plain = global.Store.exportData();
    const content = await encrypt(plain);
    const body = JSON.stringify({ public: false, files: { [FILENAME]: { content: content } } });
    try {
      let res;
      if (cfg.gistId) {
        res = await fetch(API + '/' + cfg.gistId, { method: 'PATCH', headers: headers(), body: body });
      } else {
        res = await fetch(API, { method: 'POST', headers: headers(), body: body });
      }
      if (!res.ok) {
        setStatus('备份失败：' + res.status + (res.status === 401 ? '（token 无效或无 gist 权限）' : ''));
        return false;
      }
      const data = await res.json();
      if (!cfg.gistId && data.id) { cfg.gistId = data.id; }
      cfg.lastSync = Date.now();
      saveCfg();
      setStatus('已备份到云端 · ' + new Date().toLocaleString());
      return true;
    } catch (e) {
      setStatus('备份出错：' + e.message);
      return false;
    }
  }
  async function pull() {
    if (!cfg.enabled || !cfg.token || !cfg.gistId) return false;
    try {
      const res = await fetch(API + '/' + cfg.gistId, { headers: headers() });
      if (!res.ok) { setStatus('恢复失败：' + res.status + (res.status === 401 ? '（token 无效）' : '')); return false; }
      const data = await res.json();
      const file = data.files && data.files[FILENAME];
      if (!file || !file.content) { setStatus('云端暂无备份'); return false; }
      const plain = await decrypt(file.content);
      const ok = global.Store.importData(plain);
      if (ok) {
        cfg.lastSync = Date.now();
        saveCfg();
        setStatus('已从云端恢复 · ' + new Date().toLocaleString());
        return true;
      }
      setStatus('恢复失败：数据格式错误');
      return false;
    } catch (e) {
      setStatus('恢复出错：' + e.message);
      return false;
    }
  }

  /* ---------------- 自动触发 ---------------- */
  function onSave() {
    if (!cfg.enabled || !cfg.token) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { push(); }, DEBOUNCE);
  }
  function onVisible() {
    if (!cfg.enabled || !cfg.token || !cfg.gistId) return;
    pull();
  }

  /* ---------------- 配置 ---------------- */
  function configure(o) {
    if (o.token !== undefined) cfg.token = o.token;
    if (o.pwd !== undefined) cfg.pwd = o.pwd;
    if (o.enabled !== undefined) cfg.enabled = !!o.enabled;
    if (o.gistId !== undefined) cfg.gistId = o.gistId;
    saveCfg();
  }
  function getCfg() { return Object.assign({}, cfg); }
  function isEnabled() { return !!(cfg.enabled && cfg.token); }
  function setStatusHandler(fn) { statusHandler = fn; }

  global.CloudSync = {
    configure: configure,
    push: push,
    pull: pull,
    onSave: onSave,
    onVisible: onVisible,
    getCfg: getCfg,
    isEnabled: isEnabled,
    setStatusHandler: setStatusHandler,
    _internal: { encrypt: encrypt, decrypt: decrypt, deriveKey: deriveKey, loadCfg: loadCfg, setDebounce: function (ms) { DEBOUNCE = ms; } },
  };
})(window);
