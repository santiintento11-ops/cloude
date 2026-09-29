# Campaña Google Ads (Máximo rendimiento)

Todo está listo para copiar y pegar en **Campañas → tu campaña → Grupos de recursos → Editar**.

## Imágenes (carpeta `marketing/google/`)

| Recurso en Google Ads | Archivos |
|---|---|
| Logotipo cuadrado (1:1) | `kova-logo-1x1.png` |
| Logotipo horizontal (4:1) | `kova-logo-4x1.png` |
| Imágenes horizontales (1.91:1) | `kova-bot-1.91x1.jpg`, `kova-web-1.91x1.jpg`, `kova-auto-1.91x1.jpg` |
| Imágenes cuadradas (1:1) | `kova-bot-1x1.jpg`, `kova-web-1x1.jpg`, `kova-auto-1x1.jpg` |
| Imágenes verticales (4:5) | `../imagenes/kova-bot.jpg`, `../imagenes/kova-web.jpg`, `../imagenes/kova-auto.jpg` |
| Videos (9:16) | `../videos/kova-bot.mp4`, `kova-web.mp4`, `kova-auto.mp4` (se suben a YouTube como "No listado" y se pega el enlace) |

Para regenerarlas: `cd marketing/src && node render-google.js`.

## Títulos (máx. 30 caracteres)

1. KOVA Desarrollo de Software
2. Páginas Web desde $89
3. Bots de WhatsApp desde $75
4. Automatiza tu Negocio
5. Tu Web Lista en 2-3 Días
6. Bots con IA para tu Negocio
7. Cotiza Gratis por WhatsApp
8. Tiendas Online y Shopify
9. Software a Medida
10. Programadores en Ecuador
11. Vende 24/7 con un Bot
12. Webs Rápidas y Modernas
13. Apps y Sistemas a Medida
14. Asesoría Gratuita
15. Automatización con n8n

## Títulos largos (máx. 90 caracteres)

1. Páginas web, bots de WhatsApp y automatizaciones para que tu negocio venda más
2. Tu bot de WhatsApp responde, agenda citas y toma pedidos 24/7. Desde $75
3. Webs profesionales listas en 2-3 días desde $89. Cotiza gratis por WhatsApp
4. Automatiza facturas, reportes y tareas repetitivas y ahorra horas cada semana
5. Software, apps y sistemas a medida con soporte y garantía. Asesoría gratis

## Descripciones (máx. 90; la primera es la corta, máx. 60)

1. Webs, bots y automatizaciones. Cotiza gratis hoy.
2. Páginas web modernas y rápidas desde $89. Pago 50% al iniciar y 50% al entregar.
3. Bots de WhatsApp con IA que venden, agendan y responden por ti las 24 horas.
4. Automatiza tareas repetitivas con n8n, Make o Python y enfócate en crecer.
5. Escríbenos por WhatsApp y recibe tu propuesta con precio fijo en 24 horas.

## Otros campos

- **Nombre de la empresa:** KOVA
- **URL final:** https://kovaautomatiza.com
- **Llamada a la acción:** "Contactar" o "Obtener presupuesto"
- **Ruta visible:** `kovaautomatiza.com/webs/bots`

## Conversión

- Etiqueta de Google: `AW-18359064551` (en el `<head>` de `index.html`).
- Conversión "Clic en WhatsApp": `AW-18359064551/XdUvCP_W0dgcEOevpLJE`. Se envía en cada botón de WhatsApp desde `trackContact()`.
- En la campaña, esa acción debe estar como **objetivo principal**.
