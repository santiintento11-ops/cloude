/* Sin Excusas — app de disciplina personal.
   Todo se guarda en el teléfono (localStorage). Sin frameworks. */
(function () {
  'use strict';

  /* ================= Utilidades ================= */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pct = (x) => (x == null ? '—' : Math.round(x * 100) + '%');
  const clamp01 = (x) => Math.max(0, Math.min(1, x || 0));
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const hmToMin = (hm) => { const [h, m] = String(hm || '0:0').split(':').map(Number); return h * 60 + m; };
  const minToHm = (m) => pad(Math.floor((((m % 1440) + 1440) % 1440) / 60)) + ':' + pad(((m % 60) + 60) % 60);

  // Iconos vectoriales (js/icons.js)
  const ic = (name, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(window.ICONS || {})[name] || ''}</svg>`;
  const medal = (name, tone, size) => `<span class="medal ${tone || 'fire'}${size ? ' ' + size : ''}">${ic(name)}</span>`;

  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const DIAS_LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const dkey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
  const today = () => dkey();
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const weekStart = (k) => { const d = parseKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dkey(d); };
  const weekday = (k) => parseKey(k).getDay();
  const fmtLong = (k) => { const d = parseKey(k); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; };
  const fmtShort = (k) => { const d = parseKey(k); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const reviewDay = () => (new Date().getHours() < 4 ? addDays(today(), -1) : today());

  /* ================= Constantes ================= */
  const CATS = {
    salud: { label: 'Salud', icon: 'heart-pulse', tone: 'red' },
    trabajo: { label: 'Trabajo', icon: 'briefcase', tone: 'blue' },
    estudio: { label: 'Estudio', icon: 'book-open', tone: 'purple' },
    dinero: { label: 'Dinero', icon: 'circle-dollar-sign', tone: 'green' },
    personal: { label: 'Personal', icon: 'user', tone: 'gold' }
  };
  const SLOTS = {
    manana: { label: 'Mañana', icon: 'sunrise', tone: 'gold', hint: 'Hasta las 12:00' },
    tarde: { label: 'Tarde', icon: 'sun', tone: 'fire', hint: '12:00 a 19:00' },
    noche: { label: 'Noche', icon: 'moon', tone: 'blue', hint: 'Desde las 19:00' },
    libre: { label: 'Cuando sea', icon: 'clock', tone: 'teal', hint: 'Cualquier momento del día' }
  };
  const SLOT_ORDER = ['manana', 'tarde', 'noche', 'libre'];
  const PRIOS = { 3: 'Alta', 2: 'Media', 1: 'Baja' };

  const PLANTILLAS = [
    { title: 'Hacer ejercicio 30 min', mini: 'Hacer 1 flexión', cat: 'salud', time: '07:00', prio: 3, slot: 'manana' },
    { title: 'Leer 20 minutos', mini: 'Leer 1 página', cat: 'estudio', time: '21:00', prio: 2, slot: 'noche' },
    { title: 'Tomar 2 litros de agua', mini: 'Tomar un vaso de agua', cat: 'salud', time: '', prio: 2, slot: 'libre' },
    { title: 'Trabajo profundo 1 hora', mini: 'Abrir la tarea y trabajar 2 minutos', cat: 'trabajo', time: '09:00', prio: 3, slot: 'manana' },
    { title: 'Estudiar 45 minutos', mini: 'Abrir el libro y leer un párrafo', cat: 'estudio', time: '18:00', prio: 3, slot: 'tarde' },
    { title: 'Anotar mis gastos del día', mini: 'Anotar el último gasto', cat: 'dinero', time: '20:30', prio: 2, slot: 'noche' },
    { title: 'Sin redes antes de las 10:00', mini: 'No abrir redes los primeros 10 min', cat: 'personal', time: '', prio: 2, slot: 'manana' },
    { title: 'Dormir antes de las 23:00', mini: 'Dejar el celular fuera de la cama', cat: 'salud', time: '22:30', prio: 2, slot: 'noche' },
    { title: 'Ordenar mi cuarto 10 min', mini: 'Guardar 1 cosa en su lugar', cat: 'personal', time: '', prio: 1, slot: 'tarde' },
    { title: 'Meditar 10 minutos', mini: '3 respiraciones profundas', cat: 'personal', time: '07:15', prio: 1, slot: 'manana' }
  ];

  // Hábitos que repiten las personas que construyen riqueza.
  const PLANTILLAS_RIQUEZA = [
    { title: 'Levantarme a las 6:00', mini: 'Levantarme sin posponer la alarma', cat: 'personal', time: '06:00', prio: 3, slot: 'manana' },
    { title: 'Escribir mis 3 metas del día', mini: 'Escribir 1 meta', cat: 'personal', time: '06:15', prio: 2, slot: 'manana' },
    { title: 'Sin celular la primera hora', mini: 'Sin celular los primeros 10 min', cat: 'personal', time: '', prio: 2, slot: 'manana' },
    { title: 'Ahorrar antes de gastar', mini: 'Pasar $1 a mi ahorro', cat: 'dinero', time: '', prio: 3, slot: 'manana' },
    { title: 'Trabajar 1 hora en mi negocio', mini: 'Trabajar 2 minutos en el proyecto', cat: 'trabajo', time: '15:00', prio: 3, slot: 'tarde' },
    { title: 'Aprender una habilidad que paga', mini: 'Ver 1 video o leer 1 página', cat: 'estudio', time: '18:00', prio: 2, slot: 'tarde' },
    { title: 'Contactar a una persona que me aporte', mini: 'Enviar 1 mensaje', cat: 'trabajo', time: '', prio: 2, slot: 'tarde' },
    { title: 'Cero compras impulsivas', mini: 'Esperar 24 h antes de comprar algo', cat: 'dinero', time: '', prio: 2, slot: 'libre' },
    { title: 'Anotar ingresos y gastos', mini: 'Anotar el último movimiento', cat: 'dinero', time: '20:30', prio: 2, slot: 'noche' },
    { title: 'Leer 30 min de negocios o finanzas', mini: 'Leer 1 página', cat: 'estudio', time: '21:00', prio: 2, slot: 'noche' },
    { title: 'Planear el día de mañana', mini: 'Anotar la tarea más importante', cat: 'personal', time: '21:30', prio: 2, slot: 'noche' }
  ];

  const LEVELS = [
    [0, 'Novato'], [100, 'Aprendiz'], [300, 'En marcha'], [600, 'Constante'], [1000, 'Enfocado'],
    [1600, 'Disciplinado'], [2500, 'Guerrero'], [3700, 'Imparable'], [5200, 'Máquina'], [7000, 'Élite'], [9500, 'Leyenda']
  ];

  const BADGES = [
    { id: 'primer_paso', i: 'footprints', t: 'teal', n: 'Primer paso', d: 'Completa tu primera tarea', c: (x) => x.totalDone >= 1 },
    { id: 'porque', i: 'heart', t: 'red', n: 'Tengo un porqué', d: 'Escribe tus metas y razones', c: (x) => x.why },
    { id: 'dia_ganado', i: 'flag', t: 'green', n: 'Primer día ganado', d: 'Gana tu primer día', c: (x) => x.wonDays >= 1 },
    { id: 'perfecto', i: 'circle-check', t: 'green', n: 'Día perfecto', d: 'Todo hecho en versión completa', c: (x) => x.perfectDays >= 1 },
    { id: 'racha3', i: 'flame', t: 'fire', n: 'Encendido', d: 'Racha de 3 días', c: (x) => x.best >= 3 },
    { id: 'semana_uso', i: 'calendar', t: 'blue', n: 'Primera semana', d: '7 días usando la app', c: (x) => x.daysUsed >= 7 },
    { id: 'racha7', i: 'zap', t: 'fire', n: '7 días seguidos', d: 'Racha de una semana', c: (x) => x.best >= 7 },
    { id: 'racha14', i: 'mountain', t: 'purple', n: '14 días', d: 'Dos semanas sin fallar', c: (x) => x.best >= 14 },
    { id: 'racha30', i: 'trophy', t: 'gold', n: '30 días', d: 'Un mes sin fallar', c: (x) => x.best >= 30 },
    { id: 'racha60', i: 'gem', t: 'blue', n: '60 días', d: 'Dos meses sin fallar', c: (x) => x.best >= 60 },
    { id: 'racha100', i: 'crown', t: 'gold', n: '100 días', d: 'Cien días seguidos', c: (x) => x.best >= 100 },
    { id: 'regreso', i: 'repeat', t: 'teal', n: 'Nunca dos seguidos', d: 'Gana un día justo después de fallar', c: (x) => x.comebacks >= 1 },
    { id: 'minimo', i: 'hourglass', t: 'gold', n: 'Regla de 2 min', d: 'Usa la versión mínima 5 veces', c: (x) => x.minis >= 5 },
    { id: 'emergencia', i: 'life-buoy', t: 'red', n: 'Sin ganas, igual', d: 'Completa un modo emergencia', c: (x) => x.emerg >= 1 },
    { id: 'foco1', i: 'timer', t: 'fire', n: 'Primer enfoque', d: 'Completa un pomodoro', c: (x) => x.pomos >= 1 },
    { id: 'foco10', i: 'target', t: 'red', n: 'Enfocado', d: '10 pomodoros', c: (x) => x.pomos >= 10 },
    { id: 'foco50', i: 'brain', t: 'purple', n: 'Mente de acero', d: '50 pomodoros', c: (x) => x.pomos >= 50 },
    { id: 'diario1', i: 'notebook-pen', t: 'blue', n: 'Primera revisión', d: 'Haz tu revisión nocturna', c: (x) => x.journal >= 1 },
    { id: 'diario7', i: 'book-open-check', t: 'purple', n: 'Me conozco', d: '7 revisiones nocturnas', c: (x) => x.journal >= 7 },
    { id: 'madrugador', i: 'sunrise', t: 'gold', n: 'Madrugador', d: 'Completa una tarea antes de las 8:00', c: (x) => x.early },
    { id: 'semana_ganada', i: 'gift', t: 'green', n: 'Semana cumplida', d: 'Gana un compromiso semanal', c: (x) => x.weeksWon >= 1 },
    { id: 'cien', i: 'dumbbell', t: 'fire', n: '100 tareas', d: 'Completa 100 tareas', c: (x) => x.totalDone >= 100 },
    { id: 'quinientas', i: 'rocket', t: 'purple', n: '500 tareas', d: 'Completa 500 tareas', c: (x) => x.totalDone >= 500 },
    { id: 'nivel_disc', i: 'award', t: 'gold', n: 'Disciplinado', d: 'Llega al nivel Disciplinado', c: (x) => x.basePoints >= 1600 },
    { id: 'dinero1', i: 'coins', t: 'green', n: 'Primer registro', d: 'Anota tu primer ingreso o ahorro', c: (x) => x.moneyEntries >= 1 },
    { id: 'dinero_semana', i: 'trending-up', t: 'green', n: 'Meta semanal', d: 'Cumple tu meta de dinero de una semana', c: (x) => x.moneyWeeksMet >= 1 },
    { id: 'dinero_racha4', i: 'crown', t: 'gold', n: '4 semanas seguidas', d: 'Cumple tu meta de dinero 4 semanas seguidas', c: (x) => x.moneyStreakBest >= 4 },
    { id: 'ahorro100', i: 'piggy-bank', t: 'green', n: 'Primeros 100', d: 'Ahorra 100 en total', c: (x) => x.totalSaved >= 100 },
    { id: 'ahorro1000', i: 'landmark', t: 'gold', n: '1.000 ahorrados', d: 'Ahorra 1.000 en total', c: (x) => x.totalSaved >= 1000 },
    { id: 'meta_ahorro', i: 'goal', t: 'gold', n: 'Meta de ahorro', d: 'Completa una meta de ahorro', c: (x) => x.goalsDone >= 1 }
  ];

  const PRAISE = ['Una menos.', 'Eso es.', 'Bien. Siguiente.', 'Cumplido.', 'Así se hace.', 'Sumando.', 'Otra más.'];
  const FOCUS_MIN = 25, BREAK_MIN = 5, LONG_BREAK_MIN = 15;

  /* ================= Estado ================= */
  const KEY = 'sinexcusas.v1';
  const DEFAULT_SETTINGS = {
    name: '', partner: 'Leslie', threshold: 80, morning: '07:00', nudge: '13:00', risk: '20:00', night: '21:30', moneyTime: '18:00',
    moneyGoal: 100, saveRate: 20, currency: '$', notif: false, push: false, sound: true
  };

  function freshState() {
    return {
      v: 2, createdAt: today(), onboarded: false, quoteSeed: Math.floor(Math.random() * 1e9),
      tasks: [], log: {}, pomos: {}, journal: {}, emergencies: {},
      why: { goals: '', reasons: '', photo: '' },
      money: { entries: [], goals: [] },
      weeks: {}, achievements: {}, flags: {},
      settings: Object.assign({}, DEFAULT_SETTINGS), seen: {}, notified: {}, timer: null
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw), f = freshState();
        return Object.assign(f, s, {
          settings: Object.assign(f.settings, s.settings),
          why: Object.assign(f.why, s.why),
          money: Object.assign(f.money, s.money),
          seen: Object.assign({}, s.seen), flags: Object.assign({}, s.flags)
        });
      }
    } catch (e) { /* datos corruptos: se empieza de cero */ }
    return freshState();
  }

  let state = load();
  let memo = {};

  function save() {
    memo = {};
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { toast('triangle-alert', 'No se pudo guardar: la memoria está llena. Quita la foto de "Mi porqué" o exporta una copia.', 5000, 'red'); return false; }
  }

  // Guarda, revisa logros/nivel, sincroniza recordatorios y repinta.
  function commit(opts) {
    save();
    checkBadges();
    checkLevel();
    schedulePushSync();
    if (!opts || opts.render !== false) render();
  }

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  /* ================= Tareas y días ================= */
  const taskById = (id) => state.tasks.find((t) => t.id === id);
  const activeTasks = () => state.tasks.filter((t) => !t.deletedAt);
  const slotFromTime = (time) => (!time ? 'libre' : time < '12:00' ? 'manana' : time < '19:00' ? 'tarde' : 'noche');
  const slotOf = (t) => (t.slot && SLOTS[t.slot] ? t.slot : slotFromTime(t.time));
  const currentSlot = () => slotFromTime(nowHM());

  function isScheduled(t, k) {
    if (t.deletedAt && k >= t.deletedAt) return false;
    if (t.type === 'once') return t.date === k;
    if (k < t.createdAt) return false;
    return (t.days || ALL_DAYS).includes(weekday(k));
  }

  // Tareas necesarias para ganar el día (80% de 4 = 3; nunca menos de 1).
  const needed = (total) => Math.min(total, Math.max(1, Math.round(total * state.settings.threshold / 100)));

  function dayStats(k) {
    const mk = 'd' + k;
    if (memo[mk]) return memo[mk];
    const tasks = state.tasks.filter((t) => isScheduled(t, k));
    const log = state.log[k] || {};
    let full = 0, mini = 0;
    for (const t of tasks) { if (log[t.id] === 'full') full++; else if (log[t.id] === 'mini') mini++; }
    const total = tasks.length, done = full + mini;
    const p = total ? done / total : null;
    const t0 = today();
    let status;
    if (k > t0) status = 'future';
    else if (k < state.createdAt) status = 'before';
    else if (!total) status = 'empty';
    else if (done >= needed(total)) status = 'won';
    else if (k === t0) status = 'pending';
    else status = 'lost';
    return (memo[mk] = { k, tasks, log, total, done, full, mini, pct: p, status });
  }

  function streakInfo() {
    if (memo.streak) return memo.streak;
    const t0 = today();
    let run = 0, best = 0, wonDays = 0, lostDays = 0, perfectDays = 0, comebacks = 0, doubleFails = 0;
    let prev = null, lastBroken = null, lastRelevant = null;
    for (let k = state.createdAt; k <= t0; k = addDays(k, 1)) {
      const s = dayStats(k);
      if (s.status === 'won') {
        run++; wonDays++; best = Math.max(best, run);
        if (s.full === s.total) perfectDays++;
        if (prev === 'lost') comebacks++;
        prev = 'won';
      } else if (s.status === 'lost') {
        if (run >= 2) lastBroken = { k, length: run };
        run = 0; lostDays++;
        if (prev === 'lost') doubleFails++;
        prev = 'lost';
      }
      if (k < t0 && (s.status === 'won' || s.status === 'lost')) lastRelevant = s.status;
    }
    return (memo.streak = { current: run, best, wonDays, lostDays, perfectDays, comebacks, doubleFails, lastBroken, yesterdayLost: lastRelevant === 'lost' });
  }

  function rangeStats(from, to) {
    let total = 0, done = 0, won = 0, lost = 0, days = 0;
    const t0 = today();
    if (to > t0) to = t0;
    for (let k = from < state.createdAt ? state.createdAt : from; k <= to; k = addDays(k, 1)) {
      const s = dayStats(k);
      if (!s.total || s.status === 'before') continue;
      total += s.total; done += s.done; days++;
      if (s.status === 'won') won++; else if (s.status === 'lost') lost++;
    }
    return { total, done, won, lost, days, pct: total ? done / total : null };
  }

  /* ================= Dinero ================= */
  const money = () => state.money;
  const cur = () => state.settings.currency || '$';
  function fmtMoney(n, opts) {
    const v = Math.round((Number(n) || 0) * 100) / 100;
    const s = Math.abs(v).toLocaleString('es-EC', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
    return (v < 0 ? '−' : opts && opts.sign && v > 0 ? '+' : '') + cur() + s;
  }
  const parseMoney = (str) => { const v = parseFloat(String(str || '').replace(/[^\d.,-]/g, '').replace(',', '.')); return isFinite(v) ? Math.round(v * 100) / 100 : 0; };
  const savedDelta = (e) => (e.type === 'saving' ? e.amount : e.type === 'withdraw' ? -e.amount : 0);

  function moneyWeek(ws) {
    const mk = 'mw' + ws;
    if (memo[mk]) return memo[mk];
    const end = addDays(ws, 6);
    let income = 0, saved = 0;
    for (const e of money().entries) {
      if (e.date < ws || e.date > end) continue;
      if (e.type === 'income') income += e.amount;
      saved += savedDelta(e);
    }
    const goal = state.settings.moneyGoal || 0;
    const t0 = today();
    const daysLeft = ws === weekStart(t0) ? 7 - ((weekday(t0) + 6) % 7) : 0;
    const left = Math.max(0, goal - income);
    return (memo[mk] = { ws, income, saved, goal, met: goal > 0 && income >= goal, left, daysLeft, perDay: daysLeft ? left / daysLeft : left, toSave: income * (state.settings.saveRate || 0) / 100 });
  }

  function moneyInfo() {
    if (memo.money) return memo.money;
    const entries = money().entries;
    let totalSaved = 0, totalIncome = 0;
    const savingDays = new Set();
    for (const e of entries) {
      totalSaved += savedDelta(e);
      if (e.type === 'income') totalIncome += e.amount;
      if (e.type === 'saving') savingDays.add(e.date);
    }
    const first = entries.reduce((m, e) => (e.date < m ? e.date : m), today());
    const curWs = weekStart(today());
    let streak = 0, best = 0, weeksMet = 0;
    for (let ws = weekStart(first); ws <= curWs; ws = addDays(ws, 7)) {
      const w = moneyWeek(ws);
      if (w.met) { streak++; weeksMet++; best = Math.max(best, streak); }
      else if (ws < curWs) streak = 0;
    }
    const goals = money().goals.map((g) => {
      const saved = entries.filter((e) => e.goalId === g.id).reduce((a, e) => a + savedDelta(e), 0);
      return Object.assign({}, g, { saved, done: saved >= g.target });
    });
    // Ritmo de ahorro: promedio de las últimas 4 semanas
    let recent = 0;
    for (let i = 0; i < 4; i++) recent += moneyWeek(addDays(curWs, -7 * i)).saved;
    return (memo.money = { totalSaved, totalIncome, savingDays: savingDays.size, streak, best, weeksMet, goals, goalsDone: goals.filter((g) => g.done).length, avgWeeklySaving: Math.max(0, recent / 4), entries: entries.length });
  }

  // Valor futuro de ahorrar W por semana con una tasa anual r durante n años.
  function projection(weekly, years, rate) {
    const i = Math.pow(1 + rate, 1 / 52) - 1, n = Math.round(52 * years);
    return weekly * (Math.pow(1 + i, n) - 1) / i;
  }

  /* ================= Puntos y niveles ================= */
  function pointsForDay(k) {
    const log = state.log[k] || {};
    let p = 0;
    for (const id in log) {
      const t = taskById(id), prio = t ? t.prio || 2 : 2;
      p += log[id] === 'full' ? 5 + 5 * prio : log[id] === 'mini' ? 4 : 0;
    }
    const s = dayStats(k);
    if (s.status === 'won') p += 15;
    if (s.total && s.full === s.total) p += 10;
    p += (state.pomos[k] || 0) * 8 + (state.journal[k] ? 5 : 0) + (state.emergencies[k] || 0) * 5;
    if (money().entries.some((e) => e.date === k && e.type === 'saving')) p += 5;
    return p;
  }

  function pointsInfo() {
    if (memo.points) return memo.points;
    let base = 0, totalDone = 0, minis = 0;
    for (const k in state.log) {
      const log = state.log[k];
      for (const id in log) {
        const t = taskById(id), prio = t ? t.prio || 2 : 2;
        if (log[id] === 'full') { base += 5 + 5 * prio; totalDone++; }
        else if (log[id] === 'mini') { base += 4; totalDone++; minis++; }
      }
    }
    const si = streakInfo(), mi = moneyInfo();
    const sum = (o) => Object.values(o).reduce((a, b) => a + (b || 0), 0);
    const pomos = sum(state.pomos), emerg = sum(state.emergencies), journal = Object.keys(state.journal).length;
    const weeksWon = Object.values(state.weeks).filter((w) => w.result === 'won').length;
    base += si.wonDays * 15 + si.perfectDays * 10 + pomos * 8 + journal * 5 + emerg * 5 + weeksWon * 50;
    base += mi.savingDays * 5 + mi.weeksMet * 60 + mi.goalsDone * 100;
    const total = base + Object.keys(state.achievements).length * 30;
    return (memo.points = { base, total, totalDone, minis, pomos, emerg, journal, weeksWon });
  }

  function levelInfo(points) {
    const p = points == null ? pointsInfo().total : points;
    let i = 0;
    while (i + 1 < LEVELS.length && p >= LEVELS[i + 1][0]) i++;
    let name = LEVELS[i][1], floor = LEVELS[i][0], next = LEVELS[i + 1] ? LEVELS[i + 1][0] : null, num = i + 1;
    if (!next) { // después de Leyenda: un nivel cada 3000 puntos
      const extra = Math.floor((p - floor) / 3000);
      num += extra; floor += extra * 3000; next = floor + 3000;
      if (extra) name = 'Leyenda ' + (extra + 1);
    }
    return { num, name, points: p, floor, next, progress: (p - floor) / (next - floor) };
  }

  /* ================= Logros ================= */
  function badgeCtx() {
    const si = streakInfo(), pi = pointsInfo(), mi = moneyInfo();
    const usedDays = Object.keys(state.log).filter((k) => Object.keys(state.log[k]).length).length;
    return {
      totalDone: pi.totalDone, minis: pi.minis, pomos: pi.pomos, emerg: pi.emerg, journal: pi.journal, weeksWon: pi.weeksWon,
      best: si.best, wonDays: si.wonDays, perfectDays: si.perfectDays, comebacks: si.comebacks,
      daysUsed: usedDays, early: !!state.flags.early, basePoints: pi.base,
      why: !!(state.why.goals.trim() || state.why.reasons.trim()),
      moneyEntries: mi.entries, moneyWeeksMet: mi.weeksMet, moneyStreakBest: mi.best, totalSaved: mi.totalSaved, goalsDone: mi.goalsDone
    };
  }

  function checkBadges() {
    const ctx = badgeCtx();
    const fresh = BADGES.filter((b) => !state.achievements[b.id] && b.c(ctx));
    if (!fresh.length) return;
    fresh.forEach((b) => { state.achievements[b.id] = today(); });
    save();
    fresh.slice(0, 2).forEach((b, i) => setTimeout(() => { toast(b.i, `<b>Logro:</b> ${esc(b.n)} (+30 pts)`, 3200, b.t); if (!i) { confetti(60); chime(); } }, 400 + i * 1200));
    if (fresh.length > 2) setTimeout(() => toast('award', `Y ${fresh.length - 2} logros más. Míralos en <b>Más → Logros</b>.`, 3200, 'gold'), 2900);
  }

  function checkLevel() {
    const lv = levelInfo();
    if (state.seen.level == null) { state.seen.level = lv.num; save(); return; }
    if (lv.num > state.seen.level) {
      state.seen.level = lv.num; save();
      setTimeout(() => { toast('arrow-up', `<b>¡Subiste a nivel ${lv.num}!</b> Ahora eres: ${esc(lv.name)}`, 3500, 'gold'); confetti(120); chime(); }, 300);
    }
  }

  /* ================= Frases y coach ================= */
  function quotePool() {
    if (memo.qpool) return memo.qpool;
    const partner = state.settings.partner.trim();
    const pool = window.FRASES.concat(window.FRASES_RIQUEZA || [], partner ? (window.FRASES_PAREJA || []).map((f) => f.replace(/\{pareja\}/g, partner)) : []);
    const order = pool.map((_, i) => i);
    let seed = state.quoteSeed || 1;
    for (let i = order.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) % 2147483648; const j = seed % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    return (memo.qpool = { pool, order });
  }
  function quoteFor(k, extra) {
    const { pool, order } = quotePool();
    const n = Math.round((parseKey(k) - parseKey('2024-01-01')) / 86400000) + (extra || 0);
    return pool[order[((n % order.length) + order.length) % order.length]];
  }
  const ruleFor = (k) => { const r = window.REGLAS_RIQUEZA; return r[Math.round((parseKey(k) - parseKey('2024-01-01')) / 86400000) % r.length]; };

  function fill(str, vars) {
    let s = str;
    if (!vars.nombre) s = s.replace(/, \{nombre\}/g, '').replace(/\{nombre\}, /g, '');
    s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
    return cap(s);
  }

  function coach() {
    const k = today(), s = dayStats(k), si = streakInfo();
    const h = new Date().getHours(), hm = nowHM();
    const vars = { hechas: s.done, total: s.total, faltan: s.total - s.done, hora: hm, nombre: state.settings.name.trim() };
    let bucket, tone;
    if (!s.total) { bucket = 'sinTareas'; tone = 'warn'; }
    else if (s.done === s.total) { bucket = 'todoHecho'; tone = 'good'; }
    else if (s.status === 'won') { bucket = 'diaGanado'; tone = 'good'; }
    else if (si.yesterdayLost && s.done === 0) { bucket = 'ayerFallaste'; tone = 'bad'; }
    else if (s.done === 0) {
      if (hm < state.settings.nudge) { bucket = 'mananaSinNada'; tone = 'warn'; }
      else if (h >= 19) { bucket = 'nocheAtrasado'; tone = 'bad'; }
      else { bucket = 'tardeSinNada'; tone = 'bad'; }
    }
    else if (h >= 19) { bucket = 'nocheAtrasado'; tone = 'bad'; }
    else if (s.pct >= 0.5) { bucket = 'vasBien'; tone = 'good'; }
    else { bucket = 'arrancando'; tone = 'warn'; }
    const list = window.COACH[bucket];
    return { text: fill(list[hash(k + bucket) % list.length], vars), tone };
  }

  function moneyCoach() {
    const k = today(), w = moneyWeek(weekStart(k));
    const vars = { hecho: fmtMoney(w.income), meta: fmtMoney(w.goal), falta: fmtMoney(w.left), porDia: fmtMoney(Math.ceil(w.perDay)), dias: w.daysLeft, dia: DIAS[weekday(k)] };
    let bucket, tone;
    if (w.met) { bucket = 'cumplida'; tone = 'good'; }
    else if (!w.income) { bucket = 'sinRegistro'; tone = w.daysLeft <= 3 ? 'bad' : 'warn'; }
    else if (w.daysLeft <= 3) { bucket = 'atrasado'; tone = 'bad'; }
    else { bucket = 'aTiempo'; tone = 'warn'; }
    const list = window.COACH_DINERO[bucket];
    return { text: fill(list[hash(k + bucket) % list.length], vars), tone };
  }

  /* ================= Semanas (compromiso) ================= */
  function ensureWeek(ws) {
    if (state.weeks[ws]) return state.weeks[ws];
    const prevKeys = Object.keys(state.weeks).filter((x) => x < ws).sort();
    const prev = prevKeys.length ? state.weeks[prevKeys[prevKeys.length - 1]] : null;
    if (!prev || (!prev.reward && !prev.punishment)) return null;
    state.weeks[ws] = { reward: prev.reward, punishment: prev.punishment, result: null };
    save();
    return state.weeks[ws];
  }
  const weekHasDeal = (w) => !!(w && (w.reward || w.punishment));
  function weekStats(ws) { return rangeStats(ws, addDays(ws, 6)); }
  // La semana se gana ganando suficientes días (con 80%: 6 de 7).
  function weekInfo(ws) {
    const st = weekStats(ws);
    let planned = 0;
    for (let i = 0; i < 7; i++) { const dk = addDays(ws, i); if (dk >= state.createdAt && dayStats(dk).total) planned++; }
    const need = planned ? needed(planned) : 0;
    return { pct: st.pct, won: st.won, lost: st.lost, planned, need, ok: planned > 0 && st.won >= need, impossible: planned > 0 && planned - st.lost < need };
  }
  const weekLine = (wi) => wi.won + ' de ' + wi.need + ' días ganados';

  /* ================= UI: toast, sheet, overlay ================= */
  function toast(icon, html, ms, tone) {
    const root = $('#toast-root');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${medal(icon, tone || 'fire', 'sm')}<div>${html}</div>`;
    root.appendChild(el);
    while (root.children.length > 2) root.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms || 3200);
    el.addEventListener('click', () => el.remove());
  }

  let sheetClose = null;
  function openSheet(html, onMount) {
    closeSheet(true);
    const root = $('#sheet-root');
    root.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    const bd = $('.sheet-backdrop', root), sh = $('.sheet', root);
    bd.addEventListener('click', () => closeSheet());
    requestAnimationFrame(() => { bd.classList.add('show'); sh.classList.add('show'); });
    sheetClose = () => {
      bd.classList.remove('show'); sh.classList.remove('show');
      setTimeout(() => { if (root.contains(sh)) root.innerHTML = ''; }, 260);
    };
    if (onMount) onMount(sh);
    return sh;
  }
  function closeSheet(instant) {
    if (!sheetClose) return;
    if (instant) $('#sheet-root').innerHTML = ''; else sheetClose();
    sheetClose = null;
  }
  const sheetHead = (title, saveAct) => `<div class="sheet-head"><button class="link-btn" data-act="sheet-close">Cancelar</button><h2>${title}</h2>${saveAct ? `<button class="link-btn strong" data-act="${saveAct}">Guardar</button>` : '<span></span>'}</div>`;

  const overlayQueue = [];
  let overlayOpen = false;
  function queueOverlay(fn) { overlayQueue.push(fn); if (!overlayOpen) nextOverlay(); }
  function nextOverlay() {
    const fn = overlayQueue.shift();
    if (!fn) { overlayOpen = false; return; }
    overlayOpen = true;
    fn();
  }
  function showOverlay(html, opts) {
    opts = opts || {};
    const root = $('#overlay-root');
    root.innerHTML = `<div class="overlay ${opts.theme || ''}" role="dialog" aria-modal="true">${opts.closable === false ? '' : `<button class="ov-close" data-act="ov-close" aria-label="Cerrar">${ic('x')}</button>`}<div class="ov-inner">${html}</div></div>`;
    document.body.style.overflow = 'hidden';
    const el = $('.overlay', root);
    if (opts.onMount) opts.onMount(el);
    countUp(el);
    return el;
  }
  function closeOverlay() {
    $('#overlay-root').innerHTML = '';
    document.body.style.overflow = '';
    if (emergencyTimer) { clearInterval(emergencyTimer); emergencyTimer = null; }
    overlayOpen = false;
    setTimeout(nextOverlay, 150);
    render();
  }
  const ovIcon = (name, tone) => `<div class="ov-icon">${medal(name, tone, 'xl')}</div>`;

  /* ================= Sonido, confeti y animaciones ================= */
  let actx = null;
  function unlockAudio() {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { /* sin audio */ }
  }
  document.addEventListener('touchend', unlockAudio, { passive: true });
  document.addEventListener('click', unlockAudio);
  function tone(freq, start, dur, vol) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, actx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, actx.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + start + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(actx.currentTime + start); o.stop(actx.currentTime + start + dur + 0.05);
  }
  function chime() {
    if (!state.settings.sound) return;
    try { unlockAudio(); if (!actx) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.35, 0.18)); } catch (e) { /* nada */ }
  }
  function coin() {
    if (!state.settings.sound) return;
    try { unlockAudio(); if (!actx) return; tone(988, 0, 0.12, 0.2); tone(1319, 0.08, 0.4, 0.2); } catch (e) { /* nada */ }
  }
  function alarm() {
    if (!state.settings.sound) return;
    try { unlockAudio(); if (!actx) return; for (let i = 0; i < 3; i++) { tone(880, i * 0.5, 0.25, 0.3); tone(1175, i * 0.5 + 0.15, 0.25, 0.25); } } catch (e) { /* nada */ }
  }

  function confetti(n) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('#confetti'), ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#ff6b2c', '#ffb02e', '#2bd576', '#4da3ff', '#ff4d5e', '#b18cff', '#ffffff'];
    const parts = Array.from({ length: n || 150 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
      s: Math.random() * 7 + 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: colors[Math.floor(Math.random() * colors.length)]
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const life = (t - t0) / 2600;
      for (const p of parts) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - life); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.restore();
      }
      if (life < 1) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  // Números que cuentan hacia arriba (data-count="123" data-fmt="money").
  function countUp(root) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    $$('[data-count]', root).forEach((el) => {
      const to = Number(el.dataset.count), isMoney = el.dataset.fmt === 'money';
      if (!to) return;
      const t0 = performance.now(), dur = 900;
      (function step(t) {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3), v = to * e;
        el.textContent = isMoney ? fmtMoney(k < 1 ? Math.round(v) : to) : Math.round(v);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  const ring = (p, tone, cls) => {
    const C = 2 * Math.PI * 45, off = C * (1 - clamp01(p));
    return `<svg viewBox="0 0 100 100" class="ringsvg ${tone || ''} ${cls || ''}" style="--c:${C.toFixed(1)};--off:${off.toFixed(1)}" aria-hidden="true"><circle class="track" cx="50" cy="50" r="45"/><circle class="prog" cx="50" cy="50" r="45" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>`;
  };
  const bar = (p, cls) => `<div class="bar ${cls || ''}"><i style="--w:${Math.round(clamp01(p) * 100)}%"></i></div>`;

  /* ================= Router y render ================= */
  let route = { tab: 'hoy', sub: '' };
  let justToggled = null;
  function readRoute() {
    const h = (location.hash || '#hoy').slice(1).split('/');
    route = { tab: VIEWS[h[0]] ? h[0] : 'hoy', sub: h[1] || '' };
  }
  function go(hash) { if (location.hash === '#' + hash) { readRoute(); render(); } else location.hash = hash; }

  let enterTimer = null;
  function render(animate) {
    const v = $('#view');
    v.innerHTML = VIEWS[route.tab](route.sub);
    const tab = route.tab === 'diario' ? 'mas' : route.tab;
    $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
    $$('.view > .stack > *').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));
    if (animate) {
      v.classList.add('enter');
      countUp(v);
      clearTimeout(enterTimer);
      enterTimer = setTimeout(() => v.classList.remove('enter'), 1400);
    }
    justToggled = null;
    if (route.tab === 'enfoque') updateTimerUI();
  }

  window.addEventListener('hashchange', () => { readRoute(); render(true); window.scrollTo(0, 0); });

  /* ================= Vista: HOY ================= */
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

  function sortTasks(tasks, log) {
    return tasks.slice().sort((a, b) => {
      const da = log[a.id] === 'full' ? 1 : 0, db = log[b.id] === 'full' ? 1 : 0;
      if (da !== db) return da - db;
      const ta = a.time || '99:99', tb = b.time || '99:99';
      if (ta !== tb) return ta < tb ? -1 : 1;
      return (b.prio || 2) - (a.prio || 2);
    });
  }

  function taskRow(t, log, k) {
    const st = log[t.id];
    const cat = CATS[t.cat] || CATS.personal;
    const late = !st && k === today() && t.time && t.time < nowHM();
    const meta = [];
    if (t.time) meta.push(`<span class="tag${late ? ' late' : ''}">${ic('alarm-clock')}${t.time}${late ? ' · atrasada' : ''}</span>`);
    meta.push(`<span class="tag cat-${cat.tone}">${ic(cat.icon)}${cat.label}</span>`);
    if (t.prio === 3) meta.push(`<span class="tag p3">${ic('zap')}Alta</span>`);
    meta.push(`<span class="tag">${ic(t.type === 'once' ? 'pin' : 'repeat')}${t.type === 'once' ? 'Solo hoy' : 'Hábito'}</span>`);
    return `<div class="task ${st === 'full' ? 'done' : st === 'mini' ? 'mini' : ''}${justToggled === t.id ? ' just' : ''}">
      <button class="check" data-act="toggle" data-id="${t.id}" aria-label="${st ? 'Desmarcar' : 'Marcar como hecha'}">${st === 'mini' ? '<b>2m</b>' : ic('check')}</button>
      <button class="t-body" data-act="edit" data-id="${t.id}">
        <div class="t-title">${esc(t.title)}</div>
        <div class="t-meta">${meta.join('')}</div>
        ${t.mini && st !== 'full' ? `<div class="mini-line">${st === 'mini' ? 'Hiciste lo mínimo: ' : 'Mínimo: '}${esc(t.mini)}${st === 'mini' ? ' · toca el check si haces la completa' : ''}</div>` : ''}
      </button>
      ${t.mini && !st ? `<button class="mini-btn" data-act="mini" data-id="${t.id}">2 min<small>mínimo</small></button>` : '<span></span>'}
    </div>`;
  }

  function whyStrip() {
    const w = state.why;
    if (!w.goals.trim() && !w.photo) return '';
    return `<a href="#mas/porque" class="card tap why-strip">
      ${w.photo ? `<img src="${w.photo}" alt="">` : medal('heart', 'red')}
      <div style="min-width:0"><div class="kicker">Mi porqué</div><div class="wv">${esc(w.goals.trim() || w.reasons.trim())}</div></div></a>`;
  }

  function whyBig(title) {
    const w = state.why;
    if (!w.goals.trim() && !w.reasons.trim() && !w.photo) {
      return `<a href="#mas/porque" class="card tap card-row">${medal('heart', 'red')}<div><h3>${title || 'Escribe tu porqué'}</h3><p class="muted small">Cuando tengas ganas de rendirte, esto es lo que vas a leer.</p></div></a>`;
    }
    return `<div class="card stack">
      <div class="kicker">${title || 'Recuerda por qué empezaste'}</div>
      ${w.photo ? `<img class="why-photo" src="${w.photo}" alt="Mi porqué">` : ''}
      ${w.goals.trim() ? `<p class="why-goals">${esc(w.goals)}</p>` : ''}
      ${w.reasons.trim() ? `<p class="muted pre">${esc(w.reasons)}</p>` : ''}
    </div>`;
  }

  function weekStrip() {
    const k = today(), ws = weekStart(k);
    return '<div class="week-strip">' + Array.from({ length: 7 }, (_, i) => {
      const dk = addDays(ws, i), s = dayStats(dk);
      const cls = dk === k ? (s.status === 'won' ? 'won today' : 'today') : s.status === 'won' ? 'won' : s.status === 'lost' ? 'lost' : 'none';
      return `<div class="wd ${cls}"><i>${s.status === 'won' ? ic('check') : s.status === 'lost' ? ic('x') : ''}</i><span>${DIAS_LETRA[weekday(dk)]}</span></div>`;
    }).join('') + '</div>';
  }

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  }

  function viewHoy() {
    const k = today(), s = dayStats(k), si = streakInfo(), lv = levelInfo(), c = coach();
    const name = state.settings.name.trim();
    const h = new Date().getHours();
    const out = [];

    out.push(`<header class="hero">
      <div><div class="hero-sub">${cap(fmtLong(k))}</div><h1>${greeting()}${name ? ', ' + esc(name) : ''}</h1></div>
      <a href="#mas/logros" class="level-chip">${ic('award')}<span>Nv ${lv.num}</span><b data-count="${lv.points}">${lv.points}</b></a>
    </header>`);

    if (!isStandalone()) {
      out.push(`<div class="alert info">${ic('smartphone', 'ai')}<div>Instálala para que funcione como app y te lleguen avisos: ${isIOS ? 'en Safari toca <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>.' : 'abre esta página en Safari en tu iPhone y elige <b>Añadir a pantalla de inicio</b>.'} <a href="#mas/instalar">Ver pasos</a></div></div>`);
    }

    out.push(whyStrip());

    if (si.yesterdayLost && s.status !== 'won') {
      out.push(`<div class="alert bad">${ic('triangle-alert', 'ai')}<div>Ayer fallaste. Regla de oro: <b>nunca dos días seguidos</b>. Hoy se gana sí o sí. Si hace falta, usa la versión mínima.</div></div>`);
    }

    out.push(`<section class="card streak-card">
      <div class="streak-top">
        <span class="flame-wrap${si.current ? ' lit' : ''}">${ic('flame')}</span>
        <div class="streak-num"><b data-count="${si.current}">${si.current}</b><span>${si.current === 1 ? 'día de racha' : 'días de racha'}${s.status === 'won' ? ' · hoy ganado' : s.total ? ' · hoy en juego' : ''}</span></div>
        <div class="record"><b>${si.best}</b><span>récord</span></div>
      </div>
      ${weekStrip()}
    </section>`);

    out.push(`<section class="card coach ${c.tone}"><div class="coach-head">${medal('megaphone', c.tone === 'good' ? 'green' : c.tone === 'bad' ? 'red' : 'gold', 'sm')}<span>Tu coach</span></div><p>${esc(c.text)}</p></section>`);

    if (c.tone === 'bad' && s.total) out.push(whyBig());

    const rd = reviewDay();
    if ((nowHM() >= state.settings.night || h < 4) && !state.journal[rd]) {
      out.push(`<button class="card tap card-row night-card" data-act="review">${medal('moon', 'blue')}<div><h3>Revisión nocturna pendiente</h3><p class="muted small">Un minuto: qué lograste, qué te frenó y qué harás mañana.</p></div>${ic('chevron-right', 'chev')}</button>`);
    }

    if (s.total) {
      out.push(`<section class="card progress-card">
        <div class="mini-ring">${ring(s.pct, s.status === 'won' ? 'green' : 'fire')}<b>${pct(s.pct)}</b></div>
        <div class="pc-text"><h3>${s.done} de ${s.total} completadas</h3>
        <p class="muted small">${s.status === 'won' ? (s.done === s.total ? 'Día perfecto.' : 'Día ganado. Remata lo que falta.') : `Para ganar el día necesitas ${needed(s.total)} de ${s.total}.`}${s.mini ? ` ${s.mini} en versión mínima.` : ''}</p></div>
      </section>`);

      const groups = { manana: [], tarde: [], noche: [], libre: [] };
      sortTasks(s.tasks, s.log).forEach((t) => groups[slotOf(t)].push(t));
      const nowSlot = currentSlot();
      for (const sl of SLOT_ORDER) {
        const list = groups[sl];
        if (!list.length) continue;
        const done = list.filter((t) => s.log[t.id]).length;
        const past = SLOT_ORDER.indexOf(sl) < SLOT_ORDER.indexOf(nowSlot) && sl !== 'libre';
        const info = SLOTS[sl];
        out.push(`<section class="slot ${sl === nowSlot ? 'now' : ''}">
          <div class="slot-head">${medal(info.icon, info.tone, 'sm')}<div class="slot-title"><b>${info.label}</b><span>${info.hint}</span></div>
            ${sl === nowSlot ? '<span class="pill now">Ahora</span>' : past && done < list.length ? '<span class="pill late">Pendiente</span>' : ''}
            <span class="slot-count${done === list.length ? ' ok' : ''}">${done}/${list.length}</span></div>
          <div class="tasks">${list.map((t) => taskRow(t, s.log, k)).join('')}</div>
        </section>`);
      }
      if (s.done < s.total) out.push(`<button class="panic" data-act="emergency">${ic('battery-low')}No tengo ganas</button>`);
    } else {
      out.push(`<section class="card empty">${medal('target', 'fire', 'lg')}<h3>Hoy no tienes tareas</h3><p>Empieza con 2 o 3 hábitos. Toca uno para agregarlo:</p>
        <div class="chips center">${PLANTILLAS.slice(0, 6).map((p, i) => `<button class="chip" data-act="add-template" data-i="${i}">${ic(CATS[p.cat].icon)}${esc(p.title)}</button>`).join('')}</div>
        <button class="btn primary" data-act="add">${ic('plus')}Crear mi propia tarea</button></section>`);
    }

    // Dinero de la semana
    const mw = moneyWeek(weekStart(k));
    if (mw.goal) {
      out.push(`<a href="#dinero" class="card tap money-mini">
        <div class="mini-ring">${ring(mw.income / mw.goal, 'green')}${ic('wallet')}</div>
        <div class="pc-text"><div class="kicker">Meta de dinero de la semana</div><h3><span data-count="${mw.income}" data-fmt="money">${fmtMoney(mw.income)}</span> <span class="muted">de ${fmtMoney(mw.goal)}</span></h3>
        <p class="muted small">${mw.met ? 'Meta cumplida. Guarda tu parte.' : `Te faltan ${fmtMoney(mw.left)} · ${mw.daysLeft} ${mw.daysLeft === 1 ? 'día' : 'días'}`}</p></div>${ic('chevron-right', 'chev')}</a>`);
    }

    const ws = weekStart(k), w = state.weeks[ws];
    if (weekHasDeal(w)) {
      const wi = weekInfo(ws);
      out.push(`<a href="#mas/compromiso" class="card tap">
        <div class="progress-head"><b>${ic('handshake')}Compromiso de la semana</b><span>${weekLine(wi)}</span></div>
        ${bar(wi.need ? wi.won / wi.need : 0, wi.ok ? 'good' : '')}
        ${wi.impossible ? '<p class="small bad-text">Ya no llegas a la meta esta semana. Toca cumplir el castigo, pero cada día que ganes sigue sumando.</p>' : ''}
        ${w.reward ? `<p class="small deal">${ic('gift')}Si cumples: <b>${esc(w.reward)}</b></p>` : ''}
        ${w.punishment ? `<p class="small deal">${ic('scale')}Si fallas: <b>${esc(w.punishment)}</b></p>` : ''}</a>`);
    } else if (state.onboarded) {
      out.push(`<a href="#mas/compromiso" class="card tap card-row">${medal('handshake', 'purple')}<div><h3>Ponte un compromiso semanal</h3><p class="muted small">Una recompensa si cumples la semana y un castigo si fallas.</p></div>${ic('chevron-right', 'chev')}</a>`);
    }

    const extra = (state.seen.quoteExtra && state.seen.quoteExtra.k === k) ? state.seen.quoteExtra.n : 0;
    out.push(`<section class="card quote-card"><div class="qhead">${ic('quote', 'qmark')}<span>Frase del día</span><button class="link-btn" data-act="next-quote">Otra ${ic('chevron-right')}</button></div><p class="quote" id="quote">${esc(quoteFor(k, extra * 37))}</p></section>`);

    out.push(`<button class="fab" data-act="add" aria-label="Agregar tarea">${ic('plus')}</button>`);
    return '<div class="stack">' + out.join('') + '</div>';
  }

  /* ================= Acciones sobre tareas ================= */
  function setTaskState(id, value) {
    const k = today();
    const before = dayStats(k);
    state.log[k] = state.log[k] || {};
    if (value) state.log[k][id] = value; else delete state.log[k][id];
    if (value && new Date().getHours() < 8) state.flags.early = true;
    memo = {};
    const after = dayStats(k);
    justToggled = value ? id : null;
    commit();
    if (value) {
      if (navigator.vibrate) navigator.vibrate(12);
      const t = taskById(id);
      const pts = value === 'full' ? 5 + 5 * ((t && t.prio) || 2) : 4;
      if (after.done === after.total && state.seen.celebrated !== k) {
        state.seen.celebrated = k; save();
        celebrate();
      } else if (after.status === 'won' && before.status !== 'won' && state.seen.won !== k) {
        state.seen.won = k; save();
        toast('flag', '<b>¡Día ganado!</b> Ya cumpliste el mínimo. Remata lo que falta.', 3200, 'green');
        confetti(70); chime();
      } else {
        toast(value === 'mini' ? 'hourglass' : 'check', `${value === 'mini' ? 'Lo mínimo cuenta.' : pick(PRAISE)} <b>+${pts} pts</b>`, 1800, value === 'mini' ? 'gold' : 'green');
      }
    }
  }

  function celebrate() {
    const k = today(), si = streakInfo(), lv = levelInfo(), s = dayStats(k);
    confetti(200); chime();
    queueOverlay(() => showOverlay(
      `${ovIcon('trophy', 'gold')}<p class="ov-kicker">${fmtLong(k)}</p>
      <h1 class="ov-title">Día ganado</h1>
      <p class="ov-text">Completaste ${s.total} de ${s.total}. Hoy cumpliste tu palabra. Esto es lo que te cambia la vida: repetirlo mañana.</p>
      <div class="stat-row"><div class="card"><b data-count="${si.current}">${si.current}</b><span>racha</span></div><div class="card"><b>+<span data-count="${pointsForDay(k)}">${pointsForDay(k)}</span></b><span>pts hoy</span></div><div class="card"><b>${lv.num}</b><span>${esc(lv.name)}</span></div></div>
      <div class="card"><p class="quote">${esc(quoteFor(k, 11))}</p></div>
      <button class="btn primary xl" data-act="ov-close">Seguir así</button>`,
      { theme: 'green' }
    ));
  }

  /* ================= Hoja: crear / editar tarea ================= */
  function taskForm(t) {
    const isNew = !t;
    const d = t || { title: '', mini: '', cat: 'personal', prio: 2, time: '', type: 'habit', days: ALL_DAYS.slice(), date: today(), slot: '' };
    const slot = slotOf(d);
    const html = sheetHead(isNew ? 'Nueva tarea' : 'Editar tarea', 'save-task') +
      `<form id="task-form" class="stack" autocomplete="off">
        <input class="input big" name="title" maxlength="80" placeholder="¿Qué vas a hacer?" value="${esc(d.title)}" enterkeyhint="done" required>
        <div class="seg" data-group="type"><button type="button" data-v="habit" class="${d.type === 'habit' ? 'on' : ''}">${ic('repeat')}Hábito</button><button type="button" data-v="once" class="${d.type === 'once' ? 'on' : ''}">${ic('pin')}Un solo día</button></div>
        <div class="field"><span>Momento del día</span><div class="seg seg4" data-group="slot">${SLOT_ORDER.map((sl) => `<button type="button" data-v="${sl}" class="${slot === sl ? 'on' : ''}">${ic(SLOTS[sl].icon)}${sl === 'libre' ? 'Cualquiera' : SLOTS[sl].label}</button>`).join('')}</div></div>
        <button type="submit" class="btn primary">${isNew ? 'Agregar tarea' : 'Guardar cambios'}</button>
        <label class="field"><span>Versión mínima (regla de los 2 minutos)</span><input class="input" name="mini" maxlength="80" placeholder="Ej: hacer 1 flexión" value="${esc(d.mini)}"></label>
        <label class="field"><span>Hora (opcional, para recordatorio)</span><input class="input" type="time" name="time" value="${esc(d.time)}"></label>
        <div class="field"><span>Categoría</span><div class="chips" data-group="cat">${Object.keys(CATS).map((c) => `<button type="button" class="chip ${d.cat === c ? 'on' : ''}" data-v="${c}">${ic(CATS[c].icon)}${CATS[c].label}</button>`).join('')}</div></div>
        <div class="field"><span>Prioridad</span><div class="seg" data-group="prio">${[3, 2, 1].map((p) => `<button type="button" data-v="${p}" class="${d.prio === p ? 'on' : ''}">${PRIOS[p]}</button>`).join('')}</div></div>
        <div class="field habit-only${d.type === 'habit' ? '' : ' hidden'}"><span>Días</span><div class="chips" data-group="days" data-multi="1">${WEEK_ORDER.map((i) => `<button type="button" class="chip day ${(d.days || ALL_DAYS).includes(i) ? 'on' : ''}" data-v="${i}">${DIAS_LETRA[i]}</button>`).join('')}</div></div>
        <label class="field once-only${d.type === 'once' ? '' : ' hidden'}"><span>Fecha</span><input class="input" type="date" name="date" min="${today()}" value="${esc(d.date || today())}"></label>
        ${isNew ? '' : `<button type="button" class="btn danger" data-act="delete-task" data-id="${t.id}">${ic('trash-2')}Borrar tarea</button>`}
      </form>`;

    openSheet(html, (sh) => {
      const form = $('#task-form', sh);
      sh.dataset.id = isNew ? '' : t.id;
      const val = { type: d.type, cat: d.cat, prio: d.prio, slot, days: (d.days || ALL_DAYS).slice() };
      sh._val = val;
      $$('[data-group]', sh).forEach((g) => {
        g.addEventListener('click', (e) => {
          const b = e.target.closest('[data-v]'); if (!b) return;
          const key = g.dataset.group;
          if (g.dataset.multi) {
            const v = Number(b.dataset.v);
            val.days = val.days.includes(v) ? val.days.filter((x) => x !== v) : val.days.concat(v);
            b.classList.toggle('on');
          } else {
            val[key] = key === 'prio' ? Number(b.dataset.v) : b.dataset.v;
            $$('[data-v]', g).forEach((x) => x.classList.toggle('on', x === b));
            if (key === 'type') {
              $('.habit-only', sh).classList.toggle('hidden', val.type !== 'habit');
              $('.once-only', sh).classList.toggle('hidden', val.type !== 'once');
            }
          }
        });
      });
      // Al poner una hora, se elige solo el momento del día.
      form.elements.time.addEventListener('change', () => {
        if (!form.elements.time.value) return;
        val.slot = slotFromTime(form.elements.time.value);
        $$('[data-group="slot"] [data-v]', sh).forEach((x) => x.classList.toggle('on', x.dataset.v === val.slot));
      });
      form.addEventListener('submit', (e) => { e.preventDefault(); saveTaskFromSheet(sh); });
      if (isNew) form.elements.title.focus();
    });
  }

  function saveTaskFromSheet(sh) {
    const f = $('#task-form', sh).elements, val = sh._val;
    const title = f.title.value.trim();
    if (!title) { f.title.focus(); toast('notebook-pen', 'Escribe qué vas a hacer.', 2000, 'gold'); return; }
    if (val.type === 'habit' && !val.days.length) { toast('calendar', 'Elige al menos un día.', 2000, 'gold'); return; }
    const data = {
      title, mini: f.mini.value.trim(), time: f.time.value, cat: val.cat, prio: val.prio, type: val.type, slot: val.slot,
      days: val.type === 'habit' ? val.days.slice().sort() : undefined,
      date: val.type === 'once' ? (f.date.value || today()) : undefined
    };
    const id = sh.dataset.id;
    if (id) {
      Object.assign(taskById(id), data);
      toast('check', 'Tarea actualizada.', 1600, 'green');
    } else {
      state.tasks.push(Object.assign({ id: uid(), createdAt: today() }, data));
      toast('plus', `<b>${esc(title)}</b> agregada. Ahora a cumplirla.`, 2000, 'green');
    }
    closeSheet();
    commit();
  }

  function deleteTask(id) {
    const t = taskById(id);
    if (!t) return;
    if (!confirm('¿Borrar "' + t.title + '"?\n\nBorrar tareas para no fallarlas es la forma elegante de rendirse. Si de verdad ya no aplica, adelante: tu historial se mantiene.')) return;
    const hasHistory = Object.values(state.log).some((l) => l[id]);
    if (!hasHistory && t.createdAt === today()) state.tasks = state.tasks.filter((x) => x.id !== id);
    else t.deletedAt = today();
    closeSheet();
    commit();
    toast('trash-2', 'Tarea borrada.', 1600, 'red');
  }

  function addTemplate(p) {
    if (activeTasks().some((t) => t.title === p.title)) { toast('info', 'Ya tienes ese hábito.', 1600, 'blue'); return; }
    state.tasks.push({ id: uid(), createdAt: today(), type: 'habit', days: ALL_DAYS.slice(), title: p.title, mini: p.mini, cat: p.cat, time: p.time, prio: p.prio, slot: p.slot });
    commit();
    toast('plus', `<b>${esc(p.title)}</b> agregada.`, 1600, 'green');
  }

  function templatesSheet() {
    const row = (p, i, src) => {
      const has = activeTasks().some((t) => t.title === p.title);
      return `<button class="tpl${has ? ' has' : ''}" data-act="tpl-add" data-src="${src}" data-i="${i}">${medal(SLOTS[p.slot].icon, SLOTS[p.slot].tone, 'sm')}<span><b>${esc(p.title)}</b><small>${SLOTS[p.slot].label}${p.time ? ' · ' + p.time : ''} · mínimo: ${esc(p.mini)}</small></span>${ic(has ? 'check' : 'plus', 'tpl-ic')}</button>`;
    };
    openSheet(sheetHead('Hábitos de gente exitosa') +
      `<p class="muted small sheet-intro">Hábitos que repiten las personas que construyen riqueza y disciplina. Toca para agregar. Empieza con 2 o 3, no con todos.</p>
      <div class="tpl-list">${PLANTILLAS_RIQUEZA.map((p, i) => row(p, i, 'r')).join('')}</div>
      <h2 class="section-title">Básicos</h2><div class="tpl-list">${PLANTILLAS.map((p, i) => row(p, i, 'b')).join('')}</div>`);
  }

  /* ================= Modo emergencia ================= */
  let emergencyTimer = null;
  function emergencyCandidates() {
    const s = dayStats(today());
    return s.tasks.filter((t) => s.log[t.id] !== 'full')
      .sort((a, b) => (b.mini ? 1 : 0) - (a.mini ? 1 : 0) || (s.log[a.id] ? 1 : 0) - (s.log[b.id] ? 1 : 0) || (a.prio || 2) - (b.prio || 2));
  }

  function emergency(idx) {
    const list = emergencyCandidates();
    if (!list.length) {
      showOverlay(`${ovIcon('circle-check', 'green')}<h1 class="ov-title">Hoy ya cumpliste</h1><p class="ov-text">No te queda nada pendiente. Si no tienes ganas de nada más, está bien: el día ya está ganado. Descansa sin culpa.</p><button class="btn primary xl" data-act="ov-close">Cerrar</button>`, { theme: 'green' });
      return;
    }
    const i = (idx || 0) % list.length, t = list[i];
    const partner = state.settings.partner.trim();
    showOverlay(
      `${ovIcon('battery-low', 'red')}<p class="ov-kicker">Modo emergencia</p>
      <h1 class="ov-title">Solo 2 minutos</h1>
      <p class="ov-text">No tienes que tener ganas. No tienes que hacerlo todo. Solo tienes que empezar. Dos minutos y después decides.</p>
      <div class="card center"><p class="muted small">Tu tarea más fácil ahora</p><p class="em-task">${esc(t.title)}</p>
        <p class="em-mini">Solo haz esto: ${esc(t.mini || 'empezar, nada más. Dos minutos.')}</p>
        ${list.length > 1 ? `<button class="link-btn" data-act="emergency-next" data-i="${i + 1}">Darme otra opción</button>` : ''}</div>
      ${whyBig('Por esto lo haces')}
      ${partner ? `<p class="ov-text small-text">Piensa también en ${esc(partner)}: merece ver a alguien que no se rinde.</p>` : ''}
      <button class="btn primary xl" data-act="emergency-start" data-id="${t.id}">${ic('play')}Empezar 2 minutos</button>`,
      { theme: 'red' }
    );
  }

  function emergencyStart(id) {
    const t = taskById(id); if (!t) return;
    const end = Date.now() + 120000;
    showOverlay(
      `<p class="ov-kicker">Solo 2 minutos</p><h1 class="ov-title" style="font-size:26px">${esc(t.mini || t.title)}</h1>
      <div class="ring big-ring">${timerRingSvg()}<div class="center"><div class="time" id="em-time">2:00</div><div class="mode">¡Vamos!</div></div></div>
      <p class="ov-text">Deja el teléfono y hazlo. Te aviso cuando terminen los 2 minutos.</p>
      <button class="btn" data-act="emergency-done" data-id="${id}">${ic('check')}Ya lo hice</button>`,
      { theme: 'red' }
    );
    const C = 2 * Math.PI * 45;
    const upd = () => {
      const left = Math.max(0, end - Date.now());
      const el = $('#em-time'); if (!el) { clearInterval(emergencyTimer); return; }
      el.textContent = fmtClock(left);
      const pr = $('.overlay .tprog'); if (pr) pr.style.strokeDashoffset = String(C * (1 - left / 120000));
      if (left <= 0) { clearInterval(emergencyTimer); emergencyTimer = null; alarm(); notifyLocal('2 minutos cumplidos', '¿Lo hiciste? Márcalo. Y si ya arrancaste, sigue un poco más.', 'emergency'); emergencyDone(id); }
    };
    if (emergencyTimer) clearInterval(emergencyTimer);
    emergencyTimer = setInterval(upd, 250); upd();
  }

  function emergencyDone(id) {
    if (emergencyTimer) { clearInterval(emergencyTimer); emergencyTimer = null; }
    const t = taskById(id);
    showOverlay(
      `${ovIcon('party-popper', 'green')}<h1 class="ov-title">¿Lo hiciste?</h1>
      <p class="ov-text">Empezar era lo difícil y ya lo hiciste. ¿Cómo lo marcamos?</p>
      ${t.mini ? `<button class="btn good xl" data-act="emergency-mark" data-id="${id}" data-v="mini">Hice lo mínimo</button>` : ''}
      <button class="btn ${t.mini ? '' : 'good xl'}" data-act="emergency-mark" data-id="${id}" data-v="full">Hice la tarea completa</button>
      <button class="btn primary" data-act="emergency-focus" data-id="${id}">${ic('timer')}Ya arranqué: sigo con 25 min de enfoque</button>
      <button class="btn ghost" data-act="ov-close">Todavía no</button>`,
      { theme: 'green' }
    );
  }

  /* ================= Vista: ENFOQUE (Pomodoro) ================= */
  let wakeLock = null;
  function timerRingSvg() {
    const C = 2 * Math.PI * 45;
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ttrack" cx="50" cy="50" r="45"/><circle class="tprog" cx="50" cy="50" r="45" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>`;
  }
  const fmtClock = (ms) => { const sec = Math.ceil(ms / 1000); return Math.floor(sec / 60) + ':' + pad(sec % 60); };
  const timerDuration = (tm) => (tm.mode === 'focus' ? FOCUS_MIN : (tm.cycle % 4 === 0 ? LONG_BREAK_MIN : BREAK_MIN)) * 60000;
  function timerState() {
    if (!state.timer) state.timer = { mode: 'focus', running: false, endAt: 0, left: FOCUS_MIN * 60000, cycle: 0, taskId: '' };
    return state.timer;
  }
  function timerLeft(tm) { return tm.running ? Math.max(0, tm.endAt - Date.now()) : tm.left; }

  function viewEnfoque() {
    const tm = timerState(), k = today(), s = dayStats(k);
    const pending = s.tasks.filter((t) => s.log[t.id] !== 'full');
    const n = state.pomos[k] || 0;
    const left = timerLeft(tm), idle = !tm.running && tm.left === timerDuration(tm);
    const ft = tm.taskId && taskById(tm.taskId);
    let buttons;
    if (tm.running) buttons = `<div class="btn-row"><button class="btn xl" data-act="t-pause">${ic('pause')}Pausar</button><button class="btn xl" data-act="t-stop">${ic('square')}Parar</button></div>`;
    else if (!idle) buttons = `<button class="btn primary xl" data-act="t-resume">${ic('play')}Continuar</button><button class="btn" data-act="t-stop">Reiniciar</button>`;
    else buttons = `<button class="btn primary xl pulse" data-act="t-start">${ic('play')}${tm.mode === 'focus' ? 'Empezar ahora' : 'Empezar descanso'}</button>${tm.mode === 'break' ? '<button class="btn" data-act="t-skip">Saltar descanso</button>' : ''}`;
    return `<div class="stack">
      <div><h1 class="page-title">Modo enfoque</h1><p class="page-sub">25 min de foco + 5 de descanso. No necesitas ganas, solo empezar.</p></div>
      ${tm.mode === 'focus' && !tm.running ? `<label class="field"><span>¿En qué te vas a enfocar?</span><select class="input" data-act-change="t-task"><option value="">Sin tarea específica</option>${pending.map((t) => `<option value="${t.id}"${t.id === tm.taskId ? ' selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label>`
        : (ft ? `<p class="focus-task">${ic('target')}${esc(ft.title)}</p>` : '')}
      <div class="timer-wrap"><div class="ring big-ring ${tm.mode === 'break' ? 'break' : ''}${tm.running ? ' running' : ''}">${timerRingSvg()}
        <div class="center"><div class="time" id="t-time">${fmtClock(left)}</div><div class="mode">${tm.mode === 'focus' ? 'Enfoque' : 'Descanso'}</div></div></div>
        <div class="pomo-dots">${[0, 1, 2, 3].map((i) => `<i class="${i < tm.cycle % 4 || (tm.cycle && tm.cycle % 4 === 0 && tm.mode === 'break') ? 'on' : ''}"></i>`).join('')}</div></div>
      ${buttons}
      ${ft && s.log[ft.id] !== 'full' && n ? `<button class="btn good" data-act="toggle" data-id="${ft.id}">${ic('check')}Marcar "${esc(ft.title)}" como hecha</button>` : ''}
      <div class="tiles"><div class="tile">${medal('timer', 'fire', 'sm')}<b data-count="${n}">${n}</b><span>pomodoros hoy</span><small>${n * FOCUS_MIN} min de foco</small></div>
      <div class="tile">${medal('brain', 'purple', 'sm')}<b data-count="${pointsInfo().pomos}">${pointsInfo().pomos}</b><span>en total</span><small>+8 pts cada uno</small></div></div>
      <div class="card"><h3>Consejos para no distraerte</h3><p class="muted small">Activa el modo No molestar del iPhone, deja el teléfono boca abajo y no abras nada más hasta que suene. La pantalla se mantiene encendida mientras corre el tiempo. Si sales de la app, el tiempo sigue contando y al volver se actualiza.</p></div>
    </div>`;
  }

  function updateTimerUI() {
    if (route.tab !== 'enfoque') return;
    const tm = timerState(), el = $('#t-time');
    if (!el) return;
    const left = timerLeft(tm);
    el.textContent = fmtClock(left);
    const pr = $('.view .tprog');
    if (pr) pr.style.strokeDashoffset = String(2 * Math.PI * 45 * (1 - left / timerDuration(tm)));
  }

  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
      if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; }
  }

  function timerStart() {
    const tm = timerState();
    tm.running = true; tm.endAt = Date.now() + tm.left;
    keepAwake(true); save(); render();
  }
  function timerPause() { const tm = timerState(); tm.left = timerLeft(tm); tm.running = false; keepAwake(false); save(); render(); }
  function timerStop() { const tm = timerState(); tm.running = false; tm.mode = 'focus'; tm.left = timerDuration(tm); keepAwake(false); save(); render(); }

  // Revisa si el temporizador terminó (también si la app estuvo cerrada).
  function timerCheck() {
    const tm = state.timer;
    if (!tm || !tm.running) return;
    let changed = false;
    while (tm.running && Date.now() >= tm.endAt) {
      changed = true;
      const endedAt = tm.endAt;
      if (tm.mode === 'focus') {
        const k = dkey(new Date(endedAt));
        state.pomos[k] = (state.pomos[k] || 0) + 1;
        tm.cycle++; tm.mode = 'break';
        tm.endAt = endedAt + timerDuration(tm); tm.left = timerDuration(tm);
        if (Date.now() - endedAt < 60000) {
          alarm();
          toast('timer', `<b>¡Pomodoro completado! +8 pts.</b> Descansa ${timerDuration(tm) / 60000} min.`, 4000, 'fire');
          notifyLocal('Pomodoro completado', 'Bien hecho. Descansa ' + timerDuration(tm) / 60000 + ' minutos.', 'pomo');
        }
      } else {
        tm.mode = 'focus'; tm.running = false; tm.left = timerDuration(tm);
        keepAwake(false);
        if (Date.now() - endedAt < 60000) {
          alarm();
          toast('timer', 'Descanso terminado. ¿Otro pomodoro? Toca <b>Empezar ahora</b>.', 4000, 'blue');
          notifyLocal('Se acabó el descanso', 'Vuelve: otro bloque de 25 minutos.', 'pomo');
        }
      }
    }
    if (changed) commit(); else updateTimerUI();
  }
  setInterval(timerCheck, 500);

  /* ================= Vista: DINERO ================= */
  function viewDinero() {
    const k = today(), ws = weekStart(k), w = moneyWeek(ws), mi = moneyInfo(), c = moneyCoach();
    const st = state.settings;
    const out = [];
    out.push(`<div><h1 class="page-title">Dinero</h1><p class="page-sub">Lo que no se mide, no crece.</p></div>`);

    out.push(`<section class="card money-hero">
      <div class="mh-ring">${ring(w.goal ? w.income / w.goal : 0, w.met ? 'green' : 'gold')}<div class="center"><span>esta semana</span><b data-count="${w.income}" data-fmt="money">${fmtMoney(w.income)}</b><span>de ${fmtMoney(w.goal)}</span></div></div>
      <div class="mh-stats">
        <div>${ic(w.met ? 'circle-check' : 'target')}<b>${w.met ? 'Meta cumplida' : 'Faltan ' + fmtMoney(w.left)}</b><span>${w.met ? '¡Bien hecho!' : `${fmtMoney(Math.ceil(w.perDay))} por día · ${w.daysLeft} ${w.daysLeft === 1 ? 'día' : 'días'}`}</span></div>
        <div>${ic('flame')}<b>${mi.streak} ${mi.streak === 1 ? 'semana' : 'semanas'}</b><span>cumpliendo la meta</span></div>
      </div>
    </section>`);

    out.push(`<div class="btn-row money-btns"><button class="btn good" data-act="money-add" data-type="income">${ic('trending-up')}Ingreso</button><button class="btn primary" data-act="money-add" data-type="saving">${ic('piggy-bank')}Ahorro</button></div>`);

    out.push(`<section class="card coach ${c.tone}"><div class="coach-head">${medal('megaphone', c.tone === 'good' ? 'green' : c.tone === 'bad' ? 'red' : 'gold', 'sm')}<span>Coach financiero</span></div><p>${esc(c.text)}</p></section>`);

    // Págate primero
    out.push(`<section class="card">
      <div class="progress-head"><b>${ic('hand-coins')}Págate primero (${st.saveRate}%)</b><span>${fmtMoney(w.saved)} de ${fmtMoney(w.toSave)}</span></div>
      ${bar(w.toSave ? w.saved / w.toSave : 0, w.saved >= w.toSave && w.toSave > 0 ? 'good' : '')}
      <p class="muted small">${w.income ? `Esta semana ganaste ${fmtMoney(w.income)}. Separa al menos el ${st.saveRate}% antes de gastar.` : `Cada vez que ganes algo, separa primero el ${st.saveRate}% para ti.`}</p>
    </section>`);

    // Metas de ahorro
    out.push(`<h2 class="section-title row-title"><span>Metas de ahorro</span><button class="link-btn" data-act="goal-add">${ic('plus')}Nueva meta</button></h2>`);
    if (mi.goals.length) {
      out.push('<div class="goals">' + mi.goals.map((g) => {
        const p = g.target ? g.saved / g.target : 0;
        const rate = mi.avgWeeklySaving;
        const eta = g.done ? 'Meta cumplida' : rate > 0 ? `A tu ritmo: ~${Math.ceil((g.target - g.saved) / rate)} semanas` : 'Aporta cada semana para llegar';
        return `<button class="card tap goal${g.done ? ' done' : ''}" data-act="goal-open" data-id="${g.id}">
          <div class="goal-top">${medal(g.done ? 'trophy' : 'goal', g.done ? 'gold' : 'green', 'sm')}<div class="goal-name"><b>${esc(g.name)}</b><span>${eta}${g.deadline ? ' · fecha: ' + fmtShort(g.deadline) : ''}</span></div><b class="goal-pct">${pct(clamp01(p))}</b></div>
          ${bar(p, 'good')}
          <div class="goal-nums"><span>${fmtMoney(g.saved)}</span><span>${fmtMoney(g.target)}</span></div>
        </button>`;
      }).join('') + '</div>');
    } else {
      out.push(`<button class="card tap card-row" data-act="goal-add">${medal('goal', 'green')}<div><h3>Crea tu primera meta</h3><p class="muted small">Fondo de emergencia, un viaje${st.partner.trim() ? ' con ' + esc(st.partner.trim()) : ''}, tu negocio… Ponle nombre y cifra.</p></div>${ic('chevron-right', 'chev')}</button>`);
    }

    // Totales y gráfico de 8 semanas
    let bars = '', maxV = st.moneyGoal || 1;
    const weeks = Array.from({ length: 8 }, (_, i) => moneyWeek(addDays(ws, -7 * (7 - i))));
    weeks.forEach((x) => { maxV = Math.max(maxV, x.income); });
    weeks.forEach((x) => {
      bars += `<div><i class="${x.met ? 'won' : x.income ? '' : 'none'}" style="--h:${Math.max(3, Math.round((x.income / maxV) * 100))}"></i><span>${fmtShort(x.ws).split(' ')[0]}</span></div>`;
    });
    out.push(`<h2 class="section-title">Ingresos por semana</h2><div class="card">
      <div class="vbars money-bars" style="--goal:${Math.round(((st.moneyGoal || 0) / maxV) * 100)}">${bars}<em class="goal-line"><span>meta ${fmtMoney(st.moneyGoal)}</span></em></div>
      <div class="tiles tiles-in"><div class="tile">${medal('piggy-bank', 'green', 'sm')}<b data-count="${mi.totalSaved}" data-fmt="money">${fmtMoney(mi.totalSaved)}</b><span>ahorrado en total</span></div>
      <div class="tile">${medal('banknote', 'gold', 'sm')}<b data-count="${mi.totalIncome}" data-fmt="money">${fmtMoney(mi.totalIncome)}</b><span>ingresos registrados</span></div></div></div>`);

    // Proyección con interés compuesto
    const weekly = Math.max(mi.avgWeeklySaving, (st.moneyGoal || 0) * (st.saveRate || 0) / 100);
    if (weekly > 0) {
      out.push(`<h2 class="section-title">Si sigues así</h2><div class="card">
        <p class="small">Ahorrando <b>${fmtMoney(Math.round(weekly))}</b> por semana e invirtiéndolo al 8% anual:</p>
        <div class="proj">${[1, 5, 10, 20].map((y) => `<div><span>${y} ${y === 1 ? 'año' : 'años'}</span><b>${fmtMoney(Math.round(projection(weekly, y, 0.08)))}</b><small>pusiste ${fmtMoney(Math.round(weekly * 52 * y))}</small></div>`).join('')}</div>
        <p class="muted tiny">Estimación con interés compuesto, solo para motivarte. No es asesoría financiera: los rendimientos reales cambian.</p></div>`);
    }

    // Mentalidad
    const rule = ruleFor(k);
    out.push(`<h2 class="section-title">Mentalidad de riqueza</h2>
      <section class="card rule-card">${medal('landmark', 'gold')}<div><div class="kicker">Regla del día</div><h3>${esc(rule.t)}</h3><p class="muted small">${esc(rule.d)}</p></div></section>
      <button class="card tap card-row" data-act="templates">${medal('crown', 'gold')}<div><h3>Hábitos de gente exitosa</h3><p class="muted small">Levantarte temprano, trabajar en tu negocio, leer, ahorrar primero… agrégalos con un toque.</p></div>${ic('chevron-right', 'chev')}</button>
      <details class="card ideas"><summary>${medal('sparkles', 'purple', 'sm')}<b>Ideas para generar tus ${fmtMoney(st.moneyGoal)} de la semana</b>${ic('chevron-right', 'chev')}</summary><ul>${window.IDEAS_INGRESO.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`);

    // Movimientos
    const recent = money().entries.slice().sort((a, b) => (b.date + b.id < a.date + a.id ? -1 : 1)).slice(0, 12);
    out.push(`<h2 class="section-title">Últimos movimientos</h2>`);
    out.push(recent.length ? `<div class="menu">${recent.map((e) => {
      const g = e.goalId && money().goals.find((x) => x.id === e.goalId);
      const icon = e.type === 'income' ? 'trending-up' : e.type === 'saving' ? 'piggy-bank' : 'arrow-down';
      const label = e.type === 'income' ? 'Ingreso' : e.type === 'saving' ? 'Ahorro' : 'Retiro de ahorro';
      return `<button data-act="money-del" data-id="${e.id}">${medal(icon, e.type === 'withdraw' ? 'red' : e.type === 'saving' ? 'blue' : 'green', 'sm')}<span class="mt">${label}${e.note ? ': ' + esc(e.note) : ''}<small>${cap(fmtLong(e.date))}${g ? ' · ' + esc(g.name) : ''}</small></span><b class="amt ${e.type}">${e.type === 'withdraw' ? '−' : '+'}${fmtMoney(e.amount)}</b></button>`;
    }).join('')}</div><p class="muted tiny center">Toca un movimiento para borrarlo.</p>` : '<div class="card"><p class="muted">Todavía no hay movimientos. Registra tu primer ingreso o ahorro con los botones de arriba.</p></div>');

    out.push(`<div class="card"><div class="toggle-row"><div><h3>Meta semanal</h3><p class="muted small">Cuánto quieres generar cada semana</p></div><button class="btn sm" data-act="money-settings">${fmtMoney(st.moneyGoal)} · ${st.saveRate}%</button></div></div>`);
    return '<div class="stack">' + out.join('') + '</div>';
  }

  function moneySheet(type, goalId) {
    const goals = moneyInfo().goals.filter((g) => !g.done || g.id === goalId);
    openSheet(sheetHead('Registrar dinero', 'money-save') +
      `<form id="money-form" class="stack" autocomplete="off">
        <div class="seg seg3" data-group="mtype">${[['income', 'trending-up', 'Ingreso'], ['saving', 'piggy-bank', 'Ahorro'], ['withdraw', 'arrow-down', 'Retiro']].map(([v, i, l]) => `<button type="button" data-v="${v}" class="${type === v ? 'on' : ''}">${ic(i)}${l}</button>`).join('')}</div>
        <p class="muted small" id="mtype-hint"></p>
        <div class="money-input"><span>${esc(cur())}</span><input name="amount" inputmode="decimal" placeholder="0" autocomplete="off" enterkeyhint="done"></div>
        <div class="chips center">${[5, 10, 20, 50, 100].map((v) => `<button type="button" class="chip" data-add="${v}">+${v}</button>`).join('')}</div>
        <label class="field"><span>Nota (opcional)</span><input class="input" name="note" maxlength="60" placeholder="Ej: venta, trabajo extra, sueldo"></label>
        <label class="field goal-field"><span>Meta de ahorro</span><select class="input" name="goal"><option value="">Sin meta específica</option>${goals.map((g) => `<option value="${g.id}"${g.id === goalId ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
        <label class="field"><span>Fecha</span><input class="input" type="date" name="date" max="${today()}" value="${today()}"></label>
        <button type="submit" class="btn primary xl">Guardar</button>
      </form>`, (sh) => {
      const form = $('#money-form', sh);
      sh._type = type;
      const hints = { income: 'Dinero que ganaste: ventas, trabajos, sueldo. Cuenta para tu meta semanal.', saving: 'Dinero que separaste y no vas a gastar.', withdraw: 'Dinero que sacaste de tus ahorros.' };
      const sync = () => { $('#mtype-hint', sh).textContent = hints[sh._type]; $('.goal-field', sh).classList.toggle('hidden', sh._type === 'income'); };
      $('[data-group="mtype"]', sh).addEventListener('click', (e) => {
        const b = e.target.closest('[data-v]'); if (!b) return;
        sh._type = b.dataset.v;
        $$('[data-group="mtype"] [data-v]', sh).forEach((x) => x.classList.toggle('on', x === b));
        sync();
      });
      $$('[data-add]', sh).forEach((b) => b.addEventListener('click', () => {
        form.elements.amount.value = String(Math.round((parseMoney(form.elements.amount.value) + Number(b.dataset.add)) * 100) / 100);
      }));
      form.addEventListener('submit', (e) => { e.preventDefault(); saveMoney(sh); });
      sync();
      form.elements.amount.focus();
    });
  }

  function saveMoney(sh) {
    const f = $('#money-form', sh).elements, type = sh._type;
    const amount = parseMoney(f.amount.value);
    if (!(amount > 0)) { f.amount.focus(); toast('circle-dollar-sign', 'Escribe una cantidad.', 2000, 'gold'); return; }
    const before = moneyWeek(weekStart(today()));
    const goalsDoneBefore = moneyInfo().goalsDone;
    const date = f.date.value && f.date.value <= today() ? f.date.value : today();
    money().entries.push({ id: uid(), date, type, amount, note: f.note.value.trim(), goalId: type === 'income' ? '' : f.goal.value });
    closeSheet();
    commit();
    coin();
    const after = moneyWeek(weekStart(today()));
    if (after.met && !before.met) {
      confetti(160); chime();
      queueOverlay(() => showOverlay(`${ovIcon('trending-up', 'green')}<p class="ov-kicker">Meta semanal</p><h1 class="ov-title">${fmtMoney(after.income)} esta semana</h1><p class="ov-text">Cumpliste tu meta de ${fmtMoney(after.goal)}. Ahora págate primero: separa al menos ${fmtMoney(after.toSave)} para tu ahorro.</p><button class="btn primary xl" data-act="ov-close">Seguir</button>`, { theme: 'green' }));
    } else if (moneyInfo().goalsDone > goalsDoneBefore) {
      confetti(160); chime();
      toast('trophy', '<b>¡Meta de ahorro cumplida!</b> +100 pts', 3500, 'gold');
    } else {
      const msg = type === 'income' ? (after.met ? 'Ingreso anotado.' : `Ingreso anotado. Te faltan ${fmtMoney(after.left)} esta semana.`) : type === 'saving' ? 'Ahorro guardado. Tu yo del futuro te lo agradece.' : 'Retiro anotado.';
      toast(type === 'income' ? 'trending-up' : type === 'saving' ? 'piggy-bank' : 'arrow-down', `${msg} <b>${type === 'withdraw' ? '−' : '+'}${fmtMoney(amount)}</b>`, 2600, type === 'withdraw' ? 'red' : 'green');
    }
  }

  function goalSheet(g) {
    const isNew = !g;
    const mg = g ? moneyInfo().goals.find((x) => x.id === g.id) : null;
    const partner = state.settings.partner.trim();
    openSheet(sheetHead(isNew ? 'Nueva meta de ahorro' : 'Meta de ahorro', 'goal-save') +
      `<form id="goal-form" class="stack" autocomplete="off">
        ${mg ? `<div class="card center"><b class="big-num">${fmtMoney(mg.saved)}</b><p class="muted small">de ${fmtMoney(mg.target)} · ${pct(clamp01(mg.saved / mg.target))}</p>${bar(mg.saved / mg.target, 'good')}</div>
          <button type="button" class="btn good" data-act="goal-contribute" data-id="${g.id}">${ic('piggy-bank')}Aportar a esta meta</button>` : ''}
        <label class="field"><span>Nombre</span><input class="input big" name="name" maxlength="40" placeholder="Ej: Fondo de emergencia" value="${esc(g ? g.name : '')}"></label>
        <div class="chips">${['Fondo de emergencia', 'Mi negocio', 'Viaje' + (partner ? ' con ' + partner : ''), 'Invertir', 'Estudios'].map((x) => `<button type="button" class="chip" data-name="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        <label class="field"><span>¿Cuánto necesitas?</span><div class="money-input"><span>${esc(cur())}</span><input name="target" inputmode="decimal" placeholder="1000" value="${g ? g.target : ''}"></div></label>
        <label class="field"><span>Fecha límite (opcional)</span><input class="input" type="date" name="deadline" min="${today()}" value="${esc(g && g.deadline ? g.deadline : '')}"></label>
        <button type="submit" class="btn primary xl">${isNew ? 'Crear meta' : 'Guardar cambios'}</button>
        ${isNew ? '' : `<button type="button" class="btn danger" data-act="goal-del" data-id="${g.id}">${ic('trash-2')}Borrar meta</button>`}
      </form>`, (sh) => {
      const form = $('#goal-form', sh);
      sh.dataset.id = g ? g.id : '';
      $$('[data-name]', sh).forEach((b) => b.addEventListener('click', () => { form.elements.name.value = b.dataset.name; }));
      form.addEventListener('submit', (e) => { e.preventDefault(); saveGoal(sh); });
      if (isNew) form.elements.name.focus();
    });
  }

  function saveGoal(sh) {
    const f = $('#goal-form', sh).elements;
    const name = f.name.value.trim(), target = parseMoney(f.target.value);
    if (!name) { f.name.focus(); toast('goal', 'Ponle un nombre a tu meta.', 2000, 'gold'); return; }
    if (!(target > 0)) { f.target.focus(); toast('circle-dollar-sign', '¿Cuánto necesitas? Escribe una cifra.', 2000, 'gold'); return; }
    const id = sh.dataset.id;
    if (id) Object.assign(money().goals.find((x) => x.id === id), { name, target, deadline: f.deadline.value || '' });
    else money().goals.push({ id: uid(), name, target, deadline: f.deadline.value || '', createdAt: today() });
    closeSheet();
    commit();
    toast('goal', id ? 'Meta actualizada.' : `Meta creada: <b>${esc(name)}</b>. Ahora a llenarla.`, 2400, 'green');
  }

  function moneySettingsSheet() {
    const st = state.settings;
    openSheet(sheetHead('Meta de dinero', 'money-settings-save') +
      `<form id="ms-form" class="stack">
        <label class="field"><span>Meta semanal de ingresos</span><div class="money-input"><span>${esc(cur())}</span><input name="goal" inputmode="decimal" value="${st.moneyGoal}"></div></label>
        <div class="field"><span>Págate primero: % de lo que ganas que vas a ahorrar</span><div class="seg" data-group="rate">${[10, 20, 30, 50].map((v) => `<button type="button" data-v="${v}" class="${st.saveRate === v ? 'on' : ''}">${v}%</button>`).join('')}</div></div>
        <label class="field"><span>Símbolo de moneda</span><input class="input" name="currency" maxlength="4" value="${esc(cur())}"></label>
        <button type="submit" class="btn primary xl">Guardar</button>
      </form>`, (sh) => {
      sh._rate = st.saveRate;
      $('[data-group="rate"]', sh).addEventListener('click', (e) => {
        const b = e.target.closest('[data-v]'); if (!b) return;
        sh._rate = Number(b.dataset.v);
        $$('[data-group="rate"] [data-v]', sh).forEach((x) => x.classList.toggle('on', x === b));
      });
      $('#ms-form', sh).addEventListener('submit', (e) => { e.preventDefault(); ACTIONS['money-settings-save'](); });
    });
  }

  /* ================= Vista: PROGRESO ================= */
  function viewStats() {
    const k = today(), si = streakInfo(), pi = pointsInfo();
    const ws = weekStart(k), wk = weekStats(ws);
    const ms = k.slice(0, 8) + '01', mo = rangeStats(ms, k);
    const out = [];
    out.push('<div><h1 class="page-title">Progreso</h1><p class="page-sub">Lo que no se mide, no mejora.</p></div>');
    out.push(`<div class="tiles">
      <div class="tile">${medal('calendar', 'blue', 'sm')}<b>${pct(wk.pct)}</b><span>esta semana</span><small>${wk.done} de ${wk.total} tareas</small></div>
      <div class="tile">${medal('chart-column', 'purple', 'sm')}<b>${pct(mo.pct)}</b><span>este mes</span><small>${mo.won} ${mo.won === 1 ? 'día ganado' : 'días ganados'} · ${mo.lost} ${mo.lost === 1 ? 'perdido' : 'perdidos'}</small></div>
      <div class="tile">${medal('flame', 'fire', 'sm')}<b data-count="${si.current}">${si.current}</b><span>racha actual</span><small>récord: ${si.best} días</small></div>
      <div class="tile">${medal('circle-check', 'green', 'sm')}<b data-count="${pi.totalDone}">${pi.totalDone}</b><span>tareas hechas</span><small>${pi.pomos} pomodoros · ${pi.minis} mínimas</small></div>
    </div>`);

    if (si.doubleFails) out.push(`<div class="alert warn">${ic('triangle-alert', 'ai')}<div>Has fallado dos días seguidos ${si.doubleFails} ${si.doubleFails === 1 ? 'vez' : 'veces'}. Esa es la única regla que no se rompe: después de un fallo, el día siguiente se gana sí o sí.</div></div>`);

    // Mapa de calor
    const WEEKS = 18;
    const start = addDays(ws, -7 * (WEEKS - 1));
    let cells = '';
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const dk = addDays(start, w * 7 + d), s = dayStats(dk);
        let cls = 'none';
        if (s.status === 'future') cls = 'out';
        else if (s.total && s.status !== 'before') {
          if (s.pct === 1) cls = 'l4';
          else if (s.status === 'won') cls = s.pct >= 0.9 ? 'l3' : 'l2';
          else cls = s.pct > 0 ? 'l1' : 'l0';
        }
        cells += `<i class="${cls}${dk === k ? ' today' : ''}" style="--d:${w}"></i>`;
      }
    }
    out.push(`<h2 class="section-title">Mapa de constancia</h2><div class="card"><div class="heat-wrap"><div class="heat-days">${WEEK_ORDER.map((i, n) => `<span>${n % 2 === 0 ? DIAS_LETRA[i] : ''}</span>`).join('')}</div><div class="heat">${cells}</div></div>
      <div class="legend">Fallado <i class="l0"></i><i class="l1"></i> Ganado <i class="l2"></i><i class="l3"></i><i class="l4"></i> 100%</div></div>`);

    // Últimos 7 días
    let bars = '';
    for (let i = 6; i >= 0; i--) {
      const dk = addDays(k, -i), s = dayStats(dk);
      const h = s.total && s.status !== 'before' ? Math.max(4, Math.round(s.pct * 100)) : 4;
      bars += `<div><i class="${!s.total || s.status === 'before' ? 'none' : s.status === 'won' ? 'won' : ''}" style="--h:${h}"></i><span>${DIAS_CORTO[weekday(dk)].slice(0, 2)}</span></div>`;
    }
    out.push(`<h2 class="section-title">Últimos 7 días</h2><div class="card"><div class="vbars">${bars}</div></div>`);

    // Por momento del día (30 días)
    const slotAgg = {};
    for (let dk = addDays(k, -29); dk < k; dk = addDays(dk, 1)) {
      if (dk < state.createdAt) continue;
      const s = dayStats(dk);
      for (const t of s.tasks) { const sl = slotOf(t), a = slotAgg[sl] || (slotAgg[sl] = { t: 0, d: 0 }); a.t++; if (s.log[t.id]) a.d++; }
    }
    if (Object.keys(slotAgg).length) {
      out.push(`<h2 class="section-title">Por momento del día (30 días)</h2><div class="card"><div class="bars">${SLOT_ORDER.filter((sl) => slotAgg[sl]).map((sl) => {
        const r = slotAgg[sl].d / slotAgg[sl].t;
        return `<div class="bar-row"><span>${ic(SLOTS[sl].icon)}${SLOTS[sl].label}</span>${bar(r, r * 100 >= state.settings.threshold ? 'good' : '')}<b>${pct(r)}</b></div>`;
      }).join('')}</div></div>`);
    }

    // Mejores y peores días de la semana
    const agg = {}; WEEK_ORDER.forEach((d) => { agg[d] = { t: 0, d: 0 }; });
    for (let dk = state.createdAt; dk < k; dk = addDays(dk, 1)) {
      const s = dayStats(dk);
      if (!s.total) continue;
      agg[weekday(dk)].t += s.total; agg[weekday(dk)].d += s.done;
    }
    const withData = WEEK_ORDER.filter((d) => agg[d].t);
    out.push('<h2 class="section-title">Mejores y peores días</h2>');
    if (withData.length >= 2) {
      const rate = (d) => agg[d].d / agg[d].t;
      const best = withData.reduce((a, b) => (rate(b) > rate(a) ? b : a));
      const worst = withData.reduce((a, b) => (rate(b) < rate(a) ? b : a));
      out.push(`<div class="card"><div class="bars">${WEEK_ORDER.map((d) => {
        const r = agg[d].t ? rate(d) : null;
        const cls = d === best && r != null ? 'best' : d === worst && r != null && best !== worst ? 'worst' : '';
        return `<div class="bar-row ${cls}"><span>${cap(DIAS[d]).slice(0, 3)}${cls === 'best' ? ic('arrow-up') : cls === 'worst' ? ic('arrow-down') : ''}</span>${bar(r || 0, r != null && r * 100 >= state.settings.threshold ? 'good' : '')}<b>${pct(r)}</b></div>`;
      }).join('')}</div><p class="muted small">Tu mejor día es el <b>${DIAS[best]}</b>. El <b>${DIAS[worst]}</b> es tu punto débil: planéalo con más cuidado.</p></div>`);
    } else {
      out.push('<div class="card"><p class="muted">Necesito un par de días más de datos para decirte cuáles son tus mejores y peores días.</p></div>');
    }

    // Tarea más fallada
    const fails = state.tasks.map((t) => {
      let sched = 0, miss = 0;
      for (let dk = state.createdAt; dk < k; dk = addDays(dk, 1)) {
        if (!isScheduled(t, dk)) continue;
        sched++; if (!(state.log[dk] || {})[t.id]) miss++;
      }
      return { t, sched, miss };
    }).filter((x) => x.miss > 0).sort((a, b) => b.miss - a.miss || b.miss / b.sched - a.miss / a.sched).slice(0, 3);
    out.push(`<h2 class="section-title">Tu talón de Aquiles</h2><div class="card">${fails.length
      ? fails.map((x, i) => `<div class="fail-row"><div class="progress-head"><b>${i === 0 ? ic('target') : ''}${esc(x.t.title)}${x.t.deletedAt ? ' <span class="muted small">(borrada)</span>' : ''}</b><span>falló ${x.miss} de ${x.sched}</span></div>${bar(1 - x.miss / x.sched)}</div>`).join('') +
        (fails[0].t.mini ? '' : `<p class="muted small">Consejo: ponle una versión mínima a "${esc(fails[0].t.title)}" para que nunca falle por completo.</p>`)
      : '<p class="muted">Todavía no has fallado ninguna tarea. Sigue así.</p>'}</div>`);

    // Por categoría (últimos 30 días)
    const catAgg = {};
    for (let dk = addDays(k, -29); dk <= k; dk = addDays(dk, 1)) {
      if (dk < state.createdAt) continue;
      const s = dayStats(dk);
      for (const t of s.tasks) { const c = catAgg[t.cat] || (catAgg[t.cat] = { t: 0, d: 0 }); c.t++; if (s.log[t.id]) c.d++; }
    }
    const cats = Object.keys(catAgg);
    if (cats.length) {
      out.push(`<h2 class="section-title">Por categoría (30 días)</h2><div class="card"><div class="bars">${cats.map((c) => {
        const r = catAgg[c].d / catAgg[c].t, cat = CATS[c] || CATS.personal;
        return `<div class="bar-row"><span>${ic(cat.icon)}${cat.label}</span>${bar(r, r * 100 >= state.settings.threshold ? 'good' : '')}<b>${pct(r)}</b></div>`;
      }).join('')}</div></div>`);
    }
    return '<div class="stack">' + out.join('') + '</div>';
  }

  /* ================= Vista: DIARIO ================= */
  const MOODS = ['frown', 'annoyed', 'meh', 'smile', 'laugh'];
  function viewDiario() {
    const rd = reviewDay(), entry = state.journal[rd];
    const keys = Object.keys(state.journal).sort().reverse();
    const out = [`<a href="#mas" class="back">${ic('chevron-left')}Más</a><div><h1 class="page-title">Diario</h1><p class="page-sub">Cada noche, un minuto para mirarte de frente.</p></div>`];
    if (!entry) out.push(`<button class="btn primary xl" data-act="review">${ic('moon')}Hacer la revisión de ${rd === today() ? 'hoy' : 'anoche'}</button>`);
    if (!keys.length) out.push(`<div class="card empty">${medal('notebook-pen', 'blue', 'lg')}<h3>Tu diario está vacío</h3><p>Haz tu primera revisión esta noche. Escribir qué te frenó es la forma más rápida de dejar de tropezar con lo mismo.</p></div>`);
    keys.forEach((key) => {
      const e = state.journal[key], s = dayStats(key);
      out.push(`<article class="entry"><div class="ed"><span>${cap(fmtLong(key))}</span><span class="ed-r">${e.mood ? ic(MOODS[e.mood - 1], 'mood-ic') : ''}${s.total ? `<em class="${s.status === 'won' ? 'ok' : s.status === 'lost' ? 'ko' : ''}">${s.done}/${s.total}</em>` : ''}</span></div><dl>
        ${e.won ? `<dt>Lo que logré</dt><dd>${esc(e.won)}</dd>` : ''}
        ${e.blocked ? `<dt>Lo que me frenó</dt><dd>${esc(e.blocked)}</dd>` : ''}
        ${e.tomorrow ? `<dt>Lo que haré mañana</dt><dd>${esc(e.tomorrow)}</dd>` : ''}
        </dl><button class="link-btn" data-act="review" data-k="${key}">Editar</button></article>`);
    });
    return '<div class="stack">' + out.join('') + '</div>';
  }

  function reviewOverlay(k) {
    k = k || reviewDay();
    const e = state.journal[k] || {}, s = dayStats(k);
    const done = s.tasks.filter((t) => s.log[t.id]);
    const mood = e.mood || 0;
    showOverlay(
      `${ovIcon('moon', 'blue')}<p class="ov-kicker">${fmtLong(k)}</p><h1 class="ov-title">Revisión de la noche</h1>
      <div class="card"><div class="progress-head"><b>${s.total ? s.done + ' de ' + s.total + ' tareas' : 'Sin tareas'}</b><span>${s.status === 'won' ? 'Día ganado' : s.total ? 'Día no ganado' : ''}</span></div>
        ${done.length ? `<ul class="done-list">${done.map((t) => `<li>${esc(t.title)}${s.log[t.id] === 'mini' ? ' (mínimo)' : ''}</li>`).join('')}</ul>` : '<p class="muted small">Hoy no marcaste ninguna tarea.</p>'}</div>
      <div class="field"><span>¿Cómo fue tu día?</span><div class="mood" id="mood">${MOODS.map((m, i) => `<button type="button" data-v="${i + 1}" class="${mood === i + 1 ? 'on' : ''}" aria-label="${i + 1} de 5">${ic(m)}</button>`).join('')}</div></div>
      <label class="field"><span>¿Qué logré hoy?</span><textarea class="input" id="r-won" placeholder="Aunque sea pequeño. Escríbelo.">${esc(e.won)}</textarea></label>
      <label class="field"><span>¿Qué me frenó?</span><textarea class="input" id="r-blocked" placeholder="Sé honesto: el teléfono, el cansancio, la flojera…">${esc(e.blocked)}</textarea></label>
      <label class="field"><span>¿Qué haré mañana?</span><textarea class="input" id="r-tomorrow" placeholder="Lo primero que harás al despertar.">${esc(e.tomorrow)}</textarea></label>
      <button class="btn primary xl" data-act="review-save" data-k="${k}">Guardar y cerrar el día</button>`,
      {
        theme: 'blue',
        onMount: (el) => {
          el.dataset.mood = mood;
          $('#mood', el).addEventListener('click', (ev) => {
            const b = ev.target.closest('[data-v]'); if (!b) return;
            el.dataset.mood = b.dataset.v;
            $$('#mood button', el).forEach((x) => x.classList.toggle('on', x === b));
          });
        }
      }
    );
  }

  function reviewSave(k) {
    const el = $('.overlay');
    const first = !state.journal[k];
    state.journal[k] = {
      won: $('#r-won').value.trim(), blocked: $('#r-blocked').value.trim(), tomorrow: $('#r-tomorrow').value.trim(),
      mood: Number(el.dataset.mood) || 0, at: Date.now()
    };
    const s = dayStats(k);
    closeOverlay();
    commit();
    if (first) toast('moon', (s.status === 'won' ? 'Día cerrado y ganado. Descansa: mañana se gana otra vez.' : 'Día cerrado. Hoy no salió, pero ya sabes qué te frenó. Mañana no se falla.') + ' <b>+5 pts</b>', 4000, 'blue');
  }

  /* ================= Vista: MÁS (y subpáginas) ================= */
  function viewMas(sub) {
    if (sub && SUBS[sub]) return `<a href="#mas" class="back">${ic('chevron-left')}Más</a>` + SUBS[sub]();
    const lv = levelInfo();
    const unlocked = Object.keys(state.achievements).length;
    const item = (href, icon, tone, title, desc) => `<a href="${href}">${medal(icon, tone, 'sm')}<span class="mt">${title}<small>${desc}</small></span>${ic('chevron-right', 'chev')}</a>`;
    return `<div class="stack"><div><h1 class="page-title">Más</h1><p class="page-sub">Tu porqué, tus compromisos, tus logros y ajustes.</p></div>
      <section class="card level-card"><div class="lvl">${medal('award', 'gold')}<div><b>Nivel ${lv.num} · ${esc(lv.name)}</b><span class="muted small">${lv.points} pts · faltan ${lv.next - lv.points} para el siguiente</span></div></div>${bar(lv.progress, 'gold')}</section>
      <div class="menu">
        ${item('#mas/porque', 'heart', 'red', 'Mi porqué', 'Metas, razones y foto')}
        ${item('#diario', 'notebook-pen', 'blue', 'Diario', Object.keys(state.journal).length + ' revisiones nocturnas')}
        ${item('#mas/compromiso', 'handshake', 'purple', 'Compromiso semanal', 'Recompensa y castigo')}
        ${item('#mas/logros', 'trophy', 'gold', 'Logros y nivel', unlocked + '/' + BADGES.length + ' insignias')}
        ${item('#mas/tareas', 'list-todo', 'teal', 'Mis tareas y hábitos', activeTasks().length + ' activas')}
      </div><div class="menu">
        ${item('#mas/recordatorios', 'bell', 'fire', 'Recordatorios', state.settings.notif ? (state.settings.push ? 'Push activado' : 'Activados (con la app abierta)') : 'Desactivados')}
        ${item('#mas/ajustes', 'settings', 'teal', 'Ajustes y copia de seguridad', 'Nombre, exigencia, datos')}
        ${item('#mas/instalar', 'smartphone', 'blue', 'Instalar en el iPhone', isStandalone() ? 'Ya está instalada' : 'Pasos para añadirla al inicio')}
      </div><p class="muted small center">Sin Excusas · tus datos se guardan solo en este teléfono.</p></div>`;
  }

  const SUBS = {
    porque() {
      const w = state.why;
      return `<div class="stack"><div><h1 class="page-title">Mi porqué</h1><p class="page-sub">Esto aparece cada mañana al abrir la app y cuando estás a punto de fallar. Escríbelo para el tú que no tiene ganas.</p></div>
        <label class="field"><span>Mis metas</span><textarea class="input" id="w-goals" maxlength="400" placeholder="Ej: Ser una persona disciplinada y exitosa. Generar $100 por semana. Construir mi negocio.">${esc(w.goals)}</textarea></label>
        <label class="field"><span>¿Por qué me importa? ¿Qué pasa si no cambio?</span><textarea class="input" id="w-reasons" maxlength="1000" placeholder="Ej: Estoy cansado de prometerme cosas y no cumplir. Quiero darle estabilidad a mi familia. No quiero estar igual dentro de un año.">${esc(w.reasons)}</textarea></label>
        <div class="field"><span>Foto que te motive (opcional)</span>
          ${w.photo ? `<img class="why-photo" src="${w.photo}" alt="Mi porqué">` : ''}
          <div class="btn-row"><label class="btn">${ic('camera')}${w.photo ? 'Cambiar foto' : 'Elegir foto'}<input type="file" accept="image/*" id="w-photo" hidden></label>
          ${w.photo ? `<button class="btn danger" data-act="why-photo-del">Quitar</button>` : ''}</div></div>
        <button class="btn primary xl" data-act="why-save">Guardar mi porqué</button></div>`;
    },

    compromiso() {
      const k = today(), ws = weekStart(k);
      const w = state.weeks[ws] || { reward: '', punishment: '' };
      const wi = weekInfo(ws);
      const past = Object.keys(state.weeks).filter((x) => x < ws && state.weeks[x].result).sort().reverse().slice(0, 8);
      return `<div class="stack"><div><h1 class="page-title">Compromiso semanal</h1><p class="page-sub">Semana del ${fmtShort(ws)} al ${fmtShort(addDays(ws, 6))}. Si ganas al menos ${wi.need || '—'} de los ${wi.planned} días con tareas, te llevas tu recompensa. Si no, cumples tu castigo. Sin negociar.</p></div>
        <div class="card"><div class="progress-head"><b>${weekLine(wi)}</b><span>${pct(wi.pct)} de tareas</span></div>${bar(wi.need ? wi.won / wi.need : 0, wi.ok ? 'good' : '')}<p class="muted small">${wi.ok ? 'Meta asegurada. Remata la semana.' : wi.impossible ? 'Ya no se puede llegar a la meta esta semana.' : 'Días perdidos: ' + wi.lost + '. Se cierra el domingo por la noche.'}</p></div>
        <label class="field"><span>Mi recompensa si cumplo la semana</span><input class="input" id="c-reward" maxlength="120" placeholder="Ej: Salir a cenar con ${esc(state.settings.partner.trim() || 'alguien especial')}" value="${esc(w.reward)}"></label>
        <label class="field"><span>Mi castigo si fallo la semana</span><input class="input" id="c-punish" maxlength="120" placeholder="Ej: Cero series el fin de semana, donar $10" value="${esc(w.punishment)}"></label>
        <button class="btn primary xl" data-act="deal-save">Me comprometo</button>
        <p class="muted small">Se repite cada semana automáticamente hasta que lo cambies. Un castigo funciona si te duele un poco y es fácil de verificar.</p>
        ${past.length ? `<h2 class="section-title">Semanas anteriores</h2><div class="menu">${past.map((x) => {
          const pw = state.weeks[x];
          return `<div class="row">${medal(pw.result === 'won' ? 'gift' : 'scale', pw.result === 'won' ? 'green' : 'red', 'sm')}<span class="mt">Semana del ${fmtShort(x)}${pw.won != null ? ' · ' + pw.won + '/' + pw.need + ' días' : ''}<small>${pw.result === 'won' ? 'Ganada: ' + esc(pw.reward || 'recompensa') : 'Fallada: ' + esc(pw.punishment || 'castigo')}</small></span></div>`;
        }).join('')}</div>` : ''}</div>`;
    },

    logros() {
      const lv = levelInfo(), pi = pointsInfo();
      return `<div class="stack"><div><h1 class="page-title">Logros y nivel</h1></div>
        <div class="card level-card"><div class="lvl">${medal('award', 'gold')}<div><b>Nivel ${lv.num} · ${esc(lv.name)}</b><span class="muted small"><span data-count="${lv.points}">${lv.points}</span> pts · faltan ${lv.next - lv.points}</span></div></div>${bar(lv.progress, 'gold')}</div>
        <h2 class="section-title">Insignias (${Object.keys(state.achievements).length}/${BADGES.length})</h2>
        <div class="badges">${BADGES.map((b) => {
          const u = state.achievements[b.id];
          return `<div class="badge ${u ? 'unlocked' : 'locked'}">${medal(u ? b.i : 'lock', u ? b.t : 'none', 'lg')}<b>${esc(b.n)}</b><small>${u ? 'Desbloqueada el ' + fmtShort(u) : esc(b.d)}</small></div>`;
        }).join('')}</div>
        <h2 class="section-title">Cómo se ganan puntos</h2><div class="card"><ul class="points-list">
          <li>${ic('check')}Tarea completa: 10 / 15 / 20 pts (baja / media / alta)</li>
          <li>${ic('hourglass')}Versión mínima: 4 pts</li>
          <li>${ic('flag')}Día ganado: +15 · Día perfecto: +10</li>
          <li>${ic('timer')}Pomodoro: +8 · Revisión nocturna: +5</li>
          <li>${ic('life-buoy')}Emergencia superada: +5 · Semana cumplida: +50</li>
          <li>${ic('piggy-bank')}Día con ahorro: +5 · Meta semanal de dinero: +60 · Meta de ahorro: +100</li>
          <li>${ic('award')}Cada insignia: +30</li></ul><p class="muted small">Total acumulado: ${pi.total} pts.</p></div></div>`;
    },

    tareas() {
      const list = activeTasks().filter((t) => t.type === 'habit' || t.date >= today());
      const row = (t) => `<button data-act="edit" data-id="${t.id}">${medal((CATS[t.cat] || CATS.personal).icon, (CATS[t.cat] || CATS.personal).tone, 'sm')}<span class="mt">${esc(t.title)}<small>${t.type === 'habit' ? ((t.days || ALL_DAYS).length === 7 ? 'Todos los días' : WEEK_ORDER.filter((d) => (t.days || ALL_DAYS).includes(d)).map((d) => DIAS_CORTO[d]).join(' ')) : fmtLong(t.date)}${t.time ? ' · ' + t.time : ''}${t.mini ? ' · mínimo: ' + esc(t.mini) : ''}</small></span>${ic('chevron-right', 'chev')}</button>`;
      return `<div class="stack"><div><h1 class="page-title">Mis tareas</h1><p class="page-sub">Pocas y cumplidas valen más que muchas y abandonadas.</p></div>
        <div class="btn-row"><button class="btn primary" data-act="add">${ic('plus')}Nueva tarea</button><button class="btn" data-act="templates">${ic('crown')}Hábitos de éxito</button></div>
        ${SLOT_ORDER.map((sl) => { const l = list.filter((t) => slotOf(t) === sl); return l.length ? `<h2 class="section-title">${SLOTS[sl].label}</h2><div class="menu">${l.map(row).join('')}</div>` : ''; }).join('')}
        ${list.length ? '' : '<div class="card"><p class="muted">No tienes tareas activas.</p></div>'}</div>`;
    },

    recordatorios() {
      const st = state.settings;
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      const perm = supported ? Notification.permission : 'unsupported';
      let status = '';
      if (!supported) status = `<div class="alert warn">${ic('triangle-alert', 'ai')}<div>${isIOS && !isStandalone() ? 'En iPhone las notificaciones solo funcionan con la app <b>instalada</b> en la pantalla de inicio (iOS 16.4 o superior). Instálala y ábrela desde su icono.' : 'Este navegador no permite notificaciones. Usa el Calendario (abajo).'}</div></div>`;
      else if (perm === 'denied') status = `<div class="alert bad">${ic('ban', 'ai')}<div>Bloqueaste las notificaciones. Para activarlas: <b>Ajustes del iPhone → Notificaciones → Sin Excusas → Permitir notificaciones</b>.</div></div>`;
      else if (st.notif && st.push) status = `<div class="alert good">${ic('shield-check', 'ai')}<div><b>Push activado.</b> Te llegan avisos aunque la app esté cerrada.</div></div>`;
      else if (st.notif) status = `<div class="alert info">${ic('info', 'ai')}<div><b>Avisos activados con la app abierta.</b> ${pushServer === false ? 'Este sitio no tiene servidor de push, así que con la app cerrada no llegan. Para avisos seguros, usa también el Calendario (abajo).' : 'Comprobando servidor de push…'}</div></div>`;
      const time = (key, icon, label) => `<label class="field"><span>${ic(icon)}${label}</span><input class="input" type="time" data-setting="${key}" value="${st[key]}"></label>`;
      return `<div class="stack"><div><h1 class="page-title">Recordatorios</h1><p class="page-sub">Avisos a la hora de tus tareas, un toque si no has marcado nada, tu meta de dinero y la revisión de la noche.</p></div>
        ${status}
        <div class="card"><div class="toggle-row"><div><h3>Notificaciones</h3><p class="muted small">Tareas, mañana, tarde, noche y dinero</p></div><button class="switch ${st.notif ? 'on' : ''}" data-act="notif-toggle" aria-label="Activar notificaciones" ${supported ? '' : 'disabled'}></button></div></div>
        ${st.notif ? `<button class="btn" data-act="notif-test">${ic('bell')}Enviar notificación de prueba</button>` : ''}
        <h2 class="section-title">Horarios</h2><div class="card stack">
          ${time('morning', 'sunrise', 'Mensaje de la mañana ("Hoy toca ganar")')}
          ${time('nudge', 'alarm-clock', 'Aviso si a esta hora no has marcado nada')}
          ${time('risk', 'flame', 'Alerta de racha en peligro')}
          ${time('moneyTime', 'wallet', 'Meta de dinero (viernes, sábado y domingo)')}
          ${time('night', 'moon', 'Revisión nocturna')}
          <p class="muted small">Cada tarea con hora te avisa a esa hora (si no la has hecho).</p></div>
        <h2 class="section-title">Avisos 100% seguros: Calendario</h2><div class="card stack"><p class="small">El iPhone a veces congela las apps web cerradas. Para que nunca se te escape un aviso, añade tus recordatorios al Calendario del iPhone: suenan siempre, incluso sin internet.</p>
          <button class="btn" data-act="ics">${ic('calendar')}Añadir al Calendario del iPhone</button><button class="link-btn" data-act="ics-share">¿No se abrió? Compartir el archivo .ics</button><p class="muted small">Si cambias tus horarios, vuelve a añadirlos (borra antes el calendario anterior para no duplicar).</p></div>
        <h2 class="section-title">Modo obligatorio (opcional)</h2><div class="card"><p class="small">Haz que el iPhone abra la app solo cada mañana: <b>Atajos → Automatización → Nueva automatización → Hora del día</b> (tu hora de despertar) → <b>Ejecutar inmediatamente</b> → acción <b>Abrir app</b> → elige <b>Sin Excusas</b>.</p></div></div>`;
    },

    ajustes() {
      const st = state.settings;
      return `<div class="stack"><div><h1 class="page-title">Ajustes</h1></div>
        <label class="field"><span>Tu nombre (para que el coach te hable directo)</span><input class="input" data-setting="name" maxlength="30" value="${esc(st.name)}" placeholder="Tu nombre"></label>
        <label class="field"><span>Persona importante (aparece en algunas frases de motivación)</span><input class="input" data-setting="partner" maxlength="30" value="${esc(st.partner)}" placeholder="Déjalo vacío para no usarlo"></label>
        <div class="field"><span>Nivel de exigencia: % de tareas para ganar el día</span><div class="seg" data-act-seg="threshold">${[[60, 'Flexible 60%'], [80, 'Firme 80%'], [100, 'Total 100%']].map(([v, l]) => `<button type="button" data-v="${v}" class="${st.threshold === v ? 'on' : ''}">${l}</button>`).join('')}</div>
          <p class="muted small">La versión mínima cuenta como hecha. Con "Total" no se te escapa nada.</p></div>
        <div class="card"><div class="toggle-row"><div><h3>Meta de dinero</h3><p class="muted small">${fmtMoney(st.moneyGoal)} por semana · ahorrar ${st.saveRate}%</p></div><button class="btn sm" data-act="money-settings">Cambiar</button></div></div>
        <div class="card"><div class="toggle-row"><div><h3>Sonidos</h3><p class="muted small">Al completar, al subir de nivel y en el temporizador</p></div><button class="switch ${st.sound ? 'on' : ''}" data-act="sound-toggle" aria-label="Sonidos"></button></div></div>
        <h2 class="section-title">Copia de seguridad</h2><div class="card stack"><p class="small">Tus datos viven solo en este teléfono. Exporta una copia de vez en cuando (por ejemplo a Archivos o iCloud Drive) para no perder tu historial si cambias de teléfono.</p>
          <button class="btn" data-act="export">${ic('download')}Exportar copia</button>
          <label class="btn">${ic('upload')}Importar copia<input type="file" accept="application/json,.json" id="import-file" hidden></label></div>
        <h2 class="section-title">Zona peligrosa</h2><button class="btn danger" data-act="reset">${ic('trash-2')}Borrar todo y empezar de cero</button></div>`;
    },

    instalar() {
      return `<div class="stack"><div><h1 class="page-title">Instalar en el iPhone</h1><p class="page-sub">${isStandalone() ? 'Ya la estás usando instalada.' : 'Así se ve y funciona como una app normal, sin barra de Safari y sin internet.'}</p></div>
        <div class="card"><ol class="steps">
          <li>Abre esta página en <b>Safari</b> (no en Chrome ni dentro de Instagram/WhatsApp).</li>
          <li>Toca el botón <b>Compartir</b> (el cuadrado con una flecha hacia arriba).</li>
          <li>Baja y toca <b>Añadir a pantalla de inicio</b>. Si no aparece, toca <b>Editar acciones</b> y agrégalo.</li>
          <li>Deja activado <b>Abrir como app web</b> y toca <b>Añadir</b>.</li>
          <li>Abre <b>Sin Excusas</b> desde el icono nuevo. Desde ahí activa los recordatorios en <b>Más → Recordatorios</b>.</li>
        </ol></div>
        <div class="alert info">${ic('info', 'ai')}<div>Usa siempre el icono de la pantalla de inicio. Si la abres desde Safari, es como otra app distinta y no verás tus datos.</div></div></div>`;
    }
  };

  /* ================= Recordatorios (local + push) ================= */
  let pushServer = null; // null = sin comprobar, false = no hay, string = clave pública
  let swReg = null;
  const PUSH_API = '/api/push';

  async function checkPushServer() {
    if (pushServer !== null) return pushServer;
    try {
      const r = await fetch(PUSH_API + '/key', { cache: 'no-store' });
      const j = r.ok ? await r.json() : null;
      pushServer = (j && j.publicKey) || false;
    } catch (e) { pushServer = false; }
    if (route.tab === 'mas' && route.sub === 'recordatorios') render();
    return pushServer;
  }

  function b64ToU8(b64) {
    const p = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }

  // Lista de avisos programados (la usan el servidor push y el aviso local).
  function reminderItems() {
    const st = state.settings, k = today(), items = [];
    for (const t of activeTasks()) {
      if (!t.time) continue;
      if (t.type === 'once' && t.date < k) continue;
      items.push({
        k: 't:' + t.id, kind: 'task', id: t.id, hm: t.time,
        days: t.type === 'habit' ? (t.days || ALL_DAYS) : undefined, date: t.type === 'once' ? t.date : undefined,
        title: t.title,
        body: t.mini ? 'Es la hora. ¿Sin ganas? Haz lo mínimo: ' + t.mini + '.' : 'Es la hora. Empieza ahora, aunque sea 2 minutos.'
      });
    }
    const bodies = {};
    for (let i = 0; i < 14; i++) { const dk = addDays(k, i); bodies[dk] = quoteFor(dk); }
    items.push({ k: 'morning', kind: 'morning', hm: st.morning, days: ALL_DAYS, title: 'Hoy toca ganar', body: 'Abre la app y mira tu plan del día.', bodies });
    items.push({ k: 'nudge', kind: 'nudge', hm: st.nudge, days: ALL_DAYS, title: '¿Todavía nada?', body: 'No has marcado ninguna tarea hoy. Haz la más fácil. Dos minutos.' });
    items.push({ k: 'risk', kind: 'risk', hm: st.risk, days: ALL_DAYS, title: 'Tu racha está en peligro', body: 'Todavía no ganas el día. Usa la versión mínima de lo que falta: dos minutos cada una.' });
    items.push({ k: 'night', kind: 'night', hm: st.night, days: ALL_DAYS, title: 'Revisión nocturna', body: 'Un minuto: ¿qué lograste, qué te frenó y qué harás mañana?' });
    if (st.moneyGoal > 0) {
      items.push({ k: 'money', kind: 'money', hm: st.moneyTime, days: [5, 6, 0], title: 'Tu meta de ' + fmtMoney(st.moneyGoal) + ' de la semana', body: 'Revisa cuánto llevas y decide qué vas a hacer hoy para llegar. Anota cada ingreso.' });
    }
    const w = state.weeks[weekStart(k)];
    if (weekHasDeal(w)) {
      items.push({ k: 'week', kind: 'week', hm: minToHm(hmToMin(st.night) - 60), days: [0], title: 'Hoy cierra tu semana', body: (w.reward ? 'Si cumples: ' + w.reward + '. ' : '') + (w.punishment ? 'Si fallas: ' + w.punishment + '.' : '') });
    }
    return items;
  }

  function reminderStatus() {
    const k = today(), s = dayStats(k);
    return { date: k, done: s.done, total: s.total, won: s.status === 'won', journal: !!state.journal[k], doneIds: Object.keys(s.log), streak: streakInfo().current, moneyMet: moneyWeek(weekStart(k)).met };
  }

  // Mismas reglas que el servidor: ¿se debe saltar este aviso?
  function skipItem(it, st) {
    if (it.kind === 'task') return st.doneIds.includes(it.id);
    if (it.kind === 'nudge') return st.done > 0 || !st.total;
    if (it.kind === 'risk') return st.won || !st.total;
    if (it.kind === 'night') return st.journal;
    if (it.kind === 'money') return st.moneyMet;
    return false;
  }

  function notifyLocal(title, body, tag) {
    if (!state.settings.notif || !('Notification' in window) || Notification.permission !== 'granted') return;
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, { body, tag: tag || 'se', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' })).catch(() => {});
  }

  // Avisos locales: funcionan mientras la app está abierta o en segundo plano reciente.
  function checkReminders() {
    if (!state.settings.notif || state.settings.push) return;
    const k = today(), now = hmToMin(nowHM()), wd = weekday(k), st = reminderStatus();
    if (!state.notified[k]) state.notified[k] = [];
    const sent = state.notified[k];
    let changed = false;
    for (const it of reminderItems()) {
      const m = hmToMin(it.hm);
      if (m > now || m <= now - 30) continue;
      if (it.date ? it.date !== k : !(it.days || ALL_DAYS).includes(wd)) continue;
      if (sent.includes(it.k) || skipItem(it, st)) continue;
      sent.push(it.k); changed = true;
      notifyLocal(it.title, (it.bodies && it.bodies[k]) || it.body, it.k);
    }
    if (changed) save();
  }
  setInterval(checkReminders, 20000);

  let syncTimer = null;
  function schedulePushSync() {
    if (!state.settings.push) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncPush, 1500);
  }
  async function syncPush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { state.settings.push = false; save(); return false; }
      const r = await fetch(PUSH_API + '/sync', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', items: reminderItems(), status: reminderStatus() })
      });
      return r.ok;
    } catch (e) { return false; }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) { toast('triangle-alert', 'Instala la app en tu pantalla de inicio para activar notificaciones.', 3500, 'gold'); return; }
    // El iPhone exige pedir el permiso en el mismo toque: por eso la clave del servidor y el registro ya están cargados.
    const key = pushServer, reg = swReg;
    let subPromise = null;
    if (key && reg && reg.pushManager) subPromise = reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) });
    let perm;
    if (subPromise) {
      try { await subPromise; perm = 'granted'; }
      catch (e) { perm = Notification.permission; if (perm === 'default') perm = await Notification.requestPermission().catch(() => 'default'); }
    } else perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('ban', 'Sin permiso no te puedo avisar. Puedes activarlo en Ajustes del iPhone → Notificaciones.', 4000, 'red'); render(); return; }
    state.settings.notif = true;
    if (key && reg && reg.pushManager) {
      try {
        let sub = await reg.pushManager.getSubscription();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) });
        state.settings.push = true;
        save();
        const ok = await syncPush();
        toast(ok ? 'bell' : 'triangle-alert', ok ? '<b>Push activado.</b> Te avisaré aunque la app esté cerrada.' : 'Notificaciones activadas, pero no pude conectar con el servidor. Lo reintento solo.', 3500, ok ? 'green' : 'gold');
      } catch (e) {
        state.settings.push = false;
        toast('bell', 'Notificaciones activadas (con la app abierta).', 3000, 'blue');
      }
    } else {
      toast('bell', 'Notificaciones activadas.', 2500, 'green');
    }
    commit();
  }

  async function disableNotifications() {
    state.settings.notif = false;
    if (state.settings.push) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          fetch(PUSH_API + '/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) }).catch(() => {});
          await sub.unsubscribe();
        }
      } catch (e) { /* nada */ }
      state.settings.push = false;
    }
    commit();
    toast('bell', 'Notificaciones desactivadas.', 2000, 'blue');
  }

  async function testNotification() {
    if (state.settings.push) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        const r = await fetch(PUSH_API + '/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
        if (r.ok) { toast('bell', 'Enviada desde el servidor. Debería llegarte en segundos.', 3000, 'green'); return; }
      } catch (e) { /* cae al aviso local */ }
    }
    notifyLocal('Sin Excusas', 'Así te llegarán los recordatorios.', 'test');
    toast('bell', 'Notificación de prueba enviada.', 2500, 'green');
  }

  /* ================= Calendario (.ics) y copias ================= */
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function buildICS() {
    const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sin Excusas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Sin Excusas'];
    const k = today();
    for (const it of reminderItems()) {
      const startDate = it.date || k;
      L.push('BEGIN:VEVENT', 'UID:' + it.k.replace(/[^\w-]/g, '') + '-' + state.quoteSeed + '@sinexcusas', 'DTSTAMP:' + stamp,
        'DTSTART:' + startDate.replace(/-/g, '') + 'T' + it.hm.replace(':', '') + '00', 'DURATION:PT10M',
        'SUMMARY:' + icsEsc(it.title), 'DESCRIPTION:' + icsEsc(it.body + '\nAbre Sin Excusas y márcalo.'));
      if (!it.date) L.push('RRULE:FREQ=WEEKLY;BYDAY=' + (it.days || ALL_DAYS).map((d) => BYDAY[d]).join(','));
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(it.title), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.join('\r\n');
  }

  async function shareOrDownload(content, name, type) {
    const file = new File([content], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function exportICS() {
    const file = new File([buildICS()], 'sin-excusas.ics', { type: 'text/calendar' });
    const url = URL.createObjectURL(file);
    // En iPhone, abrir un .ics muestra "Añadir todo" al Calendario.
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('calendar', 'Toca <b>Añadir todo</b> para guardar los recordatorios en tu Calendario. Si no se abre, hazlo desde Safari.', 5000, 'blue');
  }

  function importBackup(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || !Array.isArray(data.tasks) || typeof data.log !== 'object') throw new Error('formato');
        if (!confirm('Esto reemplaza todos tus datos actuales por los de la copia. ¿Continuar?')) return;
        localStorage.setItem(KEY, JSON.stringify(data));
        state = load();
        commit();
        toast('circle-check', 'Copia restaurada.', 2500, 'green');
      } catch (e) { toast('triangle-alert', 'Ese archivo no es una copia válida de Sin Excusas.', 3500, 'red'); }
    };
    r.readAsText(file);
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 900, sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /* ================= Pantallas diarias ================= */
  function morningOverlay() {
    const k = today(), s = dayStats(k), si = streakInfo(), h = new Date().getHours();
    const y = state.journal[addDays(k, -1)];
    const name = state.settings.name.trim();
    const mw = moneyWeek(weekStart(k));
    const bySlot = SLOT_ORDER.map((sl) => [sl, s.tasks.filter((t) => slotOf(t) === sl).length]).filter(([, n]) => n);
    showOverlay(
      `${ovIcon(h < 12 ? 'sunrise' : h < 19 ? 'sun' : 'moon', h < 12 ? 'gold' : h < 19 ? 'fire' : 'blue')}<p class="ov-kicker">${fmtLong(k)}</p>
      <h1 class="ov-title">${esc(pick(h < 12 ? window.MANANA.titulos : window.MANANA.tarde))}${name ? ', ' + esc(name) : ''}</h1>
      <p class="ov-text">${s.total ? `Tienes <b>${s.total} ${s.total === 1 ? 'tarea' : 'tareas'}</b> hoy. ` : 'Hoy no tienes tareas: agrega al menos una. '}${si.yesterdayLost ? '<b>Ayer fallaste. Hoy no se falla dos veces.</b>' : si.current ? `Llevas <b>${si.current} ${si.current === 1 ? 'día' : 'días'}</b> de racha. No la sueltes.` : 'Hoy empieza tu racha.'}</p>
      ${bySlot.length ? `<div class="slot-summary">${bySlot.map(([sl, n]) => `<div>${medal(SLOTS[sl].icon, SLOTS[sl].tone, 'sm')}<b>${n}</b><span>${SLOTS[sl].label}</span></div>`).join('')}</div>` : ''}
      ${mw.goal ? `<div class="card card-row">${medal('wallet', 'green', 'sm')}<div><div class="kicker">Meta de dinero</div><b>${fmtMoney(mw.income)} de ${fmtMoney(mw.goal)}</b> <span class="muted small">esta semana</span></div></div>` : ''}
      ${y && y.tomorrow ? `<div class="card"><p class="muted small">Anoche dijiste que hoy harías:</p><p class="pre strong">${esc(y.tomorrow)}</p></div>` : ''}
      ${whyBig('Tu porqué')}
      <div class="card"><p class="quote">${esc(quoteFor(k))}</p></div>
      <button class="btn primary xl" data-act="ov-close">Vamos</button>`,
      {}
    );
  }

  function brokenOverlay(info) {
    const si = streakInfo();
    showOverlay(
      `${ovIcon('heart-crack', 'red')}<p class="ov-kicker">Racha rota</p><h1 class="ov-title">${info.length} días.<br>Y no se borran.</h1>
      <p class="ov-text">${esc(pick(window.RACHA_ROTA))}</p>
      <div class="stat-row"><div class="card"><b>${info.length}</b><span>racha perdida</span></div><div class="card"><b>${si.best}</b><span>tu récord</span></div><div class="card"><b>${si.wonDays}</b><span>días ganados</span></div></div>
      <div class="alert warn">${ic('scale', 'ai')}<div>Regla de oro: <b>nunca dos días seguidos.</b> Hoy es el día que importa.</div></div>
      <button class="btn primary xl" data-act="ov-close">Empiezo de nuevo hoy</button>`,
      { theme: 'red' }
    );
  }

  function weekResultOverlay(ws) {
    const w = state.weeks[ws], won = w.result === 'won';
    showOverlay(
      `${ovIcon(won ? 'gift' : 'scale', won ? 'green' : 'red')}<p class="ov-kicker">Cierre de semana · ${fmtShort(ws)} – ${fmtShort(addDays(ws, 6))}</p>
      <h1 class="ov-title">${won ? 'Semana cumplida' : 'Semana fallada'}</h1>
      <p class="ov-text">Ganaste <b>${w.won} de ${w.need}</b> días necesarios (${pct(w.pct)} de tus tareas).</p>
      ${won
        ? `<div class="card center"><p class="muted small">Te lo ganaste:</p><p class="deal-big">${esc(w.reward || 'Tu recompensa')}</p><p class="muted small">Disfrútala sin culpa. +50 pts.</p></div>`
        : `<div class="card center bad-border"><p class="muted small">Lo prometiste. Toca cumplir:</p><p class="deal-big">${esc(w.punishment || 'Tu castigo')}</p><p class="muted small">Cumplir el castigo también es disciplina. Esta semana se gana.</p></div>`}
      <button class="btn primary xl" data-act="ov-close">${won ? 'A por otra semana' : 'Lo acepto. Esta semana gano'}</button>`,
      { theme: won ? 'green' : 'red' }
    );
  }

  function moneyWeekOverlay(ws) {
    const w = moneyWeek(ws), mi = moneyInfo();
    showOverlay(
      `${ovIcon(w.met ? 'trending-up' : 'wallet', w.met ? 'green' : 'gold')}<p class="ov-kicker">Semana de dinero · ${fmtShort(ws)} – ${fmtShort(addDays(ws, 6))}</p>
      <h1 class="ov-title">${fmtMoney(w.income)} de ${fmtMoney(w.goal)}</h1>
      <p class="ov-text">${w.met ? 'Cumpliste tu meta. Así se construye: semana a semana.' : `Te faltaron ${fmtMoney(w.left)}. Sin excusas: esta semana empieza hoy. Piensa ya qué vas a ofrecer, vender o cobrar.`}</p>
      <div class="stat-row"><div class="card"><b>${fmtMoney(w.saved)}</b><span>ahorraste</span></div><div class="card"><b>${mi.streak}</b><span>semanas seguidas</span></div><div class="card"><b>${fmtMoney(mi.totalSaved)}</b><span>ahorro total</span></div></div>
      <button class="btn primary xl" data-act="ov-close">${w.met ? 'Otra semana igual' : 'Esta semana llego'}</button>`,
      { theme: w.met ? 'green' : '' }
    );
  }

  function weekPreviewOverlay(ws) {
    const w = state.weeks[ws], wi = weekInfo(ws), ok = wi.ok;
    showOverlay(
      `${ovIcon('handshake', 'purple')}<p class="ov-kicker">Hoy cierra tu semana</p><h1 class="ov-title">${weekLine(wi)}</h1>
      <p class="ov-text">${ok ? 'Ya llegaste a la meta. Gana también hoy y disfruta tu recompensa.' : wi.impossible ? 'Esta semana ya no llegas a la meta. Toca cumplir el castigo. Pero gana hoy: la próxima semana empieza con impulso.' : 'Te falta ganar hoy para llegar a la meta. Lo que hagas hoy decide la semana.'}</p>
      ${w.reward ? `<div class="card"><p class="small deal">${ic('gift')}Si cumples: <b>${esc(w.reward)}</b></p></div>` : ''}
      ${w.punishment ? `<div class="card"><p class="small deal">${ic('scale')}Si fallas: <b>${esc(w.punishment)}</b></p></div>` : ''}
      <button class="btn primary xl" data-act="ov-close">Entendido</button>`, {}
    );
  }

  function nightPromptOverlay() {
    const s = dayStats(reviewDay());
    showOverlay(
      `${ovIcon('moon', 'blue')}<h1 class="ov-title">Hora de cerrar el día</h1>
      <p class="ov-text">${s.total ? 'Hoy: ' + s.done + ' de ' + s.total + '. ' : ''}Un minuto para revisar qué lograste, qué te frenó y qué harás mañana.</p>
      <button class="btn primary xl" data-act="review-from-prompt">Hacer revisión</button><button class="btn ghost" data-act="ov-close">Después</button>`,
      { theme: 'blue' }
    );
  }

  function onboarding(step) {
    step = step || 1;
    if (step === 1) {
      showOverlay(
        `<div class="ov-icon"><img class="ov-logo" src="icons/icon-192.png" alt=""></div><p class="ov-kicker">Bienvenido a</p><h1 class="ov-title">Sin Excusas</h1>
        <p class="ov-text">Esta app no está para hacerte sentir bien. Está para que cumplas lo que te prometes, todos los días. Te va a felicitar cuando lo hagas y te va a confrontar cuando no.</p>
        <label class="field"><span>¿Cómo te llamas?</span><input class="input big" id="ob-name" maxlength="30" placeholder="Tu nombre" value="${esc(state.settings.name)}"></label>
        <label class="field"><span>Una persona por la que también lo haces (opcional)</span><input class="input" id="ob-partner" maxlength="30" placeholder="Ej: Leslie" value="${esc(state.settings.partner)}"></label>
        <button class="btn primary xl" data-act="ob-next" data-step="2">Empezar</button>`,
        { closable: false }
      );
    } else if (step === 2) {
      const all = PLANTILLAS_RIQUEZA.concat(PLANTILLAS);
      showOverlay(
        `<p class="ov-kicker">Paso 2 de 3</p><h1 class="ov-title" style="font-size:30px">Elige 3 o 4 hábitos</h1>
        <p class="ov-text">Pocos y cumplidos valen más que muchos y abandonados. Cada uno trae su versión mínima de 2 minutos y su momento del día.</p>
        <div class="tpl-list" id="ob-tpl">${all.map((p, i) => `<button class="tpl${[0, 3, 4, 9].includes(i) ? ' on' : ''}" data-i="${i}">${medal(SLOTS[p.slot].icon, SLOTS[p.slot].tone, 'sm')}<span><b>${esc(p.title)}</b><small>${SLOTS[p.slot].label} · mínimo: ${esc(p.mini)}</small></span>${ic('check', 'tpl-ic')}</button>`).join('')}</div>
        <button class="btn primary xl" data-act="ob-next" data-step="3">Siguiente</button>`,
        { closable: false, onMount: (el) => $('#ob-tpl', el).addEventListener('click', (e) => { const b = e.target.closest('.tpl'); if (b) b.classList.toggle('on'); }) }
      );
    } else {
      showOverlay(
        `<p class="ov-kicker">Paso 3 de 3</p><h1 class="ov-title" style="font-size:30px">¿Por qué quieres cambiar?</h1>
        <p class="ov-text">Escríbelo para el día en que no tengas ganas. Te lo voy a mostrar justo ahí.</p>
        <textarea class="input" id="ob-why" maxlength="400" placeholder="Ej: Quiero ser una persona disciplinada y exitosa. Quiero terminar lo que empiezo."></textarea>
        <label class="field"><span>Tu meta de dinero por semana</span><div class="money-input"><span>${esc(cur())}</span><input id="ob-money" inputmode="decimal" value="${state.settings.moneyGoal}"></div></label>
        <button class="btn primary xl" data-act="ob-finish">Listo, hoy empiezo</button>`,
        { closable: false }
      );
    }
  }

  function dailyChecks() {
    memo = {};
    if (!state.onboarded) { if (!overlayOpen) queueOverlay(() => onboarding(1)); return; }
    const k = today(), ws = weekStart(k), hm = nowHM();
    ensureWeek(ws);
    // Cierra semanas pasadas con compromiso
    let lastClosed = null;
    for (const wk of Object.keys(state.weeks).sort()) {
      const w = state.weeks[wk];
      if (wk >= ws || w.result || !weekHasDeal(w)) continue;
      const wi = weekInfo(wk);
      w.pct = wi.pct; w.won = wi.won; w.need = wi.need;
      w.result = wi.ok ? 'won' : 'lost';
      lastClosed = wk;
    }
    if (lastClosed) { commit({ render: false }); if (state.seen.weekResult !== lastClosed) { state.seen.weekResult = lastClosed; save(); queueOverlay(() => weekResultOverlay(lastClosed)); } }

    // Cierre de la semana de dinero (si ya usas la sección)
    const lastWs = addDays(ws, -7);
    if (state.seen.moneyWeek !== lastWs && money().entries.some((e) => e.date <= addDays(lastWs, 6))) {
      state.seen.moneyWeek = lastWs; save();
      queueOverlay(() => moneyWeekOverlay(lastWs));
    }

    const si = streakInfo();
    if (si.lastBroken && si.lastBroken.k >= addDays(k, -3) && state.seen.broken !== si.lastBroken.k) {
      state.seen.broken = si.lastBroken.k; save();
      const info = si.lastBroken;
      queueOverlay(() => brokenOverlay(info));
    }
    if (state.seen.morning !== k) {
      state.seen.morning = k; save();
      queueOverlay(morningOverlay);
    } else if ((hm >= state.settings.night || new Date().getHours() < 4) && !state.journal[reviewDay()] && state.seen.night !== reviewDay()) {
      state.seen.night = reviewDay(); save();
      queueOverlay(nightPromptOverlay);
    }
    if (weekday(k) === 0 && hm >= minToHm(hmToMin(state.settings.night) - 60) && weekHasDeal(state.weeks[ws]) && state.seen.weekPreview !== ws) {
      state.seen.weekPreview = ws; save();
      queueOverlay(() => weekPreviewOverlay(ws));
    }
    for (const d of Object.keys(state.notified)) if (d < addDays(k, -2)) delete state.notified[d];
  }

  /* ================= Acciones (delegación de eventos) ================= */
  const ACTIONS = {
    toggle: (el) => { const id = el.dataset.id, c = (state.log[today()] || {})[id]; setTaskState(id, c === 'full' ? null : 'full'); },
    mini: (el) => setTaskState(el.dataset.id, 'mini'),
    add: () => taskForm(null),
    edit: (el) => { const t = taskById(el.dataset.id); if (t) taskForm(t); },
    'save-task': () => { const sh = $('.sheet'); if (sh) saveTaskFromSheet(sh); },
    'delete-task': (el) => deleteTask(el.dataset.id),
    'sheet-close': () => closeSheet(),
    'add-template': (el) => addTemplate(PLANTILLAS[Number(el.dataset.i)]),
    templates: () => templatesSheet(),
    'tpl-add': (el) => {
      const p = (el.dataset.src === 'r' ? PLANTILLAS_RIQUEZA : PLANTILLAS)[Number(el.dataset.i)];
      if (activeTasks().some((t) => t.title === p.title)) return;
      addTemplate(p);
      el.classList.add('has');
      const i = el.querySelector('.tpl-ic'); if (i) i.outerHTML = ic('check', 'tpl-ic');
    },
    'next-quote': () => {
      const k = today(), q = state.seen.quoteExtra;
      state.seen.quoteExtra = { k, n: q && q.k === k ? q.n + 1 : 1 }; save();
      const el = $('#quote');
      if (el) { el.classList.remove('swap'); void el.offsetWidth; el.textContent = quoteFor(k, state.seen.quoteExtra.n * 37); el.classList.add('swap'); }
    },
    'ov-close': () => closeOverlay(),
    review: (el) => reviewOverlay(el.dataset.k),
    'review-from-prompt': () => reviewOverlay(),
    'review-save': (el) => reviewSave(el.dataset.k),
    emergency: () => emergency(0),
    'emergency-next': (el) => emergency(Number(el.dataset.i)),
    'emergency-start': (el) => emergencyStart(el.dataset.id),
    'emergency-done': (el) => emergencyDone(el.dataset.id),
    'emergency-mark': (el) => {
      const k = today();
      state.emergencies[k] = (state.emergencies[k] || 0) + 1;
      closeOverlay();
      setTaskState(el.dataset.id, el.dataset.v);
    },
    'emergency-focus': (el) => {
      const k = today();
      state.emergencies[k] = (state.emergencies[k] || 0) + 1;
      const tm = timerState();
      tm.mode = 'focus'; tm.left = FOCUS_MIN * 60000; tm.taskId = el.dataset.id;
      save();
      closeOverlay();
      go('enfoque');
      timerStart();
    },
    't-start': () => timerStart(),
    't-resume': () => timerStart(),
    't-pause': () => timerPause(),
    't-stop': () => timerStop(),
    't-skip': () => { const tm = timerState(); tm.mode = 'focus'; tm.running = false; tm.left = timerDuration(tm); save(); render(); },
    'money-add': (el) => moneySheet(el.dataset.type),
    'money-save': () => { const sh = $('.sheet'); if (sh) saveMoney(sh); },
    'money-del': (el) => {
      const e = money().entries.find((x) => x.id === el.dataset.id); if (!e) return;
      if (!confirm('¿Borrar este movimiento de ' + fmtMoney(e.amount) + '?')) return;
      money().entries = money().entries.filter((x) => x.id !== e.id);
      commit(); toast('trash-2', 'Movimiento borrado.', 1600, 'red');
    },
    'goal-add': () => goalSheet(null),
    'goal-open': (el) => { const g = money().goals.find((x) => x.id === el.dataset.id); if (g) goalSheet(g); },
    'goal-save': () => { const sh = $('.sheet'); if (sh) saveGoal(sh); },
    'goal-contribute': (el) => moneySheet('saving', el.dataset.id),
    'goal-del': (el) => {
      const g = money().goals.find((x) => x.id === el.dataset.id); if (!g) return;
      if (!confirm('¿Borrar la meta "' + g.name + '"? Los ahorros registrados se mantienen.')) return;
      money().goals = money().goals.filter((x) => x.id !== g.id);
      money().entries.forEach((e) => { if (e.goalId === g.id) e.goalId = ''; });
      closeSheet(); commit();
    },
    'money-settings': () => moneySettingsSheet(),
    'money-settings-save': () => {
      const sh = $('.sheet'); if (!sh) return;
      const f = $('#ms-form', sh).elements, goal = parseMoney(f.goal.value);
      if (!(goal > 0)) { toast('circle-dollar-sign', 'Escribe una meta mayor que cero.', 2000, 'gold'); return; }
      state.settings.moneyGoal = goal; state.settings.saveRate = sh._rate; state.settings.currency = f.currency.value.trim() || '$';
      closeSheet(); commit(); toast('target', 'Meta de dinero actualizada.', 2000, 'green');
    },
    'why-save': () => {
      state.why.goals = $('#w-goals').value.trim(); state.why.reasons = $('#w-reasons').value.trim();
      commit(); toast('heart', 'Guardado. Te lo voy a recordar cuando más lo necesites.', 3000, 'red');
    },
    'why-photo-del': () => { state.why.photo = ''; commit(); },
    'deal-save': () => {
      const ws = weekStart(today());
      const w = state.weeks[ws] || (state.weeks[ws] = { result: null });
      w.reward = $('#c-reward').value.trim(); w.punishment = $('#c-punish').value.trim();
      commit(); toast('handshake', 'Compromiso firmado. El domingo por la noche se cierra la semana.', 3000, 'purple');
    },
    'notif-toggle': () => { if (state.settings.notif) disableNotifications(); else enableNotifications(); },
    'notif-test': () => testNotification(),
    'sound-toggle': () => { state.settings.sound = !state.settings.sound; commit(); },
    ics: () => exportICS(),
    'ics-share': () => shareOrDownload(buildICS(), 'sin-excusas.ics', 'text/calendar'),
    export: () => shareOrDownload(JSON.stringify(state), 'sin-excusas-' + today() + '.json', 'application/json'),
    reset: () => {
      if (!confirm('¿Borrar TODO? Tareas, rachas, diario, dinero, logros… No se puede deshacer.')) return;
      if (!confirm('Última oportunidad. ¿Seguro?')) return;
      localStorage.removeItem(KEY); state = freshState(); save(); location.hash = 'hoy'; location.reload();
    },
    'ob-next': (el) => {
      const step = Number(el.dataset.step);
      if (step === 2) {
        state.settings.name = ($('#ob-name').value || '').trim();
        state.settings.partner = ($('#ob-partner').value || '').trim();
      }
      if (step === 3) {
        const all = PLANTILLAS_RIQUEZA.concat(PLANTILLAS);
        const chosen = $$('#ob-tpl .tpl.on').map((b) => all[Number(b.dataset.i)]);
        state.tasks = state.tasks.filter((t) => !t.fromOnboarding);
        chosen.forEach((p) => { state.tasks.push({ id: uid(), createdAt: today(), type: 'habit', days: ALL_DAYS.slice(), title: p.title, mini: p.mini, cat: p.cat, time: p.time, prio: p.prio, slot: p.slot, fromOnboarding: true }); });
      }
      save();
      onboarding(step);
    },
    'ob-finish': () => {
      const why = ($('#ob-why').value || '').trim();
      if (why) state.why.reasons = why;
      const mg = parseMoney($('#ob-money').value);
      if (mg > 0) state.settings.moneyGoal = mg;
      state.onboarded = true; state.createdAt = today(); state.seen.morning = today();
      state.tasks.forEach((t) => { delete t.fromOnboarding; t.createdAt = today(); });
      commit({ render: false });
      closeOverlay();
      render(true);
      confetti(120); chime();
      toast('flame', '<b>Hoy empieza.</b> Marca tus tareas a medida que las hagas.', 4000, 'fire');
    }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  document.addEventListener('click', (e) => {
    const seg = e.target.closest('[data-act-seg] [data-v]');
    if (!seg) return;
    state.settings[seg.parentElement.dataset.actSeg] = Number(seg.dataset.v);
    commit();
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.matches('[data-setting]')) {
      const key = el.dataset.setting;
      if (el.type === 'time' && !el.value) return;
      state.settings[key] = el.type === 'time' ? el.value : el.value.trim();
      commit({ render: false });
      toast('check', 'Guardado.', 1200, 'green');
    } else if (el.matches('[data-act-change="t-task"]')) {
      timerState().taskId = el.value; save();
    } else if (el.id === 'w-photo' && el.files[0]) {
      resizeImage(el.files[0]).then((data) => {
        state.why.goals = ($('#w-goals') || {}).value || state.why.goals;
        state.why.reasons = ($('#w-reasons') || {}).value || state.why.reasons;
        state.why.photo = data; commit();
      }).catch(() => toast('triangle-alert', 'No pude leer esa foto. Prueba con otra.', 3000, 'red'));
    } else if (el.id === 'import-file' && el.files[0]) {
      importBackup(el.files[0]);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    timerCheck();
    if (state.timer && state.timer.running) keepAwake(true);
    dailyChecks();
    checkReminders();
    render();
  });

  // Si el día cambia con la app abierta, repinta.
  let lastDay = today();
  setInterval(() => { if (today() !== lastDay) { lastDay = today(); dailyChecks(); render(); } }, 30000);

  /* ================= Arranque ================= */
  const VIEWS = { hoy: viewHoy, dinero: viewDinero, enfoque: viewEnfoque, stats: viewStats, diario: viewDiario, mas: viewMas };
  $$('.tabbar a').forEach((a) => { a.querySelector('.ti').innerHTML = ic(a.dataset.icon); });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.ready.then((r) => { swReg = r; }).catch(() => {});
  }
  readRoute();
  timerCheck();
  render(true);
  dailyChecks();
  checkReminders();
  checkPushServer().then(() => { if (state.settings.push) syncPush(); });
})();
