"""Voz cantada de la niña: eSpeak dice la frase, WORLD (pyworld) la estira sílaba a
sílaba sobre la melodía, le pone la altura de cada nota, vibrato y un timbre más
infantil. Además exporta la apertura de boca por fotograma para el lip sync.

    python3 voz.py  ->  build/voz.wav (44.1 kHz) y build/boca.json (24 fps)
"""
import json
import os

import numpy as np
import pyworld as pw
from scipy.io import wavfile
from scipy.signal import resample_poly

from espeak import SR, synth
from partitura import BPM, DUR, FPS, LETRA, NOTAS, midi_hz

OUT = os.path.join(os.path.dirname(__file__), "build")
FS = 44100
FP = 5.0  # ms por fotograma de análisis WORLD
VOCALES = set("aeiou")
CERRADAS = {"m", "b", "p", "B"}  # labiales: boca cerrada


def es_vocal(p):
    return p.strip("',.").lower() in VOCALES


def es_pausa(p):
    return p.startswith("_")


def mapa_tiempo(fonemas, fin_audio):
    """Anclas (t_origen, t_destino): las consonantes conservan su duración natural
    y las vocales se estiran hasta ocupar cada nota."""
    seg = [(t, fonemas[i + 1][0] if i + 1 < len(fonemas) else fin_audio, p) for i, (t, p) in enumerate(fonemas)]
    vocales = [i for i, s in enumerate(seg) if es_vocal(s[2])]
    assert len(vocales) == len(NOTAS), f"{len(vocales)} vocales para {len(NOTAS)} notas"
    anclas = []

    # Ataque: lo que va antes de la primera vocal termina justo en su nota
    t0 = NOTAS[0][0]
    ini = [s for s in seg[:vocales[0]] if not es_pausa(s[2])]
    d = sum(b - a for a, b, _ in ini)
    anclas.append((ini[0][0] if ini else seg[vocales[0]][0], t0 - d))

    for k, vi in enumerate(vocales):
        ini_nota, fin_nota = NOTAS[k][0], NOTAS[k][1]
        sig = NOTAS[k + 1][0] if k + 1 < len(NOTAS) else fin_nota
        fin_seg = vocales[k + 1] if k + 1 < len(vocales) else len(seg)
        medio = seg[vi + 1:fin_seg]
        cons = [s for s in medio if not es_pausa(s[2])]
        hay_pausa = len(cons) != len(medio) or fin_nota < sig - 1e-6
        dur_c = sum(b - a for a, b, _ in cons)
        escala = min(1.0, 0.55 * (sig - ini_nota) / dur_c) if dur_c > 0 else 1.0
        anclas.append((seg[vi][0], ini_nota))
        if hay_pausa:
            # coda antes del silencio, ataque de la siguiente justo antes de su nota
            coda, ataque, vista_pausa = [], [], False
            for s in medio:
                if es_pausa(s[2]):
                    vista_pausa = True
                elif vista_pausa:
                    ataque.append(s)
                else:
                    coda.append(s)
            dc = sum(b - a for a, b, _ in coda) * escala
            da = sum(b - a for a, b, _ in ataque) * escala
            anclas.append((seg[vi][1], fin_nota - dc))
            if coda:
                anclas.append((coda[-1][1], fin_nota))
            if ataque:
                anclas.append((ataque[0][0], sig - da))
        else:
            anclas.append((seg[vi][1], sig - dur_c * escala))
    anclas.append((fin_audio, NOTAS[-1][1] + 0.08))
    # garantizar monotonía estricta
    limpio = [anclas[0]]
    for a in anclas[1:]:
        if a[0] > limpio[-1][0] + 1e-4 and a[1] > limpio[-1][1] + 1e-4:
            limpio.append(a)
    return np.array(limpio), seg, vocales


def curva_f0(t):
    """Melodía con portamento corto, pequeño 'scoop' al atacar y vibrato en notas largas."""
    f = np.zeros_like(t)
    for k, (a, b, m) in enumerate(NOTAS):
        sel = (t >= a - 0.04) & (t < (NOTAS[k + 1][0] - 0.04 if k + 1 < len(NOTAS) else b + 0.2))
        f[sel] = m
    # portamento: suaviza la escalera en semitonos (ventana ~45 ms)
    w = int(0.045 / (FP / 1000))
    f = np.convolve(np.pad(f, w, mode="edge"), np.ones(w) / w, mode="same")[w:-w]
    vib = np.zeros_like(t)
    for a, b, m in NOTAS:
        if b - a >= 0.45:
            sel = (t >= a) & (t < b)
            env = np.clip((t[sel] - a - 0.18) / 0.15, 0, 1)
            vib[sel] = 0.32 * env * np.sin(2 * np.pi * 5.6 * (t[sel] - a))
    return midi_hz(f + vib)


def main():
    os.makedirs(OUT, exist_ok=True)
    texto = LETRA.replace("¡", "")
    x, fonemas = synth(texto, voice="es+f3", rate=125, pitch=70)
    x = x.astype(np.float64)
    fin = len(x) / SR
    anclas, seg, vocales = mapa_tiempo(fonemas, fin)

    f0, sp, ap = pw.wav2world(x, SR, frame_period=FP)
    n_src = len(f0)
    t_out = np.arange(0, DUR, FP / 1000)
    t_src = np.interp(t_out, anclas[:, 1], anclas[:, 0], left=-1, right=-1)
    activo = t_src >= 0
    idx = np.clip(t_src / (FP / 1000), 0, n_src - 1)
    i0 = np.floor(idx).astype(int)
    i1 = np.minimum(i0 + 1, n_src - 1)
    w = (idx - i0)[:, None]
    sp2 = sp[i0] * (1 - w) + sp[i1] * w
    ap2 = ap[i0] * (1 - w) + ap[i1] * w
    sonora = (f0[i0] > 0) | (f0[i1] > 0)

    # timbre infantil: desplaza formantes hacia arriba y suaviza el zumbido de eSpeak
    nb = sp2.shape[1]
    bins = np.arange(nb)
    sp2 = np.array([np.interp(bins / 1.16, bins, fila) for fila in sp2])
    freqs = bins * SR / 2 / (nb - 1)
    sp2 *= (1 / (1 + (freqs / 4500) ** 4))[None, :]
    ap2 = np.clip(ap2 + 0.08, 0, 1)

    f0n = np.where(sonora & activo, curva_f0(t_out), 0.0)
    sp2[~activo] = 1e-12
    ap2[~activo] = 1.0
    y = pw.synthesize(np.ascontiguousarray(f0n), np.ascontiguousarray(sp2), np.ascontiguousarray(ap2), SR, FP)
    y = resample_poly(y, FS, SR)[: int(DUR * FS)]
    y = np.pad(y, (0, int(DUR * FS) - len(y)))
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.9
    wavfile.write(os.path.join(OUT, "voz.wav"), FS, y.astype(np.float32))

    # --- lip sync -----------------------------------------------------------
    def destino(ts):
        return np.interp(ts, anclas[:, 0], anclas[:, 1])

    forma = {"a": (1.0, 0.0), "e": (0.7, 0.0), "i": (0.45, 0.0), "o": (0.8, 0.8), "u": (0.5, 1.0)}
    tf = np.arange(int(DUR * FPS)) / FPS
    abre = np.zeros_like(tf)
    redondo = np.zeros_like(tf)
    for a, b, p in seg:
        ta, tb = destino(a), destino(b)
        base = p.strip("',.").lower()
        if base in forma:
            o, r = forma[base]
        elif es_pausa(p) or p in CERRADAS:
            o, r = 0.0, 0.0
        else:
            o, r = 0.25, 0.0
        sel = (tf >= ta) & (tf < tb)
        abre[sel], redondo[sel] = o, r
    # energía real de la voz para que la boca respire con el sonido
    hop = FS // FPS
    rms = np.array([np.sqrt(np.mean(y[i * hop:(i + 1) * hop] ** 2)) for i in range(len(tf))])
    rms = np.clip(rms / (np.percentile(rms[rms > 0.01], 90) + 1e-9), 0, 1) if np.any(rms > 0.01) else rms
    abre = abre * (0.55 + 0.45 * rms) * (rms > 0.02)
    k = np.array([0.25, 0.5, 0.25])
    abre = np.convolve(abre, k, mode="same")
    redondo = np.convolve(redondo, k, mode="same")
    with open(os.path.join(OUT, "boca.json"), "w") as fh:
        json.dump({"fps": FPS, "abre": np.round(abre, 3).tolist(), "redondo": np.round(redondo, 3).tolist()}, fh)
    print("voz ok", fin, "s de eSpeak ->", DUR, "s")


if __name__ == "__main__":
    main()
