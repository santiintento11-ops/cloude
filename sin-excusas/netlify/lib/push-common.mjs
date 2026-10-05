// Código compartido por las funciones de notificaciones push de Sin Excusas.
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';
import { createHash } from 'node:crypto';

export const subsStore = () => getStore('sin-excusas-subs');
export const sentStore = () => getStore('sin-excusas-sent');
const configStore = () => getStore('sin-excusas-config');

// Las claves VAPID se crean solas la primera vez y se guardan en Netlify Blobs: no hay que configurar nada.
export async function vapid(origin) {
  const store = configStore();
  let cfg = await store.get('vapid', { type: 'json' });
  if (!cfg) {
    cfg = webpush.generateVAPIDKeys();
    cfg.subject = origin && origin.startsWith('https://') ? origin : 'mailto:sin-excusas@example.com';
    await store.setJSON('vapid', cfg);
  }
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  return cfg;
}

export const subId = (endpoint) => createHash('sha256').update(endpoint).digest('hex').slice(0, 40);

export function validSubscription(sub) {
  return sub && typeof sub.endpoint === 'string' && /^https:\/\//.test(sub.endpoint) &&
    sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string';
}

export function send(sub, payload) {
  return webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, urgency: 'high' });
}

// Fecha, día de la semana y minuto del día en la zona horaria del usuario.
export function localNow(tz, now = new Date()) {
  let f;
  try {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  } catch (e) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  }
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return {
    date: p.year + '-' + p.month + '-' + p.day,
    wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday),
    min: (Number(p.hour) % 24) * 60 + Number(p.minute)
  };
}

// Mismas reglas que la app: no avisar de lo que ya está hecho.
export function skipItem(it, status, date) {
  const st = status && status.date === date ? status : { doneIds: [], done: 0, total: 1, won: false, journal: false };
  if (it.kind === 'task') return (st.doneIds || []).includes(it.id);
  if (it.kind === 'nudge') return st.done > 0 || !st.total;
  if (it.kind === 'risk') return st.won || !st.total;
  if (it.kind === 'night') return st.journal;
  return false;
}

// Avisos que tocan ahora (ventana de 10 minutos; la función corre cada 5).
export function dueItems(rec, sent, now = new Date()) {
  const t = localNow(rec.tz || 'UTC', now);
  const already = sent && sent.date === t.date ? sent.keys : [];
  const out = [];
  for (const it of rec.items || []) {
    if (!it || typeof it.hm !== 'string') continue;
    const [h, m] = it.hm.split(':').map(Number);
    const im = h * 60 + m;
    if (!(im <= t.min && im > t.min - 10)) continue;
    if (it.date ? it.date !== t.date : !(Array.isArray(it.days) ? it.days : [0, 1, 2, 3, 4, 5, 6]).includes(t.wd)) continue;
    if (already.includes(it.k) || skipItem(it, rec.status, t.date)) continue;
    out.push({ k: it.k, title: String(it.title || 'Sin Excusas').slice(0, 120), body: String((it.bodies && it.bodies[t.date]) || it.body || '').slice(0, 300) });
  }
  return { date: t.date, due: out };
}
