"""Voz en off de los videos de KOVA con una voz neuronal en español (Piper, se ejecuta en local).

    python3 tts.py frases.json carpeta_salida      -> frase-00.wav, frase-01.wav ... y duraciones.json

frases.json es una lista de textos. La voz es es_MX "claude" (calidad alta, licencia Apache 2.0, uso comercial
permitido). La primera vez se descarga en src/voces/ (63 MB). Requiere: pip install piper-tts numpy scipy
"""
import json
import os
import re
import sys
import urllib.request
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

VOICE = "es_MX-claude-high"
URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/claude/high/"
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "voces")
# Un poco más rápida que la velocidad normal: suena a narrador de TikTok, no a lectura
CONFIG = SynthesisConfig(length_scale=0.86, noise_scale=0.6, noise_w_scale=0.75)


def load():
    os.makedirs(DIR, exist_ok=True)
    for ext in (".onnx", ".onnx.json"):
        path = os.path.join(DIR, VOICE + ext)
        if not os.path.exists(path):
            urllib.request.urlretrieve(URL + VOICE + ext, path)
    return PiperVoice.load(os.path.join(DIR, VOICE + ".onnx"))


def speakable(text):
    """La voz pronuncia mal la í tónica seguida de vocal ("asesoría" suena "asesorila").
    Sin la tilde ("asesoria", "dias", "envios") la dice bien."""
    return re.sub(r"í(?=[aeo])", "i", re.sub(r"ú(?=[aeo])", "u", text))


def trim(path):
    """Quita el silencio del principio y del final, para que la frase arranque justo en su marca."""
    with wave.open(path) as w:
        params, x = w.getparams(), np.frombuffer(w.readframes(w.getnframes()), np.int16)
    loud = np.flatnonzero(np.abs(x) > .03 * np.abs(x).max())
    pad = int(.06 * params.framerate)
    x = x[max(0, loud[0] - pad): loud[-1] + pad] if len(loud) else x
    with wave.open(path, "wb") as w:
        w.setparams(params)
        w.writeframes(x.tobytes())
    return len(x) / params.framerate


def main(src, out):
    voice = load()
    os.makedirs(out, exist_ok=True)
    durs = []
    for i, text in enumerate(json.load(open(src))):
        path = os.path.join(out, f"frase-{i:02d}.wav")
        with wave.open(path, "wb") as w:
            voice.synthesize_wav(speakable(text), w, syn_config=CONFIG)
        durs.append(round(trim(path), 3))
    json.dump(durs, open(os.path.join(out, "duraciones.json"), "w"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
