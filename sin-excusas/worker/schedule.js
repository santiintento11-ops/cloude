// Decide qué recordatorios tocan ahora, con las mismas reglas que la app.

// Fecha, día de la semana y minuto del día en la zona horaria del usuario.
export function localNow(tz, now = new Date()) {
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' };
  let f;
  try { f = new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, opts)); }
  catch (e) { f = new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: 'UTC' }, opts)); }
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return {
    date: p.year + '-' + p.month + '-' + p.day,
    wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday),
    min: (Number(p.hour) % 24) * 60 + Number(p.minute)
  };
}

// No avisar de lo que ya está hecho (si el estado es de otro día, se asume que no hizo nada).
export function skipItem(it, status, date) {
  const st = status && status.date === date ? status : { doneIds: [], done: 0, total: 1, won: false, journal: false };
  if (it.kind === 'task') return (st.doneIds || []).includes(it.id);
  if (it.kind === 'nudge') return st.done > 0 || !st.total;
  if (it.kind === 'risk') return st.won || !st.total;
  if (it.kind === 'night') return st.journal;
  if (it.kind === 'money') return !!st.moneyMet;
  return false;
}

// Avisos dentro de los últimos 10 minutos que no se hayan enviado (el cron corre cada 5).
export function dueItems(rec, sent, now = new Date()) {
  const t = localNow(rec.tz || 'UTC', now);
  const already = sent && sent.date === t.date ? sent.keys : [];
  const due = [];
  for (const it of rec.items || []) {
    if (!it || typeof it.hm !== 'string' || !/^\d{2}:\d{2}$/.test(it.hm)) continue;
    const [h, m] = it.hm.split(':').map(Number);
    const im = h * 60 + m;
    if (!(im <= t.min && im > t.min - 10)) continue;
    if (it.date ? it.date !== t.date : !(Array.isArray(it.days) ? it.days : [0, 1, 2, 3, 4, 5, 6]).includes(t.wd)) continue;
    if (already.includes(it.k) || skipItem(it, rec.status, t.date)) continue;
    due.push({ k: String(it.k), title: String(it.title || 'Sin Excusas').slice(0, 120), body: String((it.bodies && it.bodies[t.date]) || it.body || '').slice(0, 300) });
  }
  return { date: t.date, due };
}
