// Servidor de Sin Excusas en Cloudflare Workers (plan gratis):
// - sirve la app (carpeta public/)
// - /api/push/key | sync | test | unsubscribe
// - cada 5 minutos (cron) envía los recordatorios que tocan.
import { DurableObject } from 'cloudflare:workers';
import { generateVapidKeys, sendPush } from './webpush.js';
import { dueItems } from './schedule.js';

// Guarda las claves y las suscripciones (almacenamiento gratuito de Cloudflare, sin configurar nada).
export class PushStore extends DurableObject {
  async vapid(origin) {
    let v = await this.ctx.storage.get('vapid');
    if (!v) {
      v = await generateVapidKeys();
      v.subject = origin && origin.startsWith('https://') ? origin : 'mailto:sin-excusas@example.com';
      await this.ctx.storage.put('vapid', v);
    }
    return v;
  }
  async publicKey(origin) { return (await this.vapid(origin)).publicKey; }
  async sync(id, rec) { await this.ctx.storage.put('sub:' + id, rec); }
  async remove(id) { await this.ctx.storage.delete(['sub:' + id, 'sent:' + id]); }
  async test(sub) {
    return sendPush(sub, { title: 'Sin Excusas', body: 'Así te llegarán los recordatorios, aunque la app esté cerrada. ✅', tag: 'test' }, await this.vapid());
  }
  async tick() {
    const v = await this.vapid();
    const subs = await this.ctx.storage.list({ prefix: 'sub:' });
    for (const [key, rec] of subs) {
      const id = key.slice(4);
      const sent = await this.ctx.storage.get('sent:' + id);
      const { date, due } = dueItems(rec, sent);
      if (!due.length) continue;
      const keys = sent && sent.date === date ? sent.keys.slice() : [];
      let gone = false;
      for (const it of due) {
        try {
          const status = await sendPush(rec.sub, { title: it.title, body: it.body, tag: it.k }, v);
          if (status === 404 || status === 410) { gone = true; break; }
          if (status >= 200 && status < 300) keys.push(it.k);
          else console.log('push status', status);
        } catch (e) { console.log('push error', e && e.message); }
      }
      if (gone) await this.remove(id);
      else await this.ctx.storage.put('sent:' + id, { date, keys });
    }
  }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function validSubscription(sub) {
  return sub && typeof sub.endpoint === 'string' && /^https:\/\//.test(sub.endpoint) &&
    sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string';
}

async function subId(endpoint) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)));
  return Array.from(d.slice(0, 20), (b) => b.toString(16).padStart(2, '0')).join('');
}

const store = (env) => env.STORE.get(env.STORE.idFromName('main'));

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/push/')) return env.ASSETS.fetch(req);
    const action = url.pathname.slice('/api/push/'.length);

    if (action === 'key') return json({ publicKey: await store(env).publicKey(url.origin) });
    if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

    const text = await req.text();
    if (text.length > 200000) return json({ error: 'Demasiado grande' }, 413);
    let body;
    try { body = JSON.parse(text); } catch (e) { return json({ error: 'JSON inválido' }, 400); }
    if (!validSubscription(body.subscription)) return json({ error: 'Suscripción inválida' }, 400);
    const sub = { endpoint: body.subscription.endpoint, keys: { p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth } };
    const id = await subId(sub.endpoint);

    if (action === 'sync') {
      await store(env).sync(id, {
        sub,
        tz: typeof body.tz === 'string' ? body.tz.slice(0, 64) : 'UTC',
        items: Array.isArray(body.items) ? body.items.slice(0, 200) : [],
        status: body.status && typeof body.status === 'object' ? body.status : {},
        updatedAt: Date.now()
      });
      return json({ ok: true });
    }
    if (action === 'unsubscribe') { await store(env).remove(id); return json({ ok: true }); }
    if (action === 'test') {
      const status = await store(env).test(sub).catch(() => 0);
      return status >= 200 && status < 300 ? json({ ok: true }) : json({ error: 'No se pudo enviar', status }, 502);
    }
    return json({ error: 'No encontrado' }, 404);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(store(env).tick());
  }
};
