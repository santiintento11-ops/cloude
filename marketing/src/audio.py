"""Música original y efectos de sonido para los videos de TikTok/Reels de KOVA.

    python3 audio.py cues.json salida.wav

cues.json lo genera render-tiktok.js a partir de tiktok.html: duración del video, segundo en que empieza
el cierre y la lista de momentos con efecto (pop, ding, type, success, cash, whoosh, riser, impact).
Todo se sintetiza aquí (sin samples ni música de terceros), así que se puede usar en anuncios sin
problemas de derechos de autor. Requiere numpy y scipy.
"""
import json
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
BPM = 112
BEAT = 60 / BPM
RNG = np.random.default_rng(7)

# Am – F – C – G (una barra cada uno). Notas MIDI del acorde y del bajo.
CHORDS = [((57, 60, 64, 67), 45), ((53, 57, 60, 64), 41), ((52, 55, 60, 64), 48), ((55, 59, 62, 69), 43)]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def filt(x, kind, f):
    return sosfilt(butter(2, f, btype=kind, fs=SR, output="sos"), x)


def saw(f, n, ph=0.0):
    return 2 * ((ph + f * np.arange(n) / SR) % 1.0) - 1


def tri(f, n):
    return 2 * np.abs(saw(f, n)) - 1


def shift(x, s):
    """Retrasa x en s segundos sin cambiar su largo."""
    k = int(s * SR)
    return np.concatenate([np.zeros(k), x[:len(x) - k]])


def env(n, a, d):
    """Ataque lineal de a segundos y caída exponencial de constante d."""
    t = np.arange(n) / SR
    e = np.exp(-np.maximum(t - a, 0) / d)
    if a > 0:
        e *= np.minimum(t / a, 1)
    return e


def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= buf.shape[1] or i + len(x) <= 0:
        return
    j0 = max(0, -i)
    x = x[j0:]
    i = max(i, 0)
    x = x[: buf.shape[1] - i]
    buf[0, i:i + len(x)] += x * gain * (1 - max(pan, 0))
    buf[1, i:i + len(x)] += x * gain * (1 + min(pan, 0))


# ---------------------------------------------------------------- batería
def kick():
    n = int(.35 * SR)
    t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t / .03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .16)
    click = filt(RNG.standard_normal(n), "highpass", 3000) * env(n, 0, .004) * .3
    return np.tanh(1.6 * (body + click))


def clap():
    n = int(.3 * SR)
    noise = filt(RNG.standard_normal(n), "bandpass", [900, 4500])
    e = env(n, .001, .09)
    for k in (.012, .024):  # palmas un poco separadas
        e += shift(env(n, .001, .012), k) * .6
    tone = np.sin(2 * np.pi * 190 * np.arange(n) / SR) * env(n, 0, .04) * .4
    return noise * e * .55 + tone


def hat(open_=False):
    n = int((.18 if open_ else .05) * SR)
    return filt(RNG.standard_normal(n), "highpass", 7500) * env(n, 0, .06 if open_ else .012)


# ---------------------------------------------------------------- efectos
def sfx_pop():
    n = int(.12 * SR)
    t = np.arange(n) / SR
    base = 480 * 2 ** (RNG.uniform(-2, 3) / 12)
    f = base * (1 + 1.2 * (1 - np.exp(-t / .02)))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .035)


def sfx_ding():
    n = int(.9 * SR)
    out = np.zeros(n)
    for k, m in enumerate((91, 96)):  # G6 y C7, tipo notificación
        f = hz(m)
        x = (np.sin(2 * np.pi * f * np.arange(n) / SR) + .25 * np.sin(2 * np.pi * 2.76 * f * np.arange(n) / SR) * env(n, 0, .05))
        out += shift(x * env(n, .002, .28), k * .085) * (.8 if k else .6)
    return out * .7


def sfx_success():
    n = int(.6 * SR)
    out = np.zeros(n)
    for k, m in enumerate((84, 88, 91)):  # C6 E6 G6
        out += shift(tri(hz(m), n) * env(n, .003, .12), k * .055)
    return filt(out, "lowpass", 6000) * .5


def sfx_cash():
    n = int(.9 * SR)
    out = filt(RNG.standard_normal(n), "bandpass", [2500, 8000]) * env(n, .001, .02) * .6
    bell = sum(np.sin(2 * np.pi * f * np.arange(n) / SR) for f in (2637, 3520, 4186, 5274)) / 3
    out += shift(bell * env(n, .002, .22), .07)
    return out * .55


def sfx_type(length):
    n = int((length + .1) * SR)
    out = np.zeros(n)
    t = 0.0
    while t < length:
        m = int(.008 * SR)
        click = filt(RNG.standard_normal(m), "highpass", 2500) * env(m, 0, .002)
        i = int(t * SR)
        out[i:i + m] += click * RNG.uniform(.5, 1)
        t += RNG.uniform(.05, .085)
    return out * .5


def sfx_whoosh():
    n = int(.45 * SR)
    t = np.arange(n) / SR
    shape = np.sin(np.pi * np.clip(t / .42, 0, 1)) ** 2
    lo = filt(RNG.standard_normal(n), "bandpass", [300, 1500])
    hi = filt(RNG.standard_normal(n), "bandpass", [1500, 6000])
    k = np.clip(t / .42, 0, 1)
    return (lo * (1 - k) + hi * k) * shape * .35


def sfx_riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    k = t / length
    f = 220 * 2 ** (2.5 * k)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25
    noise = filt(RNG.standard_normal(n), "highpass", 2000) * .35
    return (tone + noise) * k ** 2


def sfx_impact():
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    f = 40 + 70 * np.exp(-t / .06)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .45)
    crash = filt(RNG.standard_normal(n), "highpass", 4000) * env(n, .001, .35) * .25
    return np.tanh(1.3 * boom) + crash


# ---------------------------------------------------------------- música
def music(dur, end):
    n = int(dur * SR)
    buf = np.zeros((2, n))
    beats = int(dur / BEAT) + 1
    drop = end - BEAT  # un tiempo de silencio en la batería antes del cierre

    pad = np.zeros((2, n))
    bass = np.zeros(n)
    arp = np.zeros((2, n))
    bar_n = int(4 * BEAT * SR)
    for b in range(int(dur / (4 * BEAT)) + 1):
        notes, root = CHORDS[b % 4]
        t0 = b * 4 * BEAT
        # Pad: sierras desafinadas en estéreo
        for m in notes:
            for side, det in ((0, -.08), (1, .08)):
                x = saw(hz(m) * 2 ** (det / 12), bar_n, RNG.random()) * env(bar_n, .25, 3.0)
                place(pad, x * .05, t0, pan=-1 if side == 0 else 1)
        # Bajo en corcheas
        for k in range(8):
            ln = int(BEAT / 2 * SR)
            x = np.sin(2 * np.pi * hz(root) * np.arange(ln) / SR)
            x = np.tanh(2.2 * x) * env(ln, .004, .14)
            i = int((t0 + k * BEAT / 2) * SR)
            seg = x[: max(0, n - i)]
            bass[i:i + len(seg)] += seg * .26
        # Arpegio en semicorcheas, una octava arriba
        order = [0, 1, 2, 3, 2, 1, 2, 3]
        for k in range(16):
            m = notes[order[k % 8]] + 12
            ln = int(.2 * SR)
            x = (tri(hz(m), ln) + .3 * np.sin(2 * np.pi * hz(m) * 2 * np.arange(ln) / SR)) * env(ln, .002, .07)
            place(arp, x * .07, t0 + k * BEAT / 4, pan=.35 if k % 2 else -.35)

    pad = np.stack([filt(pad[0], "lowpass", 1700), filt(pad[1], "lowpass", 1700)])
    arp = np.stack([filt(arp[0], "lowpass", 5000), filt(arp[1], "lowpass", 5000)])

    # Compresión lateral: el pad y el bajo bajan con cada bombo
    t = np.arange(n) / SR
    since = t % BEAT
    duck = 1 - .55 * np.exp(-since / .11)
    in_drop = (t >= drop) & (t < end)
    duck[in_drop] = 1
    buf += pad * duck + arp * duck * 0.9
    bass_l = bass * duck
    bass_l[in_drop] *= .3
    buf += bass_l

    k, c = kick(), clap()
    for i in range(beats):
        tb = i * BEAT
        if drop <= tb < end:
            continue
        place(buf, k, tb, .45)
        if i % 2 == 1:
            place(buf, c, tb, .33)
        place(buf, hat(), tb + BEAT / 2, .18, pan=.2)
        place(buf, hat(), tb + BEAT / 4, .07, pan=-.2)
        place(buf, hat(), tb + 3 * BEAT / 4, .07, pan=-.2)
        if i % 8 == 7:
            place(buf, hat(True), tb + BEAT / 2, .12, pan=.2)

    # Fundido final
    fade = int(.7 * SR)
    buf[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    return buf


SFX = {"pop": (sfx_pop, .4), "ding": (sfx_ding, .45), "success": (sfx_success, .55), "cash": (sfx_cash, .5),
       "whoosh": (sfx_whoosh, .55), "impact": (sfx_impact, .6)}


def main(src, dst):
    meta = json.load(open(src))
    dur, end = meta["dur"], meta["end"]
    out = music(dur, end) * .9
    for cue in meta["cues"]:
        typ, t = cue["type"], cue["t"]
        if typ == "type":
            place(out, sfx_type(cue.get("len") or 1.2), t, .45)
        elif typ == "riser":
            place(out, sfx_riser(cue.get("len") or .9), t, .4)
        elif typ in SFX:
            fn, g = SFX[typ]
            place(out, fn(), t, g, pan=RNG.uniform(-.15, .15))
    out /= max(1e-9, np.abs(out).max()) / .89
    wavfile.write(dst, SR, (out.T * 32767).astype(np.int16))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
