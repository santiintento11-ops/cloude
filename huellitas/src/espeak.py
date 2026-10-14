"""Envoltorio mínimo de libespeak-ng (paquete pip espeakng-loader) que devuelve
el audio y la posición de cada fonema, para poder cantar sílaba por sílaba."""
import ctypes as C

import espeakng_loader
import numpy as np


class _Id(C.Union):
    _fields_ = [("number", C.c_int), ("name", C.c_char_p), ("string", C.c_char * 8)]


class _Event(C.Structure):
    _fields_ = [("type", C.c_int), ("unique_identifier", C.c_uint), ("text_position", C.c_int),
                ("length", C.c_int), ("audio_position", C.c_int), ("sample", C.c_int),
                ("user_data", C.c_void_p), ("id", _Id)]


_CB = C.CFUNCTYPE(C.c_int, C.POINTER(C.c_short), C.c_int, C.POINTER(_Event))
_lib = C.CDLL(espeakng_loader.get_library_path())
_RETRIEVAL, _PHONEME_EVENTS, _CHARS_UTF8 = 1, 1, 1
_EV_WORD, _EV_PHONEME, _EV_END = 1, 7, 5

_lib.espeak_Initialize.restype = C.c_int
SR = _lib.espeak_Initialize(_RETRIEVAL, 0, espeakng_loader.get_data_path().encode(), _PHONEME_EVENTS)


def synth(text, voice="es+f3", rate=120, pitch=60):
    """Devuelve (audio float32 a SR Hz, [(t_segundos, fonema)])."""
    chunks, events = [], []

    def cb(wav, n, ev):
        if n > 0:
            chunks.append(np.ctypeslib.as_array(wav, shape=(n,)).copy())
        i = 0
        while ev[i].type != 0:
            if ev[i].type == _EV_PHONEME:
                events.append((ev[i].audio_position / 1000.0, ev[i].id.string.decode("utf-8", "replace")))
            i += 1
        return 0

    keep = _CB(cb)
    _lib.espeak_SetSynthCallback(keep)
    _lib.espeak_SetVoiceByName(voice.encode())
    _lib.espeak_SetParameter(1, rate, 0)   # espeakRATE
    _lib.espeak_SetParameter(3, pitch, 0)  # espeakPITCH
    b = text.encode("utf-8") + b"\0"
    _lib.espeak_Synth(b, len(b), 0, 0, 0, _CHARS_UTF8, None, None)
    _lib.espeak_Synchronize()
    audio = np.concatenate(chunks).astype(np.float32) / 32768.0 if chunks else np.zeros(0, np.float32)
    return audio, events


if __name__ == "__main__":
    import sys
    a, ev = synth(sys.argv[1] if len(sys.argv) > 1 else "Bienvenidos a Huellitas Creativas")
    print(SR, len(a) / SR)
    for t, p in ev:
        print(f"{t:6.3f} {p}")
