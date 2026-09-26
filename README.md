# KOVA · Sitio web

Landing page de KOVA (desarrollo web, bots, automatizaciones, IA y software a medida). Todas las compras y cotizaciones se hacen por WhatsApp (+593 96 905 3512).

Es un único archivo, `index.html`, con el CSS, el JS y los íconos incluidos. No necesita ningún build.

## Ver en local

Abre `index.html` en el navegador.

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
| Logo | `<symbol id="i-logo">` (sprite SVG al inicio del `<body>`) y el SVG del `#loader`. Reemplázalo por tu SVG o por `<img src="...">` |
| Precios y planes | sección `id="planes"` (cada botón lleva el mensaje de WhatsApp en `data-wa`) |
| Testimonios | array `T` en el `<script>` |
| Proyectos, estadísticas y garantías | secciones `id="proyectos"`, `.stats` e `id="garantia"` |
| Redes sociales | bloque `.socials` del footer (ahora apuntan a `#`) |

> Los testimonios, los casos de éxito, las cifras (150+ proyectos, 12 países…) y las garantías son **textos de ejemplo**. Reemplázalos por datos reales antes de publicar: mostrar reseñas o garantías que no son ciertas puede ir contra las leyes de protección al consumidor.
