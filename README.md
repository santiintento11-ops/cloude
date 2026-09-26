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
| Testimonios | array `T` en el `<script>` |
| Proyectos, estadísticas y garantías | secciones `id="proyectos"`, `.stats` e `id="garantia"` |
| Redes sociales | bloque `.socials` del footer (ahora apuntan a `#`) |

> Los testimonios, los casos de éxito, las cifras (150+ proyectos, 12 países…) y las garantías son **textos de ejemplo**. Reemplázalos por datos reales antes de publicar: mostrar reseñas o garantías que no son ciertas puede ir contra las leyes de protección al consumidor.
