"""Tiempo, letra, melodía y acordes compartidos por la voz, la música y la animación."""
import numpy as np

FPS, DUR, BPM = 24, 8.0, 120  # negra = 0.5 s, compás de 4/4 = 2 s
LETRA = "¡Bienvenidos a Huellitas Creativas, donde tejemos mucho amor!"

# Sol mayor. (inicio s, fin s, nota MIDI) por vocal, en el orden en que eSpeak las dice:
# bien-ve-NI-dos a hue-LLI-tas cre-a-TI-vas | DON-de te-JE-mos MU-cho a-MOR
G4, A4, B4, D4, D5 = 67, 69, 71, 62, 74
_S = [
    (1.50, D4), (1.75, G4), (2.00, B4), (2.25, B4), (2.50, A4), (2.75, B4),
    (3.00, D5), (3.25, B4), (3.50, A4), (3.75, B4), (4.00, A4), (4.25, A4),
    (5.00, D5), (5.25, B4), (5.75, G4), (6.00, A4), (6.25, B4), (6.50, B4),
    (6.75, A4), (6.875, A4), (7.00, G4),
]
_FIN = {11: 4.80, 20: 7.75}  # notas largas que acaban antes de la siguiente
NOTAS = [(t, _FIN.get(i, _S[i + 1][0] if i + 1 < len(_S) else 7.75), m) for i, (t, m) in enumerate(_S)]

# Acordes (inicio s, nombre)
ACORDES = [(0.0, "G"), (2.0, "G"), (3.0, "Em"), (4.0, "D"), (5.0, "G"), (6.0, "D"), (7.0, "G")]


def midi_hz(m):
    return 440.0 * 2 ** ((np.asarray(m, dtype=float) - 69) / 12)
