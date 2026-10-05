// Pruebas del servidor: cifrado Web Push, firma VAPID y reglas de horario.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ece from 'http_ece';
import { encryptPayload, generateVapidKeys, vapidAuthorization, b64uEncode, b64uDecode } from '../worker/webpush.js';
import { localNow, dueItems } from '../worker/schedule.js';

test('el mensaje cifrado se descifra con la librería de referencia (aes128gcm)', async () => {
  const ua = crypto.createECDH('prime256v1');
  ua.generateKeys();
  const auth = crypto.randomBytes(16);
  const msg = JSON.stringify({ title: '⏰ Hacer ejercicio', body: 'Es la hora. ¿Sin ganas? Haz lo mínimo: 1 flexión.' });
  const body = await encryptPayload(b64uEncode(ua.getPublicKey()), b64uEncode(auth), msg);
  const out = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: ua, authSecret: auth });
  assert.equal(out.toString('utf8'), msg);
});

test('la firma VAPID es un JWT ES256 válido', async () => {
  const v = await generateVapidKeys();
  v.subject = 'https://sin-excusas.example.workers.dev';
  const h = await vapidAuthorization('https://web.push.apple.com/abc123', v);
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h);
  assert.ok(m);
  const claims = JSON.parse(Buffer.from(b64uDecode(m[2])).toString());
  assert.equal(claims.aud, 'https://web.push.apple.com');
  assert.equal(claims.sub, v.subject);
  assert.equal(m[4], v.publicKey);
  const pub = await crypto.webcrypto.subtle.importKey('raw', b64uDecode(v.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const ok = await crypto.webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, b64uDecode(m[3]), new TextEncoder().encode(m[1] + '.' + m[2]));
  assert.ok(ok);
});

test('hora local según la zona horaria', () => {
  const now = new Date('2026-10-05T12:02:30Z'); // lunes; Guayaquil = UTC-5 -> 07:02
  assert.deepEqual(localNow('America/Guayaquil', now), { date: '2026-10-05', wd: 1, min: 7 * 60 + 2 });
  assert.equal(localNow('Zona/Inventada', now).min, 12 * 60 + 2);
});

test('solo avisa lo que toca y no está hecho', () => {
  const now = new Date('2026-10-05T12:02:30Z');
  const all = [0, 1, 2, 3, 4, 5, 6];
  const rec = {
    tz: 'America/Guayaquil',
    status: { date: '2026-10-05', done: 1, total: 3, won: false, journal: false, doneIds: ['b'] },
    items: [
      { k: 't:a', kind: 'task', id: 'a', hm: '07:00', days: [1], title: 'A', body: 'x' },
      { k: 't:b', kind: 'task', id: 'b', hm: '07:00', days: [1], title: 'B', body: 'x' }, // ya hecha
      { k: 't:c', kind: 'task', id: 'c', hm: '07:00', days: [2], title: 'C', body: 'x' }, // otro día
      { k: 't:d', kind: 'task', id: 'd', hm: '06:50', days: [1], title: 'D', body: 'x' }, // fuera de la ventana
      { k: 'morning', kind: 'morning', hm: '06:55', days: all, title: 'M', body: 'gen', bodies: { '2026-10-05': 'frase' } },
      { k: 'nudge', kind: 'nudge', hm: '07:00', days: all, title: 'N', body: 'n' }, // ya marcó algo
      { k: 'o', kind: 'task', id: 'o', hm: '07:01', date: '2026-10-05', title: 'O', body: 'o' }
    ]
  };
  assert.deepEqual(dueItems(rec, null, now).due.map((x) => x.k), ['t:a', 'morning', 'o']);
  assert.equal(dueItems(rec, null, now).due[1].body, 'frase');
  assert.deepEqual(dueItems(rec, { date: '2026-10-05', keys: ['t:a'] }, now).due.map((x) => x.k), ['morning', 'o']);
  const stale = dueItems({ ...rec, status: { ...rec.status, date: '2026-10-04' } }, null, now).due.map((x) => x.k);
  assert.ok(stale.includes('nudge') && stale.includes('t:b'));
});

test('envío completo por red: cabeceras correctas y mensaje legible', async () => {
  const { createServer } = await import('node:http');
  const { sendPush } = await import('../worker/webpush.js');
  const ua = crypto.createECDH('prime256v1');
  ua.generateKeys();
  const auth = crypto.randomBytes(16);
  let got;
  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { got = { headers: req.headers, body: Buffer.concat(chunks) }; res.writeHead(201); res.end(); });
  });
  await new Promise((r) => server.listen(0, r));
  const endpoint = 'http://127.0.0.1:' + server.address().port + '/push/xyz';
  const v = await generateVapidKeys();
  v.subject = 'mailto:test@example.com';
  const status = await sendPush({ endpoint, keys: { p256dh: b64uEncode(ua.getPublicKey()), auth: b64uEncode(auth) } }, { title: 'Hola', body: 'Prueba' }, v);
  server.close();
  assert.equal(status, 201);
  assert.equal(got.headers['content-encoding'], 'aes128gcm');
  assert.equal(got.headers.ttl, '3600');
  assert.match(got.headers.authorization, /^vapid t=.+, k=/);
  const plain = ece.decrypt(got.body, { version: 'aes128gcm', privateKey: ua, authSecret: auth });
  assert.deepEqual(JSON.parse(plain.toString()), { title: 'Hola', body: 'Prueba' });
});
