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
if (!cfg.city) cfg.city = '';
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
el('nav-home').addEventListener('click', function () {
  closePanel();
  showPage('home');
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
  el('nav-home').classList.add('active');
});

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
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 300) + 'px';
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
  initWeatherCityUI();
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
   PAGE NAVIGATION
───────────────────────────────────────── */
function showPage(page) {
  var contentRow = el('content-row');
  var calPage    = el('cal-page');
  var panel      = el('panel');
  if (page === 'home') {
    if (contentRow) contentRow.style.display = '';
    if (calPage)    calPage.classList.add('hidden');
    if (panel)      panel.classList.remove('open');
    el('home-page').classList.remove('hidden');
  } else if (page === 'calendar') {
    if (contentRow) contentRow.style.display = '';
    el('home-page').classList.add('hidden');
    if (calPage)    calPage.classList.remove('hidden');
    if (panel)      panel.classList.remove('open');
    renderCalendar();
  }
}

el('nav-calendar').addEventListener('click', function () {
  showPage('calendar');
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
  el('nav-calendar').classList.add('active');
  if (window.innerWidth <= 680) closeSidebar();
});

/* ─────────────────────────────────────────
   CALENDAR
───────────────────────────────────────── */
var calYear  = new Date().getFullYear();
var calMonth = new Date().getMonth();

function renderCalendar() {
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  el('cal-title').textContent = MONTHS[calMonth] + ' ' + calYear;

  var first   = new Date(calYear, calMonth, 1).getDay();
  var daysIn  = new Date(calYear, calMonth + 1, 0).getDate();
  var today   = new Date();
  var grid    = el('cal-grid');
  grid.innerHTML = '';

  // task dates set for dot indicators
  var taskDates = {};
  S.tasks.forEach(function(t) {
    var d = new Date(t.created);
    if (d.getFullYear() === calYear && d.getMonth() === calMonth)
      taskDates[d.getDate()] = true;
  });

  // prev month filler
  var prevDays = new Date(calYear, calMonth, 0).getDate();
  for (var i = first - 1; i >= 0; i--) {
    var d = document.createElement('div');
    d.className = 'cal-day other-month';
    d.textContent = prevDays - i;
    grid.appendChild(d);
  }
  // current month
  for (var day = 1; day <= daysIn; day++) {
    var d = document.createElement('div');
    d.className = 'cal-day';
    if (day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear())
      d.classList.add('today');
    if (taskDates[day]) d.classList.add('has-task');
    d.textContent = day;
    grid.appendChild(d);
  }
  // next month filler
  var total = grid.children.length;
  var remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (var n = 1; n <= remaining; n++) {
    var d = document.createElement('div');
    d.className = 'cal-day other-month';
    d.textContent = n;
    grid.appendChild(d);
  }
}

el('cal-prev').addEventListener('click', function () {
  calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
el('cal-next').addEventListener('click', function () {
  calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

/* ─────────────────────────────────────────
   DATE WIDGET
───────────────────────────────────────── */
function updateDateWidget() {
  var DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var now    = new Date();
  el('wg-day').textContent     = DAYS[now.getDay()];
  el('wg-datenum').textContent = now.getDate();
  el('wg-month').textContent   = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
}

/* ─────────────────────────────────────────
   PIXEL WEATHER CANVAS
───────────────────────────────────────── */
var weatherAnimFrame = null;
var weatherState     = { type: 'clear-day', particles: [] };

function initParticles(type) {
  var particles = [];
  if (type === 'rain' || type === 'drizzle') {
    for (var i = 0; i < 18; i++) {
      particles.push({ x: Math.random() * 160, y: Math.random() * 100, speed: 1.5 + Math.random() * 2, len: 4 + Math.random() * 4 });
    }
  } else if (type === 'snow') {
    for (var i = 0; i < 14; i++) {
      particles.push({ x: Math.random() * 160, y: Math.random() * 100, speed: 0.4 + Math.random() * 0.6, drift: (Math.random() - 0.5) * 0.4 });
    }
  } else if (type === 'clear-night') {
    for (var i = 0; i < 12; i++) {
      particles.push({ x: 10 + Math.random() * 140, y: 8 + Math.random() * 40, twinkle: Math.random() * Math.PI * 2, size: Math.random() > 0.7 ? 2 : 1 });
    }
  }
  return particles;
}

function drawPixelCloud(ctx, x, y, w, h, col) {
  ctx.fillStyle = col;
  // simple pixel cloud shape
  var px = Math.round(w / 16);
  var shape = [
    [0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0],
    [1,1,1,1,0,0,1,1,1,0,0,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  ];
  shape.forEach(function(row, ry) {
    row.forEach(function(cell, rx) {
      if (cell) ctx.fillRect(x + rx * px, y + ry * px, px, px);
    });
  });
}

function drawPixelSun(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  for (var dy = -r; dy <= r; dy++) {
    for (var dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }
  // rays
  var rays = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  rays.forEach(function(ray) {
    for (var i = r + 2; i <= r + 6; i++) {
      ctx.fillRect(x + ray[0] * i, y + ray[1] * i, 1, 1);
    }
  });
}

function drawPixelMoon(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  for (var dy = -r; dy <= r; dy++) {
    for (var dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        var ox = dx + Math.round(r * 0.4), oy = dy - Math.round(r * 0.2);
        if (ox * ox + oy * oy > (r * 0.75) * (r * 0.75)) ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  }
}

function animateWeather() {
  var canvas = el('weather-canvas');
  if (!canvas) return;
  var ctx  = canvas.getContext('2d');
  var W    = canvas.width, H = canvas.height;
  var type = weatherState.type;
  var p    = weatherState.particles;
  var ac   = getComputedStyle(document.documentElement).getPropertyValue('--ac').trim() || '#c9a87c';
  var t2   = getComputedStyle(document.documentElement).getPropertyValue('--t2').trim() || '#9a8e7e';
  var t3   = getComputedStyle(document.documentElement).getPropertyValue('--t3').trim() || '#5c5347';
  var surf = getComputedStyle(document.documentElement).getPropertyValue('--surf').trim() || '#171510';

  ctx.clearRect(0, 0, W, H);

  if (type === 'clear-day') {
    drawPixelSun(ctx, W/2, H/2 - 8, 14, ac);
    drawPixelCloud(ctx, 60, H - 28, W - 60, 20, t3 + '88');

  } else if (type === 'clear-night') {
    drawPixelMoon(ctx, W/2 - 10, H/2 - 10, 13, t2);
    p.forEach(function(star) {
      star.twinkle += 0.04;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(star.twinkle));
      ctx.fillStyle = '#fff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1;

  } else if (type === 'cloudy' || type === 'fog') {
    drawPixelCloud(ctx, 10, 18, 100, 34, t2);
    drawPixelCloud(ctx, 55, 36, 90, 30, t3);

  } else if (type === 'partly-cloudy-day') {
    drawPixelSun(ctx, 30, 28, 11, ac);
    drawPixelCloud(ctx, 40, 22, 110, 36, t2);

  } else if (type === 'partly-cloudy-night') {
    drawPixelMoon(ctx, 28, 26, 11, t2);
    drawPixelCloud(ctx, 38, 24, 110, 36, t3);

  } else if (type === 'rain' || type === 'drizzle') {
    drawPixelCloud(ctx, 10, 8, W - 10, 30, t2);
    ctx.fillStyle = '#7aafc8';
    p.forEach(function(drop) {
      drop.y += drop.speed;
      if (drop.y > H) drop.y = -drop.len;
      ctx.fillRect(Math.round(drop.x), Math.round(drop.y), 1, drop.len);
    });

  } else if (type === 'snow') {
    drawPixelCloud(ctx, 10, 8, W - 10, 30, t2);
    ctx.fillStyle = '#c8e0f0';
    p.forEach(function(flake) {
      flake.y += flake.speed;
      flake.x += flake.drift;
      if (flake.y > H) { flake.y = -4; flake.x = Math.random() * W; }
      ctx.fillRect(Math.round(flake.x), Math.round(flake.y), 2, 2);
    });

  } else if (type === 'thunder') {
    drawPixelCloud(ctx, 10, 8, W - 10, 30, t3);
    // lightning bolt pixel art
    ctx.fillStyle = ac;
    [[W/2+2,38],[W/2,44],[W/2+4,44],[W/2,56]].forEach(function(pt,i,arr) {
      if (i < arr.length-1) {
        ctx.fillRect(pt[0], pt[1], 2, arr[i+1][1] - pt[1]);
      }
    });
  }

  weatherAnimFrame = requestAnimationFrame(animateWeather);
}

function weatherTypeFromCode(code, isDay) {
  if (code === 0) return isDay ? 'clear-day' : 'clear-night';
  if (code <= 2)  return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
  if (code <= 3)  return 'cloudy';
  if (code <= 49) return 'fog';
  if (code <= 57) return 'drizzle';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain';
  if (code <= 86) return 'snow';
  return 'thunder';
}

function weatherDescFromCode(code) {
  if (code === 0)  return 'clear sky';
  if (code <= 2)   return 'partly cloudy';
  if (code <= 3)   return 'overcast';
  if (code <= 49)  return 'foggy';
  if (code <= 57)  return 'drizzle';
  if (code <= 67)  return 'rain';
  if (code <= 77)  return 'snow';
  if (code <= 82)  return 'showers';
  if (code <= 86)  return 'heavy snow';
  return 'thunderstorm';
}

function fetchWeather() {
  var city = (cfg.city || '').trim();
  if (!city) {
    el('wg-temp').textContent = '--°';
    el('wg-desc').textContent = 'set city in settings';
    weatherState.type = 'clear-day';
    weatherState.particles = [];
    return;
  }
  // geocode city
  fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=1&language=en&format=json')
  .then(function(r){ return r.json(); })
  .then(function(geo) {
    if (!geo.results || !geo.results[0]) { el('wg-desc').textContent = 'city not found'; return; }
    var lat = geo.results[0].latitude, lon = geo.results[0].longitude;
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code,is_day&temperature_unit=celsius');
  })
  .then(function(r){ return r && r.json(); })
  .then(function(data) {
    if (!data || !data.current) return;
    var cur    = data.current;
    var temp   = Math.round(cur.temperature_2m);
    var code   = cur.weather_code;
    var isDay  = cur.is_day === 1;
    var type   = weatherTypeFromCode(code, isDay);
    el('wg-temp').textContent = temp + '°C';
    el('wg-desc').textContent = weatherDescFromCode(code);
    weatherState.type      = type;
    weatherState.particles = initParticles(type);
  })
  .catch(function() { el('wg-desc').textContent = 'weather unavailable'; });
}

/* ─────────────────────────────────────────
   CITY SETTING
───────────────────────────────────────── */
el('weather-city').addEventListener('input', function () {
  cfg.city = this.value; saveCfg();
});
el('weather-city').addEventListener('change', function () {
  fetchWeather();
});

function initWeatherCityUI() {
  el('weather-city').value = cfg.city || '';
}

/* ─────────────────────────────────────────
   BOOT
───────────────────────────────────────── */
applyConfig();
checkAutoReset();
render();
startSyncPoll();
if (syncReady()) syncPull(true);
updateDateWidget();
setInterval(updateDateWidget, 60000);
fetchWeather();
setInterval(fetchWeather, 600000);
animateWeather();

})();
