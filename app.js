(function () {
'use strict';

/* ─────────────────────────────────────────
   STORAGE
───────────────────────────────────────── */
var DATA_KEY = 'kohie_v1_data';
var CFG_KEY  = 'kohie_v1_cfg';

function loadJSON(key, fallback) {
  try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
var S = loadJSON(DATA_KEY, { title:'my space', cover:null, tasks:[] });
if (!S.title) S.title = 'my space';
if (!S.tasks || !Array.isArray(S.tasks)) S.tasks = [];

/* seed demo tasks on first run */
if (S.tasks.length === 0) {
  var now = Date.now();
  S.tasks = [
    { id:1, text:'Morning pages',       done:false, locked:false, awaiting:false, notes:'', photos:[], created:now-172800000, completed:null },
    { id:2, text:'Read for 30 minutes', done:false, locked:false, awaiting:false, notes:'', photos:[], created:now-86400000,  completed:null },
    { id:3, text:'Call the dentist',    done:true,  locked:true,  awaiting:false, notes:'Booked for Thursday', photos:[], created:now-259200000, completed:now-3600000 },
  ];
}

/* build theme map from swatch elements */
var THEMES = {};
document.querySelectorAll('.swatch').forEach(function (el) {
  var d = el.dataset;
  THEMES[d.ac] = { bg:d.bg, panel:d.panel, surf:d.surf, surf2:d.surf2,
    b:d.b, b2:d.b2, ac:d.ac, ac2:d.ac2, ag:d.ag,
    gr:d.gr, gd:d.gd, t:d.t, t2:d.t2, t3:d.t3, t4:d.t4,
    rd:d.rd, rdim:d.rdim };
});

var DEFAULT_THEME = THEMES['#c9a87c'] || Object.values(THEMES)[0];

var cfg = loadJSON(CFG_KEY, {});
if (!cfg.font)      cfg.font      = 'DM Sans';
if (!cfg.size)      cfg.size      = 16;
if (!cfg.autoreset) cfg.autoreset = 'off';
if (!cfg.lastReset) cfg.lastReset = 0;
if (!cfg.theme || !cfg.theme.bg) cfg.theme = DEFAULT_THEME;

var activePanelId = null;
var saveTimer     = null;

function saveData() { saveJSON(DATA_KEY, S); }
function saveCfg()  { saveJSON(CFG_KEY, cfg); }

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function el(id) { return document.getElementById(id); }
function gt(id) { return S.tasks.find(function (t) { return t.id === id; }); }

function nextId() {
  if (!S.tasks.length) return 1;
  return Math.max.apply(null, S.tasks.map(function (t) { return t.id; })) + 1;
}

function fmtDate(ts) {
  return ts ? new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
}
function fmtShort(ts) {
  return ts ? new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—';
}

function flashSave() {
  clearTimeout(saveTimer);
  var m = el('asv');
  m.classList.add('show');
  saveTimer = setTimeout(function () { m.classList.remove('show'); }, 1300);
}

/* ─────────────────────────────────────────
   APPLY CONFIG (theme + font + size)
───────────────────────────────────────── */
function applyConfig() {
  var root  = document.documentElement;
  var th    = cfg.theme;
  var props = ['bg','panel','surf','surf2','b','b2','ac','ac2','ag','gr','gd','t','t2','t3','t4','rd','rdim'];
  props.forEach(function (p) { if (th[p]) root.style.setProperty('--' + p, th[p]); });
  root.style.setProperty('--ui-font', "'" + cfg.font + "',sans-serif");
  root.style.fontSize = cfg.size + 'px';
  var dot = el('sb-dot');
  if (dot) dot.style.background = th.ac || '#c9a87c';
}

/* ─────────────────────────────────────────
   RENDER
───────────────────────────────────────── */
function render() {
  var all  = S.tasks.slice().sort(function (a, b) { return b.created - a.created; });
  var pend = all.filter(function (t) { return !t.done; });
  var done = all.filter(function (t) { return t.done; });

  buildList('pending-list', pend, false);
  buildList('done-list',    done, true);

  var tot = S.tasks.length, nd = done.length, nl = pend.length;
  var pct = tot ? Math.round(nd / tot * 100) : 0;

  el('s-total').textContent = tot;
  el('s-done').textContent  = nd;
  el('s-left').textContent  = nl;
  el('s-pct').textContent   = pct + '%';
  el('s-prog').style.width  = pct + '%';
  el('ct-pending').textContent = nl;
  el('ct-done').textContent    = nd;

  var nb = el('nb-home');
  nb.textContent   = nl || '';
  nb.style.display = nl ? '' : 'none';
}

function buildList(listId, tasks, isDone) {
  var container = el(listId);
  container.innerHTML = '';
  if (!tasks.length) {
    var note = document.createElement('div');
    note.className   = 'empty-note';
    note.textContent = isDone ? 'nothing completed yet' : 'all clear — add something above';
    container.appendChild(note);
    return;
  }
  tasks.forEach(function (task) {
    container.appendChild(makeCard(task, isDone));
  });
}

function makeCard(task, isDone) {
  var outer = document.createElement('div');
  outer.className = 'card-outer';

  var delBg = document.createElement('div');
  delBg.className   = 'card-del-bg';
  delBg.textContent = 'delete';
  outer.appendChild(delBg);

  var card = document.createElement('div');
  card.className = 'task-card' + (isDone ? ' done-card' : '');

  /* checkbox */
  var cbClass = 'tc-cb' + (isDone ? ' checked' : task.awaiting ? ' awaiting' : task.locked ? ' locked' : '');
  var cb = document.createElement('div');
  cb.className = cbClass;
  cb.addEventListener('click', function (e) {
    e.stopPropagation();
    if (task.locked) return;
    if (isDone) {
      task.done = false; task.locked = false; task.awaiting = false; task.completed = null; task.photos = [];
    } else {
      task.awaiting = !task.awaiting;
      if (task.awaiting) { saveData(); render(); openPanel(task.id); return; }
    }
    saveData(); render();
  });

  var text = document.createElement('div');
  text.className   = 'tc-text';
  text.textContent = task.text;

  var right = document.createElement('div');
  right.className = 'tc-right';
  if (isDone) {
    var lk = document.createElement('span');
    lk.className   = 'tc-lock';
    lk.textContent = '🔒';
    right.appendChild(lk);
  }
  if (task.created) {
    var dt = document.createElement('span');
    dt.className   = 'tc-date';
    dt.textContent = fmtShort(task.created);
    right.appendChild(dt);
  }
  var arr = document.createElement('span');
  arr.className   = 'tc-arr';
  arr.textContent = '→';
  right.appendChild(arr);

  var top = document.createElement('div');
  top.className = 'tc-top';
  top.appendChild(cb); top.appendChild(text); top.appendChild(right);
  card.appendChild(top);

  /* awaiting row */
  var awRow = document.createElement('div');
  awRow.className = 'tc-await' + (task.awaiting && !isDone ? ' show' : '');
  var awDot = document.createElement('div'); awDot.className = 'tc-await-dot';
  var awTxt = document.createElement('span'); awTxt.className = 'tc-await-txt'; awTxt.textContent = 'awaiting photo — open task to upload';
  awRow.appendChild(awDot); awRow.appendChild(awTxt);
  card.appendChild(awRow);

  /* swipe-to-delete + tap-to-open */
  if (!task.locked) attachSwipe(outer, card, task.id);
  card.addEventListener('click', function () { openPanel(task.id); });

  outer.appendChild(card);
  return outer;
}

/* ─────────────────────────────────────────
   SWIPE TO DELETE
   Single shared document handlers — no per-card global listener leak.
───────────────────────────────────────── */
var _sc = null, _so = null, _sx = 0, _cx = 0, _dragged = false;
var SW_THRESH = 80, SW_MIN = 6;

document.addEventListener('mousemove', function (e) {
  if (!_sc) return;
  _cx = e.clientX;
  var dx = Math.min(0, _cx - _sx);
  if (Math.abs(dx) > SW_MIN) _dragged = true;
  _sc.style.transition = 'none';
  _sc.style.transform  = 'translateX(' + dx + 'px)';
  _so.classList.toggle('reveal', dx < -SW_THRESH / 2);
});
document.addEventListener('mouseup', function () {
  if (!_sc) return;
  _sc.classList.remove('swiping');
  var dx = _cx - _sx;
  if (dx < -SW_THRESH) {
    _sc.style.transition = 'transform .22s ease';
    _sc.style.transform  = 'translateX(-100%)';
    var id = parseInt(_sc.dataset.sid, 10);
    setTimeout(function () { deleteTask(id); }, 200);
  } else {
    _sc.style.transition = '';
    _sc.style.transform  = '';
    _so.classList.remove('reveal');
  }
  _sc = null; _so = null; _dragged = false;
});
document.addEventListener('mouseleave', function () {
  if (!_sc) return;
  _sc.classList.remove('swiping');
  _sc.style.transition = ''; _sc.style.transform = '';
  _so.classList.remove('reveal');
  _sc = null; _so = null; _dragged = false;
});

function attachSwipe(outer, card, taskId) {
  card.dataset.sid = taskId;
  var tx = 0, cx2 = 0, tDragged = false;

  card.addEventListener('click', function (e) {
    if (_dragged || tDragged) { e.stopImmediatePropagation(); _dragged = false; tDragged = false; }
  }, true);

  card.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || _sc) return;
    _sx = e.clientX; _cx = e.clientX; _dragged = false;
    _sc = card; _so = outer;
    card.classList.add('swiping');
  });

  card.addEventListener('touchstart', function (e) {
    tx = e.touches[0].clientX; cx2 = tx; tDragged = false;
  }, { passive:true });
  card.addEventListener('touchmove', function (e) {
    cx2 = e.touches[0].clientX;
    var dx = Math.min(0, cx2 - tx);
    if (Math.abs(dx) > SW_MIN) tDragged = true;
    card.style.transition = 'none';
    card.style.transform  = 'translateX(' + dx + 'px)';
    outer.classList.toggle('reveal', dx < -SW_THRESH / 2);
  }, { passive:true });
  card.addEventListener('touchend', function () {
    var dx = cx2 - tx;
    if (dx < -SW_THRESH) {
      card.style.transition = 'transform .22s ease';
      card.style.transform  = 'translateX(-100%)';
      setTimeout(function () { deleteTask(taskId); }, 200);
    } else {
      card.style.transition = '';
      card.style.transform  = '';
      outer.classList.remove('reveal');
    }
  });
}

/* ─────────────────────────────────────────
   TASK ACTIONS
───────────────────────────────────────── */
function deleteTask(id) {
  S.tasks = S.tasks.filter(function (t) { return t.id !== id; });
  saveData(); render();
}

function addTask() {
  var inp = el('task-input');
  var txt = inp.value.trim();
  if (!txt) { inp.focus(); return; }
  S.tasks.unshift({ id:nextId(), text:txt, done:false, locked:false, awaiting:false, notes:'', photos:[], created:Date.now(), completed:null });
  saveData(); render();
  inp.value = '';
}

/* ─────────────────────────────────────────
   PANEL (task detail)
───────────────────────────────────────── */
function openPanel(id) {
  var task = gt(id);
  if (!task) return;
  activePanelId = id;
  var locked = task.locked;

  var badge = el('p-badge');
  badge.textContent = task.done ? 'completed' : task.awaiting ? 'awaiting photo' : 'pending';
  badge.className   = 'panel-badge ' + (task.done ? 'done' : 'pending');

  el('d-name').value     = task.text;
  el('d-name').disabled  = locked;
  el('d-notes').value    = task.notes || '';
  el('d-notes').disabled = locked;
  el('m-start').textContent = fmtDate(task.created);
  el('m-end').textContent   = fmtDate(task.completed);

  var noPhotos = !(task.photos && task.photos.length);
  el('photo-req').classList.toggle('show', !locked && noPhotos);
  el('upload-lbl').classList.toggle('hidden', locked);
  el('btn-confirm').style.display = locked ? 'none' : '';
  el('btn-confirm').disabled = noPhotos;
  el('btn-del').style.display = locked ? 'none' : '';

  renderPhotos(task, locked);

  el('home-page').classList.add('hidden');
  el('panel').classList.add('open');
}

function closePanel() {
  render();
  el('panel').classList.remove('open');
  el('home-page').classList.remove('hidden');
  el('home-page').scrollTop = 0;
  activePanelId = null;
}

function renderPhotos(task, locked) {
  var grid = el('photo-grid');
  grid.innerHTML = '';
  (task.photos || []).forEach(function (src, i) {
    var thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    var img = document.createElement('img');
    img.src = src;
    thumb.appendChild(img);
    if (!locked) {
      var rm = document.createElement('button');
      rm.className   = 'photo-rm';
      rm.textContent = '✕';
      rm.addEventListener('click', function () {
        var t = gt(activePanelId);
        if (!t) return;
        t.photos.splice(i, 1);
        saveData();
        renderPhotos(t, false);
        var none = !t.photos.length;
        el('btn-confirm').disabled = none;
        el('photo-req').classList.toggle('show', none);
      });
      thumb.appendChild(rm);
    }
    grid.appendChild(thumb);
  });
}

/* panel event listeners */
el('btn-back').addEventListener('click', function () { closePanel(); });
el('nav-home').addEventListener('click',  function () { closePanel(); });

el('d-name').addEventListener('input', function () {
  var t = gt(activePanelId);
  if (!t || t.locked) return;
  t.text = this.value || t.text;
  saveData(); flashSave();
});

el('d-notes').addEventListener('input', function () {
  var t = gt(activePanelId);
  if (!t || t.locked) return;
  t.notes = this.value;
  saveData(); flashSave();
});

el('d-photo-input').addEventListener('click', function (e) {
  var t = gt(activePanelId);
  if (!t || t.locked) e.preventDefault();
});
el('d-photo-input').addEventListener('change', function (e) {
  var t = gt(activePanelId);
  if (!t || t.locked) return;
  compressAll(Array.from(e.target.files), 1200, 1200, 0.60, function (srcs) {
    t.photos = (t.photos || []).concat(srcs);
    saveData();
    renderPhotos(t, false);
    var none = !t.photos.length;
    el('btn-confirm').disabled = none;
    el('photo-req').classList.toggle('show', none);
  });
  e.target.value = '';
});

el('btn-confirm').addEventListener('click', function () {
  var t = gt(activePanelId);
  if (!t || !t.photos || !t.photos.length) return;
  t.done = true; t.locked = true; t.awaiting = false; t.completed = Date.now();
  saveData();
  openPanel(activePanelId);
});

el('btn-del').addEventListener('click', function () {
  var t = gt(activePanelId);
  if (!t || t.locked) return;
  deleteTask(activePanelId);
  el('panel').classList.remove('open');
  el('home-page').classList.remove('hidden');
  el('home-page').scrollTop = 0;
  activePanelId = null;
});

/* ─────────────────────────────────────────
   RESET
───────────────────────────────────────── */
el('btn-reset').addEventListener('click', function () {
  S.tasks = S.tasks.filter(function (t) { return !t.done; });
  saveData(); render();
});

function checkAutoReset() {
  if (cfg.autoreset === 'off') return;
  var now      = Date.now();
  var interval = cfg.autoreset === 'daily' ? 86400000 : 604800000;
  if (now - cfg.lastReset >= interval) {
    S.tasks = S.tasks.filter(function (t) { return !t.done; });
    saveData(); render();
    cfg.lastReset = now; saveCfg();
  }
}

/* ─────────────────────────────────────────
   COVER IMAGE
───────────────────────────────────────── */
function setCover(src) {
  var img   = el('cov-img');
  var rmBtn = el('btn-rm-cover');
  if (src) {
    img.style.backgroundImage = 'url(' + src + ')';
    img.classList.add('on');
    rmBtn.style.display = '';
  } else {
    img.style.backgroundImage = '';
    img.classList.remove('on');
    rmBtn.style.display = 'none';
  }
}

setCover(S.cover);
el('cover-file').addEventListener('change', function (e) {
  var f = e.target.files[0];
  if (!f) return;
  compressOne(f, 1400, 320, 0.78, function (s) { S.cover = s; saveData(); setCover(s); });
  e.target.value = '';
});
el('btn-rm-cover').addEventListener('click', function () {
  S.cover = null; saveData(); setCover(null);
});

/* ─────────────────────────────────────────
   IMAGE COMPRESSION
───────────────────────────────────────── */
function compressOne(file, mw, mh, quality, cb) {
  var reader = new FileReader();
  reader.onload = function (ev) {
    var img = new Image();
    img.onload = function () {
      var scale  = Math.min(1, mw / img.width, mh / img.height);
      var w      = Math.round(img.width  * scale);
      var h      = Math.round(img.height * scale);
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function compressAll(files, mw, mh, quality, cb) {
  Promise.all(files.map(function (f) {
    return new Promise(function (resolve) { compressOne(f, mw, mh, quality, resolve); });
  })).then(cb);
}

/* ─────────────────────────────────────────
   SETTINGS
───────────────────────────────────────── */
function openSettings() {
  document.querySelectorAll('.swatch').forEach(function (s) {
    s.classList.toggle('active', s.dataset.ac === cfg.theme.ac);
  });
  el('font-select').value    = cfg.font;
  el('size-slider').value    = cfg.size;
  el('size-val').textContent = cfg.size + 'px';
  document.querySelectorAll('#autoreset-opts .opt-chip').forEach(function (c) {
    c.classList.toggle('active', c.dataset.reset === cfg.autoreset);
  });
  initSyncUI();
  el('sm-backdrop').style.display = 'block';
  requestAnimationFrame(function () {
    el('sm-backdrop').classList.add('open');
    el('settings-modal').classList.add('open');
  });
}

function closeSettings() {
  el('sm-backdrop').classList.remove('open');
  el('settings-modal').classList.remove('open');
  setTimeout(function () { el('sm-backdrop').style.display = 'none'; }, 260);
}

el('btn-settings').addEventListener('click', openSettings);
el('btn-sm-close').addEventListener('click', closeSettings);
el('sm-backdrop').addEventListener('click',  closeSettings);

document.querySelectorAll('.swatch').forEach(function (s) {
  s.addEventListener('click', function () {
    cfg.theme = THEMES[s.dataset.ac];
    saveCfg(); applyConfig();
    document.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('active'); });
    s.classList.add('active');
  });
});

el('font-select').addEventListener('change', function () {
  cfg.font = this.value; saveCfg(); applyConfig();
});

el('size-slider').addEventListener('input', function () {
  cfg.size = parseInt(this.value, 10);
  el('size-val').textContent = cfg.size + 'px';
  saveCfg(); applyConfig();
});

document.querySelectorAll('#autoreset-opts .opt-chip').forEach(function (chip) {
  chip.addEventListener('click', function () {
    cfg.autoreset = chip.dataset.reset; saveCfg();
    document.querySelectorAll('#autoreset-opts .opt-chip').forEach(function (c) { c.classList.remove('active'); });
    chip.classList.add('active');
  });
});

/* ─────────────────────────────────────────
   TITLE
───────────────────────────────────────── */
el('sb-title').value        = S.title;
el('mob-title').textContent = S.title;
document.title              = S.title;

el('sb-title').addEventListener('input', function () {
  var val = this.value.trim() || 'my space';
  S.title = val;
  el('mob-title').textContent = val;
  document.title = val;
  saveData();
});

/* ─────────────────────────────────────────
   ADD TASK
───────────────────────────────────────── */
el('btn-add').addEventListener('click', addTask);
el('task-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.isComposing) addTask();
});

/* ─────────────────────────────────────────
   SIDEBAR (desktop drag + mobile hamburger)
───────────────────────────────────────── */
var sidebar   = el('sidebar');
var sbOverlay = el('sb-overlay');

function openSidebar() {
  sidebar.classList.add('open');
  sbOverlay.style.display = 'block';
  requestAnimationFrame(function () { sbOverlay.classList.add('open'); });
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sbOverlay.classList.remove('open');
  setTimeout(function () { sbOverlay.style.display = 'none'; }, 240);
}
function sidebarOpen() { return sidebar.classList.contains('open'); }

el('mob-hamburger').addEventListener('click', function () {
  sidebarOpen() ? closeSidebar() : openSidebar();
});
sbOverlay.addEventListener('click', closeSidebar);

[el('nav-home'), el('btn-reset'), el('btn-settings')].forEach(function (b) {
  b.addEventListener('click', function () {
    if (window.innerWidth <= 680) closeSidebar();
  });
});

/* drag to open/close sidebar */
(function () {
  var EDGE     = 40;
  var O_THRESH = 50;
  var C_THRESH = 50;
  var startX = 0, startY = 0, active = false;

  function gestureStart(x, y) { startX = x; startY = y; active = true; }
  function gestureMove(x, y) {
    if (!active) return;
    var dx = x - startX, dy = y - startY;
    if (Math.abs(dy) > Math.abs(dx) + 12) { active = false; return; }
    if (Math.abs(dx) < 6) return;
    if (!sidebarOpen() && startX <= EDGE && dx > O_THRESH) {
      openSidebar(); active = false;
    } else if (sidebarOpen() && dx < -C_THRESH) {
      closeSidebar(); active = false;
    }
  }
  function gestureEnd() { active = false; }

  document.addEventListener('touchstart', function (e) {
    if (_sc) return;
    gestureStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive:true });
  document.addEventListener('touchmove', function (e) {
    gestureMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive:true });
  document.addEventListener('touchend', gestureEnd, { passive:true });

  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || _sc) return;
    gestureStart(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', function (e) {
    if (_sc) return;
    gestureMove(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', gestureEnd);

  document.addEventListener('keydown', function (e) {
    if (e.key !== '[' || e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    sidebarOpen() ? closeSidebar() : openSidebar();
  });
})();

/* ─────────────────────────────────────────
/* ─────────────────────────────────────────
   SYNC  (GitHub Gist — auto push + 30s pull)
   GitHub PAT + Gist ID saved to localStorage.
   Syncs tasks, title, cover, AND cfg (theme/font/etc).
───────────────────────────────────────── */
var GIST_API      = 'https://api.github.com/gists';
var GIST_FILENAME = 'kohie-data.json';
var syncPushTimer = null;
var syncPollTimer = null;
var syncBusy      = false;

function syncKey()   { return (cfg.syncApiKey || '').replace(/[\u2018\u2019\u201C\u201D\s]/g, ''); }
function syncBin()   { return (cfg.syncId     || '').replace(/[\u2018\u2019\u201C\u201D\s]/g, ''); }
function syncReady() { return !!(syncKey() && syncBin()); }

function syncPayload() {
  var safeCfg = Object.assign({}, cfg);
  delete safeCfg.syncApiKey;
  delete safeCfg.syncId;
  return { kohie: S, cfg: safeCfg, savedAt: Date.now() };
}

function gistHeaders() {
  return {
    'Content-Type':  'application/json',
    'Authorization': 'Bearer ' + syncKey(),
    'Accept':        'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function applySyncData(data) {
  var remote = data.kohie || data;
  if (!remote || !Array.isArray(remote.tasks)) throw new Error('bad');
  S.title = remote.title || S.title;
  S.tasks = remote.tasks;
  if (remote.cover !== undefined) S.cover = remote.cover;
  if (data.cfg) {
    var localKey = cfg.syncApiKey;
    var localBin = cfg.syncId;
    Object.assign(cfg, data.cfg);
    cfg.syncApiKey = localKey;
    cfg.syncId     = localBin;
  }
  saveData(); saveCfg();
  applyConfig(); render();
  setCover(S.cover || null);
  el('sb-title').value        = S.title;
  el('mob-title').textContent = S.title;
  document.title              = S.title;
}

function setSyncMsg(msg, type) {
  var dot = el('sync-dot');
  var txt = el('sync-msg');
  if (!dot || !txt) return;
  txt.textContent = msg;
  txt.className   = 'sync-msg' + (type ? ' ' + type : '');
  dot.className   = 'sync-dot' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : type === 'spin' ? ' spin' : '');
}

function syncPush(silent) {
  if (!syncReady() || syncBusy) return;
  syncBusy = true;
  if (!silent) setSyncMsg('pushing…', 'spin');
  fetch(GIST_API + '/' + syncBin(), {
    method: 'PATCH',
    headers: gistHeaders(),
    body: JSON.stringify({
      files: { 'kohie-data.json': { content: JSON.stringify(syncPayload()) } }
    })
  })
  .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(function () {
    syncBusy = false;
    setSyncMsg('synced ' + new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }), 'ok');
  })
  .catch(function (e) {
    syncBusy = false;
    var msg = String(e);
    if      (msg.indexOf('401') !== -1) setSyncMsg('push failed — invalid token (401)', 'err');
    else if (msg.indexOf('403') !== -1) setSyncMsg('push failed — token needs gist scope (403)', 'err');
    else if (msg.indexOf('404') !== -1) setSyncMsg('push failed — gist not found (404)', 'err');
    else if (msg.indexOf('422') !== -1) setSyncMsg('push failed — invalid data (422)', 'err');
    else setSyncMsg('push failed — check connection', 'err');
  });
}

function syncPull(silent) {
  if (!syncReady() || syncBusy) return;
  syncBusy = true;
  if (!silent) setSyncMsg('pulling…', 'spin');
  fetch(GIST_API + '/' + syncBin(), { headers: gistHeaders() })
  .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(function (gist) {
    syncBusy = false;
    var file = gist.files && gist.files[GIST_FILENAME];
    if (!file || !file.content) throw new Error('missing file');
    var data = JSON.parse(file.content);
    var remoteSaved = data.savedAt || 0;
    var localSaved  = S.lastSaved  || 0;
    if (remoteSaved > localSaved) {
      applySyncData(data);
      if (!silent) setSyncMsg('pulled ' + S.tasks.length + ' tasks ✓', 'ok');
    } else {
      if (!silent) setSyncMsg('already up to date', 'ok');
    }
  })
  .catch(function (e) {
    syncBusy = false;
    var msg = String(e);
    if      (msg.indexOf('404') !== -1) setSyncMsg('gist not found (404)', 'err');
    else if (msg.indexOf('401') !== -1) setSyncMsg('invalid token (401)', 'err');
    else if (!silent)                   setSyncMsg('pull failed — check connection', 'err');
  });
}

/* wrap saveData to auto-push on every change */
var _origSaveData = saveData;
saveData = function () {
  S.lastSaved = Date.now();
  _origSaveData();
  if (syncReady()) {
    clearTimeout(syncPushTimer);
    syncPushTimer = setTimeout(function () { syncPush(true); }, 800);
  }
};

function startSyncPoll() {
  clearInterval(syncPollTimer);
  if (!syncReady()) return;
  syncPollTimer = setInterval(function () { syncPull(true); }, 30000);
}

el('btn-sync-new').addEventListener('click', function () {
  var key = syncKey();
  if (!key) { setSyncMsg('paste your GitHub token first', 'err'); return; }
  setSyncMsg('creating gist…', 'spin');
  fetch(GIST_API, {
    method: 'POST',
    headers: gistHeaders(),
    body: JSON.stringify({
      description: 'kohie task sync',
      public: false,
      files: { 'kohie-data.json': { content: JSON.stringify(syncPayload()) } }
    })
  })
  .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(function (data) {
    if (!data.id) throw new Error('no id');
    cfg.syncId     = data.id;
    cfg.syncApiKey = key;
    saveCfg();
    el('sync-bin').value = cfg.syncId;
    setSyncMsg('private gist created — auto-sync active ✓', 'ok');
    startSyncPoll();
  })
  .catch(function (e) {
    var msg = String(e);
    if      (msg.indexOf('401') !== -1) setSyncMsg('failed — invalid token (401)', 'err');
    else if (msg.indexOf('403') !== -1) setSyncMsg('failed — token needs gist scope (403)', 'err');
    else setSyncMsg('failed — check your token', 'err');
  });
});

el('btn-sync-push').addEventListener('click', function () {
  if (!syncBin()) { setSyncMsg('enter a Gist ID first', 'err'); return; }
  if (!syncKey()) { setSyncMsg('enter your GitHub token first', 'err'); return; }
  syncPush(false);
});

el('btn-sync-pull').addEventListener('click', function () {
  if (!syncBin()) { setSyncMsg('enter a Gist ID first', 'err'); return; }
  if (!syncKey()) { setSyncMsg('enter your GitHub token first', 'err'); return; }
  syncPull(false);
});

el('btn-sync-copy').addEventListener('click', function () {
  var id = syncBin();
  if (!id) { setSyncMsg('no Gist ID to copy', 'err'); return; }
  navigator.clipboard.writeText(id).then(function () {
    setSyncMsg('Gist ID copied ✓', 'ok');
  }).catch(function () {
    el('sync-bin').select();
    document.execCommand('copy');
    setSyncMsg('selected — copy with Ctrl+C / ⌘C', '');
  });
});

el('btn-sync-export').addEventListener('click', function () {
  var a = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([JSON.stringify(syncPayload(), null, 2)], { type: 'application/json' }));
  a.download = (S.title || 'kohie') + '-backup.json';
  a.click();
  setSyncMsg('exported ✓', 'ok');
});

el('btn-sync-import').addEventListener('click', function () { el('sync-file-input').click(); });
el('sync-file-input').addEventListener('change', function (e) {
  var f = e.target.files[0];
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function (ev) {
    try { applySyncData(JSON.parse(ev.target.result)); setSyncMsg('imported ✓', 'ok'); }
    catch (err) { setSyncMsg('invalid file', 'err'); }
  };
  reader.readAsText(f);
  e.target.value = '';
});

el('sync-key').addEventListener('input', function () {
  cfg.syncApiKey = this.value.replace(/[\u2018\u2019\u201C\u201D\s]/g, ''); saveCfg();
  if (syncReady()) { setSyncMsg('auto-sync active', 'ok'); startSyncPoll(); }
});
el('sync-bin').addEventListener('input', function () {
  cfg.syncId = this.value.replace(/[\u2018\u2019\u201C\u201D\s]/g, ''); saveCfg();
  if (syncReady()) { setSyncMsg('auto-sync active', 'ok'); startSyncPoll(); }
});

function initSyncUI() {
  el('sync-key').value = cfg.syncApiKey || '';
  el('sync-bin').value = cfg.syncId     || '';
  setSyncMsg(
    syncReady() ? 'auto-sync active' : 'enter token + gist ID to enable',
    syncReady() ? 'ok' : ''
  );
}


/* ─────────────────────────────────────────
   BOOT
───────────────────────────────────────── */
applyConfig();
checkAutoReset();
render();
startSyncPoll();
if (syncReady()) syncPull(true);

})();
