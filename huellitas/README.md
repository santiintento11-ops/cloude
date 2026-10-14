# Huellitas Creativas · video de bienvenida

`huellitas-creativas.mp4`: 1920×1080 (16:9), 24 fps, 8 s, con audio. Sin textos, subtítulos ni marcas de agua. `portada.jpg` es un fotograma del segundo 5.2.

## Qué hay en el video

- **0–3,6 s**: la cámara entra por la puerta a un taller de tejido con ventana luminosa, plantas en macetas de crochet, estantería de ovillos, cesta de lana, guirnalda de banderines y una alfombra redonda tejida.
- La niña (pelo largo castaño oscuro, ojos grandes marrones, mejillas sonrosadas, suéter crema de crochet) sostiene un perrito de crochet con una huella en el pecho. Sonríe, parpadea y saluda con la mano.
- **1,25–3,6 s**: Coco (perrito dorado, orejas largas, pañuelo azul) entra corriendo por la izquierda y Luna (gatita gris y blanca, ojos verdes, collar rosa con corazón) por la derecha. Llegan moviendo la cola.
- **1,5–7,75 s**: la niña canta «¡Bienvenidos a Huellitas Creativas, donde tejemos mucho amor!». La boca se mueve con la voz, sílaba a sílaba.
- Música en Sol mayor a 120 bpm: ukelele, guitarra acústica y xilófono suave. Se oyen patitas y una risita, bajitas.

## Limitaciones

- **La voz es sintética.** Sale de eSpeak NG, afinada sobre la melodía con el vocoder WORLD. Afina y va a tempo, pero suena a voz de computadora, no a una niña real. Para la versión final conviene grabar a una persona cantando la misma melodía (las notas están en `src/partitura.py`) y volver a renderizar. El lip sync se recalcula solo a partir de los tiempos.
- **El estilo es amigurumi procedural.** Está hecho en tiempo real con Three.js: puntadas de crochet generadas por código, luz cálida, sombras suaves, profundidad de campo y bloom. No llega al nivel de una película de estudio ni al de un generador de video con IA (Veo, Sora, Kling).

## Volver a generarlo

Requisitos: Python 3 con `numpy scipy pyworld espeakng-loader`, Node 18+ con Playwright (Chromium) y `ffmpeg`.

```bash
cd src
npm install                 # three.js
python3 voz.py              # build/voz.wav + build/boca.json (lip sync)
python3 musica.py           # build/mezcla.wav
node render.js              # ../huellitas-creativas.mp4 y ../portada.jpg (~8 s por fotograma en CPU)
node render.js preview 1.6 5.2   # capturas sueltas en build/ para revisar
```

| Archivo | Qué hace |
|---|---|
| `src/partitura.py` | Duración, letra, melodía (una nota por vocal) y acordes |
| `src/espeak.py` | Llama a libespeak-ng y devuelve el audio con la posición de cada fonema |
| `src/voz.py` | Estira cada sílaba hasta su nota, le pone vibrato y un timbre más infantil, y exporta la apertura de boca por fotograma |
| `src/musica.py` | Ukelele y guitarra (Karplus-Strong), xilófono, patitas, risita, reverb y mezcla final |
| `src/escena.html` | Escena 3D (taller, niña, Coco, Luna), cámara y animación. `window.seek(t)` dibuja el instante `t` |
| `src/render.js` | Renderiza los 192 fotogramas en Chromium y los une con el audio en ffmpeg |
