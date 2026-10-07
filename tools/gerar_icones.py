#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Converte os icones .ico do Windows Vista (pasta imagens/winVista) em PNG
para uso na interface do site, escolhendo o maior tamanho disponivel dentro
de cada arquivo e limitando a 128px.

    python3 tools/gerar_icones.py

Saida: imagens/winVista/png/<nome>.png
"""
import glob, os
from PIL import Image

RAIZ = "/home/user"
ORIGEM = os.path.join(RAIZ, "imagens", "winVista")
DESTINO = os.path.join(ORIGEM, "png")
LIMITE = 128


def maior_tamanho(im):
    try:
        return sorted(im.ico.sizes(), key=lambda s: s[0])[-1]
    except Exception:
        return im.size


def main():
    os.makedirs(DESTINO, exist_ok=True)
    arquivos = sorted(glob.glob(os.path.join(ORIGEM, "*.ico")))
    print(f"convertendo {len(arquivos)} icones...")
    for caminho in arquivos:
        nome = os.path.splitext(os.path.basename(caminho))[0]
        destino = os.path.join(DESTINO, nome + ".png")
        try:
            im = Image.open(caminho)
            im.size = maior_tamanho(im)
            im = im.convert("RGBA")
            if max(im.size) > LIMITE:
                im = im.resize((LIMITE, LIMITE), Image.LANCZOS)
            im.save(destino, "PNG", optimize=True)
            print(f"  {nome:26s} {im.size[0]:>3}px  {os.path.getsize(destino)//1024:>4} KB")
        except Exception as e:
            print(f"  {nome:26s} ERRO: {e}")
    print("pronto:", DESTINO)


if __name__ == "__main__":
    main()
