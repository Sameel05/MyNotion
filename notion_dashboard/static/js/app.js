/* ═══════════════════════════════════════════════
   Notion Dashboard — app.js
   All state is loaded from / saved to Flask API
   ═══════════════════════════════════════════════ */

'use strict';

// ── STATE ────────────────────────────────────────
let currentView    = 'editor';
let sidebarCollapsed = false;
let slashActive    = false;
let slashSelIdx    = 0;
let slashAnchorBlockIdx = -1;
let dragCardId     = null;
let dragFromCol    = null;
let modalCallback  = null;
let plannerDay     = new Date();
let autoSaveTimer  = null;

let editorBlocks = [];
let kanbanData   = {};
let habitData    = [];
let plannerBlocks = [];

// ── API HELPERS ──────────────────────────────────
async function apiGet(endpoint) {
  const res = await fetch(endpoint);
  return res.json();
}

async function apiPost(endpoint, data) {
  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

// ── AUTO-SAVE (debounced 1.5s) ───────────────────
function scheduleSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveCurrentView, 1500);
}

async function saveCurrentView() {
  const map = {
    editor:  ['/api/editor',  editorBlocks],
    planner: ['/api/planner', plannerBlocks],
    kanban:  ['/api/kanban',  kanbanData],
    habits:  ['/api/habits',  habitData],
  };
  const [url, data] = map[currentView];
  await apiPost(url, data);
  showSaveIndicator();
}

async function manualSave() {
  await saveCurrentView();
  showNotif('✓ Saved');
}

function showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  el.textContent = '● Saved';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

// ── VIEW SWITCHING ───────────────────────────────
const VIEW_META = {
  editor:  { title: '📝 Notes Editor',   action: 'New Block'  },
  planner: { title: '📅 Daily Planner',  action: 'Add Event'  },
  kanban:  { title: '📋 Project Board',  action: 'Add Task'   },
  habits:  { title: '🔥 Habit Tracker',  action: 'Add Habit'  },
};

async function switchView(v) {
  // save current before switching
  await saveCurrentView();

  currentView = v;

  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');

  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  document.getElementById('nav-' + v).classList.add('active');

  const meta = VIEW_META[v];
  document.getElementById('topbar-title').textContent  = meta.title;
  document.getElementById('action-label').textContent  = meta.action;

  if (v === 'editor')  { editorBlocks  = await apiGet('/api/editor');  renderEditor(); }
  if (v === 'planner') { plannerBlocks = await apiGet('/api/planner'); renderPlanner(); }
  if (v === 'kanban')  { kanbanData    = await apiGet('/api/kanban');  renderKanban(); }
  if (v === 'habits')  { habitData     = await apiGet('/api/habits');  renderHabits(); }
}

function handleTopAction() {
  if (currentView === 'kanban')  openAddCardModal('todo');
  else if (currentView === 'planner') showNotif('Click a time slot to add an event');
  else if (currentView === 'habits')  openAddHabitModal();
  else addEditorBlock('text');
}

// ── SIDEBAR ──────────────────────────────────────
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  document.getElementById('collapse-text').style.display = sidebarCollapsed ? 'none' : '';
  document.getElementById('collapse-icon').className = sidebarCollapsed
    ? 'ti ti-layout-sidebar-left-expand'
    : 'ti ti-layout-sidebar-left-collapse';
}

// ═══════════════════════════════════════════════
//  NOTES EDITOR
// ═══════════════════════════════════════════════

function renderEditor() {
  const container = document.getElementById('editor-blocks');
  container.innerHTML = '';
  editorBlocks.forEach((block, i) => container.appendChild(buildBlockEl(block, i)));
}

function buildBlockEl(block, i) {
  const wrap = document.createElement('div');
  wrap.className = 'editor-block';
  wrap.dataset.index = i;

  if (block.type === 'divider') {
    wrap.innerHTML = '<div class="block-divider"></div>';
    return wrap;
  }

  if (block.type === 'check') {
    const row = document.createElement('div');
    row.className = 'checklist-row';

    const box = document.createElement('div');
    box.className = 'check-box' + (block.done ? ' checked' : '');
    box.addEventListener('click', () => {
      block.done = !block.done;
      box.classList.toggle('checked', block.done);
      inp.classList.toggle('done', block.done);
      scheduleSave();
    });

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'check-text' + (block.done ? ' done' : '');
    inp.value = block.content;
    inp.addEventListener('input', e => { block.content = e.target.value; scheduleSave(); });
    inp.addEventListener('keydown', e => handleBlockKey(e, i));

    row.appendChild(box);
    row.appendChild(inp);
    wrap.appendChild(row);
    return wrap;
  }

  const isTA = block.type === 'text';
  const el   = document.createElement(isTA ? 'textarea' : 'input');
  el.className = 'editor-block-content ' + (isTA ? '' : block.type);
  el.value     = block.content;

  if (isTA) {
    el.rows = 1;
    el.style.overflow = 'hidden';
    const resize = () => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };
    el.addEventListener('input', () => { resize(); block.content = el.value; scheduleSave(); });
    setTimeout(resize, 0);
  } else {
    el.addEventListener('input', () => { block.content = el.value; scheduleSave(); });
  }

  el.addEventListener('keydown', e => handleBlockKey(e, i));
  el.addEventListener('input',   e => checkSlashTrigger(el, i));
  wrap.appendChild(el);
  return wrap;
}

function handleBlockKey(e, i) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    hideSlash();
    addEditorBlock('text', i + 1);
    setTimeout(() => focusBlock(i + 1), 10);
  }
  if (e.key === 'Backspace') {
    const block = editorBlocks[i];
    if (!block.content && editorBlocks.length > 1) {
      e.preventDefault();
      hideSlash();
      editorBlocks.splice(i, 1);
      renderEditor();
      scheduleSave();
      setTimeout(() => focusBlock(Math.max(0, i - 1)), 10);
    }
  }
  if (e.key === 'Escape') hideSlash();
}

function focusBlock(idx) {
  const blocks = document.querySelectorAll('.editor-block');
  const target = blocks[idx];
  if (!target) return;
  const inp = target.querySelector('input[type=text], textarea');
  if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
}

function addEditorBlock(type, index) {
  const block = { type, content: '', done: false };
  if (index !== undefined) editorBlocks.splice(index, 0, block);
  else editorBlocks.push(block);
  renderEditor();
  scheduleSave();
}

// ── SLASH COMMAND ────────────────────────────────
const SLASH_CMDS = [
  { icon: 'H1', label: 'Heading 1',  desc: 'Large section header',   type: 'h1'      },
  { icon: 'H2', label: 'Heading 2',  desc: 'Medium section header',   type: 'h2'      },
  { icon: 'H3', label: 'Heading 3',  desc: 'Small section header',    type: 'h3'      },
  { icon: '✓',  label: 'To-do',      desc: 'Track with a checkbox',   type: 'check'   },
  { icon: '—',  label: 'Divider',    desc: 'Visual separator',        type: 'divider' },
  { icon: '¶',  label: 'Paragraph',  desc: 'Plain text block',        type: 'text'    },
];

function checkSlashTrigger(el, blockIdx) {
  if (el.value === '/') {
    slashAnchorBlockIdx = blockIdx;
    showSlash(el);
  } else if (!el.value.startsWith('/')) {
    hideSlash();
  }
}

function showSlash(anchorEl) {
  const menu = document.getElementById('slash-menu');
  const rect = anchorEl.getBoundingClientRect();
  menu.style.display = 'block';
  menu.style.left    = rect.left + 'px';
  menu.style.top     = (rect.bottom + 6) + 'px';
  slashActive  = true;
  slashSelIdx  = 0;
  renderSlashMenu();
  document.addEventListener('keydown', slashNav);
}

function hideSlash() {
  document.getElementById('slash-menu').style.display = 'none';
  slashActive = false;
  document.removeEventListener('keydown', slashNav);
}

function renderSlashMenu() {
  const menu = document.getElementById('slash-menu');
  menu.innerHTML = '<div class="slash-menu-header">Basic blocks</div>' +
    SLASH_CMDS.map((cmd, i) => `
      <div class="slash-item ${i === slashSelIdx ? 'selected' : ''}" onclick="insertSlashBlock('${cmd.type}')">
        <div class="slash-item-icon">${cmd.icon}</div>
        <div>
          <div class="slash-item-label">${cmd.label}</div>
          <div class="slash-item-desc">${cmd.desc}</div>
        </div>
      </div>`
    ).join('');
}

function slashNav(e) {
  if (!slashActive) return;
  if (e.key === 'ArrowDown')  { slashSelIdx = Math.min(slashSelIdx + 1, SLASH_CMDS.length - 1); renderSlashMenu(); e.preventDefault(); }
  if (e.key === 'ArrowUp')    { slashSelIdx = Math.max(slashSelIdx - 1, 0);                      renderSlashMenu(); e.preventDefault(); }
  if (e.key === 'Enter')      { insertSlashBlock(SLASH_CMDS[slashSelIdx].type); e.preventDefault(); }
  if (e.key === 'Escape')     { hideSlash(); }
}

function insertSlashBlock(type) {
  hideSlash();
  const idx = slashAnchorBlockIdx >= 0 ? slashAnchorBlockIdx : editorBlocks.length - 1;
  editorBlocks[idx] = { type, content: '', done: false };
  renderEditor();
  scheduleSave();
  setTimeout(() => focusBlock(idx), 10);
  showNotif('Block: ' + type);
}

// ═══════════════════════════════════════════════
//  DAILY PLANNER
// ═══════════════════════════════════════════════

function renderPlanner() {
  document.getElementById('planner-date').textContent =
    plannerDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const grid = document.getElementById('time-grid');
  grid.innerHTML = '';
  const nowHour = new Date().getHours();

  for (let h = 7; h <= 21; h++) {
    const row = document.createElement('div');
    row.className = 'time-row';

    const label = document.createElement('div');
    label.className = 'time-label';
    if (h === 12)      label.textContent = '12:00 PM';
    else if (h < 12)   label.textContent = `${h}:00 AM`;
    else               label.textContent = `${h - 12}:00 PM`;

    const slot = document.createElement('div');
    slot.className = 'time-slot' + (h === nowHour ? ' current-hour' : '');
    slot.addEventListener('click', () => openPlannerModal(h));

    const block = plannerBlocks.find(b => b.hour === h);
    if (block) {
      slot.innerHTML = `
        <div class="time-block ${block.color || ''}">
          <div class="time-block-title">${block.title}</div>
          ${block.attendees
            ? `<div class="time-block-meta"><i class="ti ti-users"></i>${block.attendees}</div>`
            : ''}
        </div>`;
      // right-click to delete
      slot.querySelector('.time-block').addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        plannerBlocks = plannerBlocks.filter(b => b.hour !== h);
        renderPlanner();
        scheduleSave();
        showNotif('Event removed');
      });
    }

    row.appendChild(label);
    row.appendChild(slot);
    grid.appendChild(row);
  }
}

function changeDay(delta, toToday = false) {
  if (toToday) plannerDay = new Date();
  else         plannerDay.setDate(plannerDay.getDate() + delta);
  renderPlanner();
}

function openPlannerModal(hour) {
  const fmt = h => h === 12 ? '12:00 PM' : h < 12 ? `${h}:00 AM` : `${h-12}:00 PM`;
  document.getElementById('modal-title').textContent = `Add event at ${fmt(hour)}`;
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-field">
      <div class="modal-label">Event title</div>
      <input class="modal-input" id="ev-title" placeholder="Meeting, task, break…" />
    </div>
    <div class="modal-field">
      <div class="modal-label">Attendees / notes</div>
      <input class="modal-input" id="ev-attendees" placeholder="Optional" />
    </div>
    <div class="modal-field">
      <div class="modal-label">Colour</div>
      <select class="modal-input" id="ev-color">
        <option value="">Purple (default)</option>
        <option value="green">Green</option>
        <option value="amber">Amber</option>
        <option value="blue">Blue</option>
        <option value="red">Red</option>
      </select>
    </div>`;
  modalCallback = () => {
    const title = document.getElementById('ev-title').value.trim();
    if (!title) return;
    const attendees = document.getElementById('ev-attendees').value.trim();
    const color     = document.getElementById('ev-color').value;
    const idx = plannerBlocks.findIndex(b => b.hour === hour);
    const entry = { hour, title, color, attendees };
    if (idx >= 0) plannerBlocks[idx] = entry;
    else          plannerBlocks.push(entry);
    scheduleSave();
    renderPlanner();
    showNotif('Event saved');
    closeModal();
  };
  document.getElementById('modal').style.display = 'flex';
  setTimeout(() => document.getElementById('ev-title')?.focus(), 80);
}

// ═══════════════════════════════════════════════
//  KANBAN BOARD
// ═══════════════════════════════════════════════

const TAG_COLORS = {
  Research: 'purple', Docs: 'blue', High: 'red', Design: 'blue',
  Dev: 'teal', Backend: 'purple', Infra: 'amber', Meeting: 'amber',
  Bug: 'red', Feature: 'green', Review: 'blue',
};

function renderKanban() {
  const board = document.getElementById('kanban-board');
  board.innerHTML = '';

  Object.entries(kanbanData).forEach(([colKey, col]) => {
    const colEl = document.createElement('div');
    colEl.className = 'kanban-col';
    colEl.innerHTML = `
      <div class="kanban-col-header">
        <div class="kanban-col-dot" style="background:${col.color}"></div>
        <span class="kanban-col-title">${col.title}</span>
        <span class="kanban-col-count">${col.items.length}</span>
      </div>
      <div class="kanban-col-drop" id="drop-${colKey}"></div>
      <button class="add-card-btn" onclick="openAddCardModal('${colKey}')">
        <i class="ti ti-plus" style="font-size:13px"></i> Add card
      </button>`;

    const drop = colEl.querySelector('.kanban-col-drop');
    drop.addEventListener('dragover',   e => onDragOver(e, colKey));
    drop.addEventListener('drop',       e => onDrop(e, colKey));
    drop.addEventListener('dragleave',  () => drop.classList.remove('drag-active'));

    col.items.forEach(card => drop.appendChild(buildCardEl(card, colKey)));
    board.appendChild(colEl);
  });
}

function buildCardEl(card, colKey) {
  const el = document.createElement('div');
  el.className = 'kanban-card';
  el.id        = 'card-' + card.id;
  el.draggable = true;

  el.innerHTML = `
    <div class="card-title">${card.title}</div>
    <div class="card-tags">
      ${card.tags.map(t => `<span class="tag ${TAG_COLORS[t] || 'purple'}">${t}</span>`).join('')}
    </div>
    <div class="card-meta">
      <div class="date-picker-wrapper">
        <div class="date-chip" id="chip-${card.id}">
          <i class="ti ti-calendar" style="font-size:11px"></i>
          ${card.date || 'Set date'}
        </div>
        <div class="date-dropdown" id="dp-${card.id}" style="display:none">
          <label>Due date</label>
          <input type="date" id="dpd-${card.id}" />
          <label>Time</label>
          <input type="time" id="dpt-${card.id}" />
          <button class="btn" style="width:100%;margin-top:4px" onclick="applyDate(${card.id},'${colKey}')">Apply</button>
        </div>
      </div>
      <div class="card-avatar" style="background:${card.color}">${card.assignee}</div>
    </div>`;

  el.querySelector('#chip-' + card.id).addEventListener('click', e => {
    e.stopPropagation();
    toggleDatePicker('dp-' + card.id);
  });

  el.addEventListener('dragstart', e => onDragStart(e, card.id, colKey));
  el.addEventListener('dragend',   onDragEnd);

  // right-click to delete
  el.addEventListener('contextmenu', e => {
    e.preventDefault();
    kanbanData[colKey].items = kanbanData[colKey].items.filter(c => c.id !== card.id);
    renderKanban();
    scheduleSave();
    showNotif('Card deleted');
  });

  return el;
}

function toggleDatePicker(id) {
  const dp = document.getElementById(id);
  const vis = dp.style.display !== 'none';
  document.querySelectorAll('.date-dropdown').forEach(d => d.style.display = 'none');
  dp.style.display = vis ? 'none' : 'block';
}

function applyDate(cardId, colKey) {
  const d = document.getElementById('dpd-' + cardId).value;
  const t = document.getElementById('dpt-' + cardId).value;
  const card = kanbanData[colKey].items.find(c => c.id == cardId);
  if (card && d) {
    const dt = new Date(d);
    card.date = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (t) card.date += ' ' + t;
    renderKanban();
    scheduleSave();
  }
}

// close date pickers on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.date-picker-wrapper')) {
    document.querySelectorAll('.date-dropdown').forEach(d => d.style.display = 'none');
  }
});

// drag & drop
function onDragStart(e, cardId, fromCol) {
  dragCardId  = cardId;
  dragFromCol = fromCol;
  setTimeout(() => document.getElementById('card-' + cardId)?.classList.add('dragging'), 0);
}
function onDragEnd() {
  document.querySelectorAll('.kanban-card').forEach(c => c.classList.remove('dragging'));
  document.querySelectorAll('.kanban-col-drop').forEach(c => c.classList.remove('drag-active'));
}
function onDragOver(e, colKey) {
  e.preventDefault();
  document.querySelectorAll('.kanban-col-drop').forEach(c => c.classList.remove('drag-active'));
  document.getElementById('drop-' + colKey)?.classList.add('drag-active');
}
function onDrop(e, toCol) {
  e.preventDefault();
  if (!dragCardId || toCol === dragFromCol) { onDragEnd(); return; }

  const fromItems = kanbanData[dragFromCol].items;
  const idx = fromItems.findIndex(c => c.id == dragCardId);
  if (idx === -1) return;

  const [card] = fromItems.splice(idx, 1);
  kanbanData[toCol].items.push(card);
  renderKanban();
  scheduleSave();
  showNotif(`Moved to "${kanbanData[toCol].title}"`);
  dragCardId = null; dragFromCol = null;
}

function openAddCardModal(colKey) {
  document.getElementById('modal-title').textContent = `Add task → ${kanbanData[colKey].title}`;
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-field">
      <div class="modal-label">Task title</div>
      <input class="modal-input" id="nc-title" placeholder="What needs to be done?" />
    </div>
    <div class="modal-field">
      <div class="modal-label">Tag</div>
      <select class="modal-input" id="nc-tag">
        <option>Dev</option><option>Design</option><option>Docs</option>
        <option>Research</option><option>Infra</option><option>Meeting</option>
        <option>Feature</option><option>Bug</option><option>Review</option>
      </select>
    </div>
    <div class="modal-field">
      <div class="modal-label">Due date</div>
      <input type="date" class="modal-input" id="nc-date" />
    </div>
    <div class="modal-field">
      <div class="modal-label">Assignee initial</div>
      <input class="modal-input" id="nc-assign" maxlength="2" placeholder="e.g. A" style="width:80px" />
    </div>`;

  modalCallback = () => {
    const title = document.getElementById('nc-title').value.trim();
    if (!title) { showNotif('Enter a title'); return; }
    const tag    = document.getElementById('nc-tag').value;
    const rawD   = document.getElementById('nc-date').value;
    const assign = (document.getElementById('nc-assign').value.trim() || 'Me').toUpperCase();
    const date   = rawD
      ? new Date(rawD).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'TBD';
    const AVCOLORS = ['#7c6af7','#f87171','#60a5fa','#4ade80','#fbbf24','#2dd4bf'];
    kanbanData[colKey].items.push({
      id: Date.now(), title, tags: [tag], date, assignee: assign,
      color: AVCOLORS[Math.floor(Math.random() * AVCOLORS.length)]
    });
    renderKanban();
    scheduleSave();
    showNotif('Task added');
    closeModal();
  };

  document.getElementById('modal').style.display = 'flex';
  setTimeout(() => document.getElementById('nc-title')?.focus(), 80);
}

// ═══════════════════════════════════════════════
//  HABIT TRACKER
// ═══════════════════════════════════════════════

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function renderHabits() {
  const grid = document.getElementById('habit-grid');
  grid.innerHTML = '';

  habitData.forEach((habit, hi) => {
    const done = habit.days.filter(Boolean).length;
    const pct  = Math.round((done / 7) * 100);

    const row = document.createElement('div');
    row.className = 'habit-row';
    row.innerHTML = `
      <div class="habit-name">
        <i class="ti ${habit.icon}" style="color:${habit.color}"></i>
        ${habit.name}
      </div>
      <div class="habit-days">
        ${habit.days.map((d, di) => `
          <div class="habit-day ${d ? 'done' : ''}"
               style="${d ? `background:${habit.color}18;border-color:${habit.color}` : ''}"
               onclick="toggleHabit(${hi},${di})">
            ${d
              ? `<i class="ti ti-check" style="color:${habit.color}"></i>`
              : `<span style="font-size:9px;color:var(--text3)">${DAY_LABELS[di].slice(0,1)}</span>`}
          </div>`).join('')}
      </div>
      <div class="habit-streak"><i class="ti ti-flame"></i>${habit.streak}d</div>
      <div class="habit-pct">${pct}%</div>`;
    grid.appendChild(row);
  });
}

function toggleHabit(hi, di) {
  habitData[hi].days[di] = habitData[hi].days[di] ? 0 : 1;
  // recalculate streak (consecutive from today backwards)
  const days = habitData[hi].days;
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i]) streak++; else break;
  }
  habitData[hi].streak = streak;
  scheduleSave();
  renderHabits();
}

function openAddHabitModal() {
  document.getElementById('modal-title').textContent = 'Add New Habit';
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-field">
      <div class="modal-label">Habit name</div>
      <input class="modal-input" id="nh-name" placeholder="e.g. Drink Water" />
    </div>
    <div class="modal-field">
      <div class="modal-label">Icon (Tabler name, e.g. ti-droplet)</div>
      <input class="modal-input" id="nh-icon" placeholder="ti-star" />
    </div>
    <div class="modal-field">
      <div class="modal-label">Colour</div>
      <select class="modal-input" id="nh-color">
        <option value="#a89cf5">Purple</option>
        <option value="#4ade80">Green</option>
        <option value="#60a5fa">Blue</option>
        <option value="#fbbf24">Amber</option>
        <option value="#2dd4bf">Teal</option>
        <option value="#f87171">Red</option>
      </select>
    </div>`;
  modalCallback = () => {
    const name  = document.getElementById('nh-name').value.trim();
    if (!name) { showNotif('Enter a name'); return; }
    const icon  = document.getElementById('nh-icon').value.trim() || 'ti-star';
    const color = document.getElementById('nh-color').value;
    habitData.push({ name, icon, color, days: [0,0,0,0,0,0,0], streak: 0 });
    renderHabits();
    scheduleSave();
    showNotif('Habit added!');
    closeModal();
  };
  document.getElementById('modal').style.display = 'flex';
  setTimeout(() => document.getElementById('nh-name')?.focus(), 80);
}

// ═══════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal')) return;
  document.getElementById('modal').style.display = 'none';
  modalCallback = null;
}
function confirmModal() { if (modalCallback) modalCallback(); }

// keyboard shortcut to close modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('modal').style.display !== 'none') {
    closeModal();
  }
});

// ═══════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════

function showNotif(msg) {
  const n = document.createElement('div');
  n.className = 'notif';
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.style.opacity = '0', 1800);
  setTimeout(() => n.remove(), 2200);
}

// ═══════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════

(async function init() {
  editorBlocks  = await apiGet('/api/editor');
  plannerBlocks = await apiGet('/api/planner');
  plannerDay    = new Date();
  renderEditor();
})();
