"""Música y mezcla: ukelele y guitarra acústica (Karplus-Strong), xilófono suave,
patitas y risitas discretas, más la voz de voz.py con un poco de sala.

    python3 musica.py  ->  build/mezcla.wav (estéreo 44.1 kHz, 8 s)
"""
import os

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

from partitura import ACORDES, DUR, midi_hz

FS = 44100
N = int(DUR * FS)
OUT = os.path.join(os.path.dirname(__file__), "build")
rng = np.random.default_rng(7)

UKE = {"G": [67, 62, 67, 71], "Em": [67, 64, 67, 71], "D": [69, 62, 66, 69], "C": [67, 60, 64, 72]}
GUIT = {"G": (43, 50, [55, 59, 62, 67]), "Em": (40, 47, [55, 59, 64, 67]),
        "D": (50, 45, [57, 62, 66, 69]), "C": (48, 43, [55, 60, 64, 67])}


def cuerda(f, dur, brillo=0.5, caida=0.996):
    """Karplus-Strong vectorizado por bloques de un periodo."""
    p = max(2, int(round(FS / f - 0.5)))
    n = int(dur * FS)
    ruido = rng.uniform(-1, 1, p)
    # pulsar más cerca del puente = más brillo
    ruido = sosfilt(butter(1, 1500 + 6000 * brillo, fs=FS, output="sos"), ruido)
    y = np.zeros(n + p + 1)
    y[:p] = ruido
    for i in range(p, n, p):
        prev = y[i - p:i + 1]
        m = min(p, n - i)
        y[i:i + m] = caida * 0.5 * (prev[:m] + prev[1:m + 1])
    y = y[:n]
    ataque = np.minimum(1, np.arange(n) / (0.002 * FS))
    return y * ataque


def poner(pista, x, t, gan=1.0, pan=0.0):
    i = int(t * FS)
    if i >= N:
        return
    x = x[: N - i]
    pista[0, i:i + len(x)] += x * gan * np.sqrt(0.5 * (1 - pan))
    pista[1, i:i + len(x)] += x * gan * np.sqrt(0.5 * (1 + pan))


def acorde_en(t):
    nombre = ACORDES[0][1]
    for a, c in ACORDES:
        if t >= a - 1e-6:
            nombre = c
    return nombre


def ukelele(pista):
    # rasgueo alegre: abajo, abajo-arriba, arriba-abajo-arriba (corcheas), entra en el segundo 0.5
    patron = [(0.0, 1, 1.0), (0.5, 1, 0.7), (0.75, -1, 0.5), (1.25, -1, 0.5), (1.5, 1, 0.75), (1.75, -1, 0.5)]
    for compas in np.arange(0.0, DUR, 2.0):
        for off, direc, vel in patron:
            t = compas + off
            if t < 0.5 or t > 7.05:
                continue
            notas = UKE[acorde_en(t)]
            orden = notas if direc > 0 else notas[::-1]
            for k, m in enumerate(orden):
                poner(pista, cuerda(midi_hz(m), 1.4, brillo=0.6), t + k * 0.009, 0.075 * vel, pan=0.25)
    for k, m in enumerate(UKE["G"]):  # acorde final que queda sonando
        poner(pista, cuerda(midi_hz(m), 1.0, brillo=0.6, caida=0.998), 7.0 + k * 0.03, 0.09, pan=0.25)


def guitarra(pista):
    for t in np.arange(0.0, DUR - 0.5, 0.5):
        raiz, quinta, arpegio = GUIT[acorde_en(t)]
        beat = int(round(t / 0.5)) % 4
        if beat in (0, 2):
            poner(pista, cuerda(midi_hz(raiz if beat == 0 else quinta), 1.6, brillo=0.25, caida=0.998), t, 0.16, pan=-0.2)
        poner(pista, cuerda(midi_hz(arpegio[(beat * 2 + 1) % 4]), 1.0, brillo=0.4), t + 0.25, 0.06, pan=-0.3)
    poner(pista, cuerda(midi_hz(43), 1.0, brillo=0.25, caida=0.999), 7.0, 0.18, pan=-0.2)


def xilofono_nota(f, dur=0.9):
    t = np.arange(int(dur * FS)) / FS
    parciales = [(1.0, 1.0, 9), (3.93, 0.25, 22), (9.5, 0.06, 40)]  # barra de madera afinada
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-d * t) for r, a, d in parciales)
    golpe = rng.normal(0, 1, len(t)) * np.exp(-t * 900) * 0.15
    return (x + golpe) * np.minimum(1, t / 0.0015)


def xilofono(pista):
    frases = [  # (tiempo, midi): brillo de entrada, relleno en el silencio y cierre
        (0.15, 79), (0.40, 83), (0.65, 86), (0.90, 91), (1.15, 86),
        (4.80, 86), (4.88, 88), (4.94, 90),
        (7.75, 91), (7.83, 95),
    ]
    for t, m in frases:
        poner(pista, xilofono_nota(midi_hz(m)), t, 0.07, pan=0.4)


def patitas(pista):
    """Coco entra por la izquierda y Luna por la derecha (ver escena.html)."""
    def paso(gan):
        n = int(0.03 * FS)
        x = rng.normal(0, 1, n) * np.exp(-np.arange(n) / (0.004 * FS))
        return sosfilt(butter(2, [250, 1800], btype="band", fs=FS, output="sos"), x) * gan
    for i, t in enumerate(np.arange(1.55, 3.55, 0.105)):
        poner(pista, paso(0.05), t + 0.012 * (i % 2), 1.0, pan=-0.5 + 0.25 * (t - 1.55))
    for i, t in enumerate(np.arange(1.85, 3.75, 0.085)):
        poner(pista, paso(0.035), t + 0.01 * (i % 2), 1.0, pan=0.55 - 0.25 * (t - 1.85))


def risitas(pista):
    """Risita corta de la niña cuando ve a Coco y Luna (antes de cantar)."""
    try:
        import pyworld as pw
        from espeak import SR, synth
    except ImportError:
        return
    x, _ = synth("ji ji ji", voice="es+f3", rate=230, pitch=95)
    x = x.astype(np.float64)
    f0, sp, ap = pw.wav2world(x, SR, frame_period=5.0)
    k = np.linspace(0, 1, len(f0))
    f0 = np.where(f0 > 0, 620 - 120 * k, 0)
    nb = sp.shape[1]
    sp = np.array([np.interp(np.arange(nb) / 1.2, np.arange(nb), fila) for fila in sp])
    ap = np.clip(ap + 0.25, 0, 1)
    y = resample_poly(pw.synthesize(f0, sp, ap, SR, 5.0), FS, SR)
    y = y / (np.max(np.abs(y)) + 1e-9)
    poner(pista, y, 0.95, 0.10, pan=0.0)


def sala(x, seg=1.1, mezcla=0.18):
    n = int(seg * FS)
    t = np.arange(n) / FS
    ir = rng.normal(0, 1, (2, n)) * np.exp(-t * 6.0)
    ir = sosfilt(butter(1, 5000, fs=FS, output="sos"), ir)
    ir[:, : int(0.012 * FS)] = 0
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    hum = np.stack([fftconvolve(x[c], ir[c])[:N] for c in range(2)])
    return x + mezcla * hum


def main():
    inst = np.zeros((2, N))
    ukelele(inst)
    guitarra(inst)
    xilofono(inst)
    efectos = np.zeros((2, N))
    patitas(efectos)
    risitas(efectos)

    voz = np.zeros((2, N))
    fs, v = wavfile.read(os.path.join(OUT, "voz.wav"))
    v = v.astype(np.float64)[:N]
    v = sosfilt(butter(2, 140, btype="high", fs=FS, output="sos"), v)
    poner(voz, v, 0.0, 0.62 * np.sqrt(2), pan=0.0)

    mezcla = sala(inst * 0.85 + voz, mezcla=0.22) + sala(efectos, mezcla=0.1)
    # entrada y salida suaves
    env = np.ones(N)
    env[: int(0.05 * FS)] = np.linspace(0, 1, int(0.05 * FS))
    env[-int(0.35 * FS):] = np.linspace(1, 0, int(0.35 * FS)) ** 1.5
    mezcla *= env
    mezcla = np.tanh(mezcla / (np.max(np.abs(mezcla)) + 1e-9) * 1.2) * 0.89
    wavfile.write(os.path.join(OUT, "mezcla.wav"), FS, mezcla.T.astype(np.float32))
    print("mezcla ok")


if __name__ == "__main__":
    main()
