# Sin Excusas · app de disciplina para iPhone

App web instalable (PWA) en HTML, CSS y JavaScript puro. Funciona sin internet y guarda todo **en tu teléfono**.

## Qué trae

| Función | Dónde |
|---|---|
| Tareas del día con casillas grandes, barra de progreso y celebración al completar todo | **Hoy** |
| Hábitos diarios (eliges días) y tareas de un solo día, con hora, categoría y prioridad. Se agregan en 3 toques: **+**, escribir, **Agregar** | Botón **+** |
| Rachas con récord personal. Si se rompe, una pantalla que te empuja a volver, no a rendirte | **Hoy** |
| Regla de los 2 minutos: cada tarea puede tener versión mínima (botón **2 min**) | Cada tarea |
| Regla "nunca dos días seguidos": alerta roja si ayer fallaste | **Hoy** |
| Pomodoro 25 + 5 (largo de 15 cada 4), botón **Empezar ahora**, pantalla siempre encendida | **Enfoque** |
| 133 frases propias (una distinta cada día, sin repetir), coach que felicita o confronta según cómo vas, mensaje de la mañana y de la noche | **Hoy** |
| Puntos, 11 niveles (de Novato a Leyenda) y 24 insignias | **Más → Logros** |
| Recordatorios: a la hora de cada tarea, mañana, "no has marcado nada", racha en peligro, revisión nocturna, cierre de semana | **Más → Recordatorios** |
| Revisión nocturna (¿qué logré?, ¿qué me frenó?, ¿qué haré mañana?) guardada en un diario. Lo que escribiste para mañana aparece al día siguiente | **Diario** |
| % semanal y mensual, mapa de calor tipo GitHub, mejores y peores días, tarea más fallada, % por categoría | **Progreso** |
| Recompensa y castigo semanal. Se cierra el domingo por la noche y te muestra el resultado | **Más → Compromiso** |
| Mi porqué (metas, razones y foto): sale cada mañana, cuando vas mal y en el modo emergencia | **Más → Mi porqué** |
| Botón **No tengo ganas**: elige tu tarea más fácil, te muestra tu porqué, 2 minutos de cuenta atrás y después te deja marcarla o seguir con 25 min de enfoque | **Hoy** |
| Copia de seguridad (exportar e importar) | **Más → Ajustes** |

**Cómo se gana un día:** completas el % de tareas que elijas en Ajustes (Flexible 60%, **Firme 80%** por defecto, Total 100%). La versión mínima cuenta como hecha. Con 80%: 4 de 5, 3 de 4, 2 de 3.
**Cómo se gana una semana:** ganas ese mismo % de días (con 80%: 6 de 7).

---

## 1. Publicarla gratis (Cloudflare, recomendado)

Cloudflare tiene un plan gratis **sin créditos**: el límite es de 100.000 visitas **por día** y se reinicia cada día. Si alguna vez lo pasaras, la app deja de responder hasta el día siguiente, pero no te cobra nada. Para una persona usándola, no te vas a acercar a ese límite.

Además, con Cloudflare las notificaciones **llegan con la app cerrada**. No hay que configurar claves ni nada técnico: el archivo `sin-excusas/wrangler.toml` ya le dice todo a Cloudflare.

1. Entra en **https://dash.cloudflare.com** con la misma cuenta donde tienes `kovaautomatiza.com`.
2. En el menú de la izquierda abre **Compute (Workers) → Workers & Pages** y toca **Create** (o **Create application**).
3. Elige **Import a repository** y conecta tu cuenta de **GitHub**. Si no ves el repositorio, dale permiso a Cloudflare sobre `cloude`.
4. Elige el repositorio **`santiintento11-ops/cloude`**.
5. Rellena así:
   - **Project name:** `sin-excusas` (tiene que ser exactamente este nombre).
   - **Build command:** déjalo vacío.
   - **Deploy command:** `npx wrangler deploy` (suele venir puesto).
   - En **Advanced settings → Path** (o *Root directory*) escribe: `sin-excusas`
6. Toca **Create and deploy** / **Deploy**.
7. **Elige la rama correcta.** La app está en la rama `claude/zen-knuth-gpkvv5`, pero la rama principal del repo es la de la web de KOVA. Si Cloudflare no te dejó elegir rama al crearla, el primer despliegue fallará (es normal):
   - Entra en tu Worker **sin-excusas → Settings → Build → Branch control**.
   - En **Production branch** escribe `claude/zen-knuth-gpkvv5` y guarda.
   - Lanza un despliegue nuevo desde **Deployments** (o pídele a Claude que suba un cambio pequeño a esa rama para que se dispare solo).
8. Cuando termine, tu app queda en una dirección como `https://sin-excusas.TU-USUARIO.workers.dev` (aparece en **Deployments** o arriba en **Visit**).
9. (Opcional) Dirección bonita con tu dominio: **Settings → Domains & Routes → Add → Custom domain** → por ejemplo `app.kovaautomatiza.com`. Tu web de KOVA no se toca.

> Cada vez que se suba un cambio a esa rama, Cloudflare actualiza la app sola.

### Alternativas gratis (sin avisos con la app cerrada)
- **Vercel:** *Add New → Project* → importa el repo → en **Root Directory** escribe `sin-excusas/public` → **Deploy**.
- **GitHub Pages:** este repo ya lo usa para la web de KOVA, así que no se recomienda aquí.

En estas opciones los recordatorios solo salen con la app abierta; usa también el **Calendario** (ver abajo).

## 2. Instalarla en el iPhone

1. Abre la dirección de tu app en **Safari** (no en Chrome ni dentro de WhatsApp/Instagram).
2. Toca **Compartir** (el cuadrado con la flecha hacia arriba).
3. Baja y toca **Añadir a pantalla de inicio** (si no aparece: **Editar acciones** y agrégalo).
4. Deja activado **Abrir como app web** y toca **Añadir**.
5. Abre **Sin Excusas** desde el icono nuevo. A partir de ahora úsala **siempre desde el icono**: si la abres desde Safari es como otra app y no verás tus datos.

## 3. Activar las notificaciones

Necesitas **iOS 16.4 o superior** (Ajustes → General → Información → Versión de iOS).

1. Abre la app **desde el icono** de la pantalla de inicio.
2. Ve a **Más → Recordatorios** y activa **Notificaciones**.
3. Cuando el iPhone pregunte, toca **Permitir**.
4. Toca **Enviar notificación de prueba**. Si publicaste en Cloudflare verás "Push activado" y te llegará aunque cierres la app.
5. Ajusta tus horarios: mañana, aviso si no marcaste nada, racha en peligro y revisión nocturna. Cada tarea con hora te avisa a esa hora si no la has hecho.

Si dijiste "No permitir" por error: **Ajustes del iPhone → Notificaciones → Sin Excusas → Permitir notificaciones**.
Revisa también que el **modo Concentración / No molestar** no las esté silenciando.

**Extra 100% seguro:** en **Más → Recordatorios → Añadir al Calendario del iPhone** se guardan todos tus avisos en el Calendario. Suenan siempre, incluso sin internet. Si cambias horarios, borra ese calendario y vuelve a añadirlo.

**Modo obligatorio (opcional):** app **Atajos → Automatización → Nueva automatización → Hora del día** (tu hora de despertar) → **Ejecutar inmediatamente** → acción **Abrir app** → **Sin Excusas**. El iPhone te abrirá la app cada mañana.

## 4. Cuidar tus datos

- Todo vive en tu iPhone, nadie más lo ve. Si borras la app de la pantalla de inicio, se borran tus datos.
- Haz una copia de vez en cuando: **Más → Ajustes → Exportar copia** y guárdala en Archivos o iCloud Drive. Para recuperarla: **Importar copia**.
- Con Cloudflare, el servidor solo guarda lo necesario para avisarte: tus horarios, los títulos de las tareas con hora y si ya las marcaste.

---

## Para desarrolladores

```
sin-excusas/
├── public/                  ← la app (esto es lo que se publica)
│   ├── index.html           ← meta tags de iOS, pantalla completa
│   ├── manifest.json
│   ├── sw.js                ← service worker: offline + recibe push
│   ├── css/styles.css
│   ├── js/frases.js         ← frases y mensajes del coach (edítalas libremente)
│   ├── js/app.js            ← toda la lógica
│   └── icons/
├── worker/                  ← servidor en Cloudflare Workers (plan gratis)
│   ├── index.js             ← sirve public/, /api/push/key|sync|test|unsubscribe y el cron cada 5 min
│   ├── webpush.js           ← cifrado Web Push (RFC 8291) y firma VAPID con WebCrypto, sin librerías
│   └── schedule.js          ← qué recordatorio toca a qué hora (zona horaria del usuario)
├── test/push.test.mjs       ← pruebas: el cifrado se valida contra la librería de referencia http_ece
├── wrangler.toml            ← configuración de Cloudflare (Durable Object SQLite + cron)
└── package.json
```

- `npm install` y luego `npm test` (pruebas), `npm run dev` (app + servidor en `http://localhost:8787`), `npm run deploy` (publicar desde la terminal).
- Las claves VAPID se generan solas la primera vez y se guardan en el Durable Object `PushStore`.
- Al cambiar archivos de `public/`, sube el número de `CACHE` en `sw.js` para que los iPhone descarguen la versión nueva.
