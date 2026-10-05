# KOVA · Sitio web

Landing page de KOVA (desarrollo web, bots, automatizaciones, IA y software a medida). Todas las compras y cotizaciones se hacen por WhatsApp (+593 96 905 3512).

Es un único archivo, `index.html`, con el CSS, el JS y los íconos incluidos. No necesita ningún build.

## Ver en local

Abre `index.html` en el navegador.

## Hosting gratis: GitHub Pages

Cada push a `claude/friendly-wright-hmh3xu` publica la web automáticamente con `.github/workflows/pages.yml`.

- URL: https://santiintento11-ops.github.io/cloude/
- Si el primer despliegue falla con un error de permisos, ve a **Settings → Pages → Build and deployment → Source** y elige **GitHub Actions**. Después vuelve a lanzar el workflow desde la pestaña **Actions**.

### Conectar tu dominio

1. Crea en la raíz del repo un archivo `CNAME` que contenga solo tu dominio (por ejemplo `kova.com`). El workflow lo publica.
2. En tu proveedor de dominio crea estos registros:
   - `A` para `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` para `www` → `santiintento11-ops.github.io`
3. En **Settings → Pages** escribe el dominio y activa **Enforce HTTPS**.

**Configuración actual:** `kovaautomatiza.com` usa Cloudflare (plan Free) como DNS y proxy. Los nameservers están en Namecheap → Custom DNS. En Cloudflare, SSL/TLS está en modo **Full** y "Always Use HTTPS" está activado. El HTTPS lo da Cloudflare, así que en GitHub no hace falta marcar "Enforce HTTPS".

## Publicar en Shopify (sport-less-store.myshopify.com)

1. En Shopify ve a **Tienda online → Temas → ⋯ → Editar código**.
2. En **Templates** pulsa **Añadir una nueva plantilla** → tipo `page`, formato `liquid`, nombre `kova`.
3. Borra el contenido, escribe `{% layout none %}` en la primera línea y pega debajo todo el contenido de `index.html`. Guarda.
4. Ve a **Tienda online → Páginas → Añadir página**, ponle el título "KOVA" y, en *Plantilla*, elige `page.kova`. Guarda.
5. (Opcional) Para que sea la portada: **Tienda online → Navegación** o **Preferencias**, o redirige `/` a `/pages/kova`.

También sirve tal cual en GitHub Pages, Netlify o Vercel.

## Qué personalizar

| Qué | Dónde (`index.html`) |
|---|---|
| Número de WhatsApp | `var WA_NUMBER = "593969053512";` en el `<script>` |
| Logo | `<symbol id="i-logo">` (sprite SVG al inicio del `<body>`). Es una versión vectorial del logo original. También está suelto en `assets/logo.svg` y el original en `assets/logo-original.png` |
| Precios y planes | sección `id="planes"` (cada botón lleva el mensaje de WhatsApp en `data-wa`) |
| Proyectos, referencias, cifras y garantías | secciones `id="proyectos"`, `id="referencias"`, `.stats` e `id="garantia"` |
| Redes sociales | bloque `.socials` del footer (ahora apuntan a `#`) |

> La web no muestra testimonios ni cifras inventadas: la sección "Proyectos" son **ejemplos de lo que se puede construir** (sin resultados) y hay un bloque "Pedir referencias" (`id="referencias"`). Si agregas testimonios o cifras, que sean reales y con permiso del cliente: las reseñas falsas van contra las políticas de Meta y las leyes de protección al consumidor.

## Publicidad en Meta

La campaña de Facebook/Instagram (estrategia, paso a paso y textos) está en [`marketing/CAMPANA-META.md`](marketing/CAMPANA-META.md). Los 3 videos están en `marketing/videos/` y las 3 imágenes en `marketing/imagenes/`.

## TikTok e Instagram Reels

10 videos verticales listos para publicar o promocionar: con voz en off de IA en `marketing/tiktok-voz/` y solo con música original en `marketing/tiktok/` (cada carpeta con sus `portadas/`). Descripciones, hashtags, calendario y cómo promocionarlos: [`marketing/TIKTOK-REELS.md`](marketing/TIKTOK-REELS.md).

**Serie PRO** (10 videos más, con voz más natural, subtítulos palabra por palabra y transiciones dinámicas) en `marketing/tiktok-pro/`. Guía y descripciones: [`marketing/TIKTOK-PRO.md`](marketing/TIKTOK-PRO.md).

La web marca los chats que llegan desde un anuncio: si la URL trae `utm_content`, el mensaje de WhatsApp termina en `[ref: nombre-del-anuncio]`. Para activar el Pixel de Meta, pega su ID en `var META_PIXEL_ID = "";`.
