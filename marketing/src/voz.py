"""Voz en off de la serie 2 de videos de KOVA (Chatterbox Multilingual, se ejecuta en local).

    python voz.py frases.json carpeta_salida   -> frase-00.wav ... y frases-info.json

Por cada frase:
  1. La genera con Chatterbox Multilingual (licencia MIT, uso comercial permitido) en español, con el timbre
     de voz-referencia.wav (una voz sintética de Piper es_MX "ald", de dominio público, no una persona real).
  2. La transcribe con Whisper para comprobar que se dijo bien. Si no se parece al guion, la repite (hasta 4 veces).
  3. Saca el segundo exacto de cada palabra, para los subtítulos palabra por palabra y para que las
     animaciones caigan justo cuando se dice cada palabra.

frases-info.json: [{"dur": segundos, "words": [{"w": "Contraté", "s": 0.12, "e": 0.48}, ...]}, ...]
Requiere (en un entorno aparte, por las versiones fijas de chatterbox):
    pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
    pip install chatterbox-tts faster-whisper num2words
"""
import difflib
import json
import os
import re
import sys
import unicodedata

import numpy as np
import torch
import torchaudio
from faster_whisper import WhisperModel
from num2words import num2words

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "voz-referencia.wav")
TRIES = 4


def norm(word):
    word = unicodedata.normalize("NFD", word.lower())
    return re.sub(r"[^a-z0-9ñ]", "", "".join(ch for ch in word if unicodedata.category(ch) != "Mn"))


def spoken(words):
    """Pasa a palabras los números que escribe Whisper ("24" -> "veinticuatro") para comparar con el guion."""
    out = []
    for w in words:
        n = norm(w)
        if n.isdigit():
            out += [norm(x) for x in num2words(int(n), lang="es").split()]
        elif n:
            out.append(n)
    return out


def align(script, heard):
    """Pone tiempo a cada palabra del guion usando las palabras que oyó Whisper."""
    tokens = script.split()
    a = [norm(t) for t in tokens]
    b = [norm(w.word) for w in heard]
    times = [None] * len(tokens)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (heard[blk.b + k].start, heard[blk.b + k].end)
    # Las que no coinciden (números, palabras unidas) se reparten entre las vecinas según su largo
    i = 0
    while i < len(tokens):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(tokens) and times[j] is None:
            j += 1
        start = times[i - 1][1] if i > 0 else (heard[0].start if heard else 0.0)
        end = times[j][0] if j < len(tokens) else (heard[-1].end if heard else start + .4 * (j - i))
        end = max(end, start + .12 * (j - i))
        total = sum(len(t) for t in tokens[i:j]) or 1
        t = start
        for k in range(i, j):
            d = (end - start) * len(tokens[k]) / total
            times[k] = (t, t + d)
            t += d
        i = j
    return [{"w": tok, "s": round(s, 3), "e": round(e, 3)} for tok, (s, e) in zip(tokens, times)]


def trim(wav, sr):
    x = wav.numpy()[0]
    loud = np.flatnonzero(np.abs(x) > .02 * np.abs(x).max())
    a = max(0, loud[0] - int(.05 * sr)) if len(loud) else 0
    b = min(len(x), loud[-1] + int(.12 * sr)) if len(loud) else len(x)
    return wav[:, a:b]


def main(src, out):
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    texts = json.load(open(src))
    os.makedirs(out, exist_ok=True)
    tts = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    asr = WhisperModel("small", device="cpu", compute_type="int8")
    info = []
    for i, text in enumerate(texts):
        path = os.path.join(out, f"frase-{i:02d}.wav")
        best = None
        for attempt in range(TRIES):
            torch.manual_seed(1234 + 97 * attempt + i)
            wav = trim(tts.generate(text, language_id="es", audio_prompt_path=REF,
                                    exaggeration=.5, cfg_weight=.5, temperature=.75), tts.sr)
            torchaudio.save(path, wav, tts.sr)
            segs, _ = asr.transcribe(path, language="es", word_timestamps=True)
            heard = [w for s in segs for w in s.words]
            score = difflib.SequenceMatcher(None, spoken(text.split()), spoken([w.word for w in heard])).ratio()
            if best is None or score > best[0]:
                best = (score, wav, heard)
            if score >= .9:
                break
        score, wav, heard = best
        torchaudio.save(path, wav, tts.sr)
        info.append({"dur": round(wav.shape[-1] / tts.sr, 3), "score": round(score, 3), "words": align(text, heard)})
        print(f"  frase {i}: {info[-1]['dur']} s, parecido {score:.2f}", flush=True)
    json.dump(info, open(os.path.join(out, "frases-info.json"), "w"), ensure_ascii=False)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
