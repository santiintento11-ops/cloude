// API de notificaciones: /api/push/key, /api/push/sync, /api/push/test, /api/push/unsubscribe
import { vapid, subsStore, subId, validSubscription, send } from '../lib/push-common.mjs';

export const config = { path: ['/api/push/key', '/api/push/sync', '/api/push/test', '/api/push/unsubscribe'] };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req) => {
  const url = new URL(req.url);
  const action = url.pathname.split('/').pop();

  if (action === 'key') {
    const cfg = await vapid(url.origin);
    return json({ publicKey: cfg.publicKey });
  }
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const text = await req.text();
  if (text.length > 200000) return json({ error: 'Demasiado grande' }, 413);
  let body;
  try { body = JSON.parse(text); } catch (e) { return json({ error: 'JSON inválido' }, 400); }
  if (!validSubscription(body.subscription)) return json({ error: 'Suscripción inválida' }, 400);

  const sub = body.subscription;
  const id = subId(sub.endpoint);
  const subs = subsStore();

  if (action === 'unsubscribe') {
    await subs.delete(id);
    return json({ ok: true });
  }
  if (action === 'sync') {
    await subs.setJSON(id, {
      sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      tz: typeof body.tz === 'string' ? body.tz.slice(0, 64) : 'UTC',
      items: Array.isArray(body.items) ? body.items.slice(0, 200) : [],
      status: body.status && typeof body.status === 'object' ? body.status : {},
      updatedAt: Date.now()
    });
    return json({ ok: true });
  }
  if (action === 'test') {
    await vapid(url.origin);
    try {
      await send(sub, { title: 'Sin Excusas', body: 'Así te llegarán los recordatorios, aunque la app esté cerrada. ✅', tag: 'test' });
      return json({ ok: true });
    } catch (e) {
      return json({ error: 'No se pudo enviar', status: e.statusCode || null }, 502);
    }
  }
  return json({ error: 'No encontrado' }, 404);
};
