# -*- coding: utf-8 -*-
"""Genera el icono de la extension.

La marca es un nodo central con tres conexiones: una sola conexion que reparte,
que es literalmente lo que hace API UNIVERSAL. Nada de letras: una "A" suelta no
dice nada y a 16 pixeles se pierde.

Se dibuja a 8x y se reduce, que es la forma barata de tener buen antialias.

    python servidor/hacer_iconos.py
"""

import math
import os
from PIL import Image, ImageDraw

SALIDA = os.path.join(os.path.dirname(__file__), '..', 'extension', 'iconos')
TAMANOS = [16, 32, 48, 128]
SS = 8  # supermuestreo

C1 = (91, 108, 255)    # azul
C2 = (139, 92, 246)    # violeta
BLANCO = (255, 255, 255, 255)


def degradado(lado):
    """Diagonal de C1 a C2."""
    img = Image.new('RGB', (lado, lado))
    px = img.load()
    for y in range(lado):
        for x in range(lado):
            t = (x + y) / (2 * (lado - 1))
            px[x, y] = (
                round(C1[0] + (C2[0] - C1[0]) * t),
                round(C1[1] + (C2[1] - C1[1]) * t),
                round(C1[2] + (C2[2] - C1[2]) * t),
            )
    return img


def marca(lado):
    """El nodo con sus tres conexiones, en blanco, sobre transparente."""
    capa = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    cx = cy = lado / 2

    r_centro = lado * 0.135
    r_punta = lado * 0.095
    dist = lado * 0.315
    grosor = lado * 0.068

    # los brazos primero, para que el nodo quede encima
    for grados in (-90, 30, 150):
        a = math.radians(grados)
        x2 = cx + dist * math.cos(a)
        y2 = cy + dist * math.sin(a)
        d.line([(cx, cy), (x2, y2)], fill=BLANCO, width=round(grosor))
        d.ellipse([x2 - r_punta, y2 - r_punta, x2 + r_punta, y2 + r_punta], fill=BLANCO)

    d.ellipse([cx - r_centro, cy - r_centro, cx + r_centro, cy + r_centro], fill=BLANCO)
    return capa


def icono(tam):
    lado = tam * SS
    radio = round(lado * 0.22)

    mascara = Image.new('L', (lado, lado), 0)
    ImageDraw.Draw(mascara).rounded_rectangle([0, 0, lado - 1, lado - 1], radius=radio, fill=255)

    fondo = degradado(lado).convert('RGBA')
    fondo.putalpha(mascara)
    fondo.alpha_composite(marca(lado))

    return fondo.resize((tam, tam), Image.LANCZOS)


os.makedirs(SALIDA, exist_ok=True)
for t in TAMANOS:
    ruta = os.path.join(SALIDA, 'icono%d.png' % t)
    icono(t).save(ruta)
    print('escrito', os.path.basename(ruta))

# una tira para verlos juntos
tira = Image.new('RGBA', (16 + 32 + 48 + 128 + 60, 140), (245, 246, 250, 255))
x = 12
for t in TAMANOS:
    im = icono(t)
    tira.alpha_composite(im, (x, (140 - t) // 2))
    x += t + 15
tira.save(os.path.join(SALIDA, '_muestra.png'))
print('escrito _muestra.png')
