// Se ejecuta sola cada 5 minutos y envía los recordatorios que tocan.
import { vapid, subsStore, sentStore, dueItems, send } from '../lib/push-common.mjs';

export const config = { schedule: '*/5 * * * *' };

export default async () => {
  await vapid();
  const subs = subsStore(), sentS = sentStore();
  const { blobs } = await subs.list();
  for (const b of blobs) {
    const rec = await subs.get(b.key, { type: 'json' });
    if (!rec || !rec.sub) continue;
    const sent = await sentS.get(b.key, { type: 'json' });
    const { date, due } = dueItems(rec, sent);
    if (!due.length) continue;
    const keys = sent && sent.date === date ? sent.keys.slice() : [];
    let gone = false;
    for (const it of due) {
      try {
        await send(rec.sub, { title: it.title, body: it.body, tag: it.k });
        keys.push(it.k);
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) { gone = true; break; }
        console.error('push error', e.statusCode, e.body);
      }
    }
    if (gone) { await subs.delete(b.key); await sentS.delete(b.key); continue; }
    await sentS.setJSON(b.key, { date, keys });
  }
};
