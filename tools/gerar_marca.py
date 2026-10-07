#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera a identidade visual do FGAero Land 2000 com PIL:

    icone-192.png / icone-512.png  -> icones do site e do manifest
    apple-touch-icon.png           -> icone para iOS
    og-image.jpg                   -> imagem de compartilhamento (1200x630)

Compoe céu do acervo + globo de vidro + faixa verde + titulo em DejaVu.
"""
import os, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAIZ = "/home/user"
FONTE_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONTE_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
AZUL_ESCURO = (11, 41, 66)


def achar(padrao, padrao2=None):
    for p in sorted(glob.glob(os.path.join(RAIZ, padrao))):
        return p
    if padrao2:
        for p in sorted(glob.glob(os.path.join(RAIZ, padrao2))):
            return p
    return None


def colar_ajustado(base, caminho, largura=None, altura=None, pos=None):
    """Cola uma imagem (com alfa) ajustando pela largura ou altura."""
    if not caminho or not os.path.exists(caminho):
        return False
    img = Image.open(caminho).convert("RGBA")
    if largura:
        f = largura / img.width
        img = img.resize((int(img.width * f), int(img.height * f)), Image.LANCZOS)
    if altura:
        f = altura / img.height
        img = img.resize((int(img.width * f), int(img.height * f)), Image.LANCZOS)
    if pos:
        base.alpha_composite(img, pos)
    return True


def glifo_globo(tam):
    """Desenha o simbolo do projeto: globo de vidro com colina verde."""
    s = tam * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # esfera com gradiente radial
    for r in range(s // 2, 0, -1):
        p = r / (s / 2)
        cor = (
            int(255 - 60 * p),
            int(255 - 40 * p),
            int(255 - 20 * p),
            255,
        )
        d.ellipse([s / 2 - r, s / 2 - r, s / 2 + r, s / 2 + r], fill=cor)
    # gradiente azul em cima
    topo = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    dt = ImageDraw.Draw(topo)
    for r in range(s // 2, 0, -1):
        p = r / (s / 2)
        cor = (60, 150, 225, int(190 * (1 - p) + 40))
        dt.ellipse([s / 2 - r, s / 2 - r, s / 2 + r, s / 2 + r], fill=cor)
    img.alpha_composite(topo.filter(ImageFilter.GaussianBlur(s * 0.03)))
    # colina verde
    colina = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    dc = ImageDraw.Draw(colina)
    dc.ellipse([-s * 0.25, s * 0.52, s * 1.25, s * 1.55], fill=(121, 195, 70, 245))
    mascara = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mascara).ellipse([0, 0, s - 1, s - 1], fill=255)
    img.paste(colina, (0, 0), Image.composite(colina.split()[3], Image.new("L", (s, s), 0), mascara))
    # brilho especular
    brilho = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    db = ImageDraw.Draw(brilho)
    db.ellipse([s * 0.18, s * 0.1, s * 0.52, s * 0.34], fill=(255, 255, 255, 200))
    img.alpha_composite(brilho.filter(ImageFilter.GaussianBlur(s * 0.02)))
    # aro
    d.ellipse([s * 0.02, s * 0.02, s * 0.98, s * 0.98], outline=(255, 255, 255, 235), width=int(s * 0.035))
    return img.resize((tam, tam), Image.LANCZOS)


def gerar_icones():
    ceu = achar("imagens/skyboxes/*.png")
    base = Image.open(ceu).convert("RGBA") if ceu else Image.new("RGBA", (512, 512), (120, 200, 255, 255))
    # recorte quadrado central
    lado = min(base.size)
    base = base.crop(
        ((base.width - lado) // 2, (base.height - lado) // 2, (base.width + lado) // 2, (base.height + lado) // 2)
    )
    for tam in (512, 192, 180):
        fundo = base.resize((tam, tam), Image.LANCZOS).convert("RGBA")
        # escurece levemente o topo para contraste
        sombra = Image.new("RGBA", (tam, tam), (0, 0, 0, 0))
        ImageDraw.Draw(sombra).rectangle([0, 0, tam, tam], fill=(6, 40, 80, 40))
        fundo.alpha_composite(sombra)
        globo = glifo_globo(int(tam * 0.72))
        fundo.alpha_composite(globo, ((tam - globo.width) // 2, (tam - globo.height) // 2))
        nome = {512: "icone-512.png", 192: "icone-192.png", 180: "apple-touch-icon.png"}[tam]
        fundo.convert("RGB").save(os.path.join(RAIZ, nome), "PNG", optimize=True)
        print("  gerado:", nome, f"{tam}x{tam}")


def ceu_vivo():
    """Escolhe o ceu mais saturado entre os skyboxes locais."""
    melhor, melhor_nota = None, -1
    for caminho in glob.glob(os.path.join(RAIZ, "imagens/skyboxes/*.png")):
        im = Image.open(caminho).convert("RGB").resize((48, 48))
        px = list(im.getdata())
        r = sum(p[0] for p in px) / len(px)
        g = sum(p[1] for p in px) / len(px)
        b = sum(p[2] for p in px) / len(px)
        nota = (b - r) * 1.6 + b * 0.5 - abs(150 - (r + g + b) / 3) * 0.4
        if nota > melhor_nota:
            melhor, melhor_nota = caminho, nota
    return melhor


def texto_ajustado(draw, txt, fonte_caminho, largura_max, tamanho_inicial, minimo=28):
    tamanho = tamanho_inicial
    while tamanho > minimo:
        fonte = ImageFont.truetype(fonte_caminho, tamanho)
        caixa = draw.textbbox((0, 0), txt, font=fonte)
        if caixa[2] - caixa[0] <= largura_max:
            return fonte, caixa[2] - caixa[0]
        tamanho -= 2
    return ImageFont.truetype(fonte_caminho, minimo), caixa[2] - caixa[0]


def gerar_og():
    L, A = 1200, 630
    ceu = ceu_vivo()
    base = Image.open(ceu).convert("RGBA") if ceu else Image.new("RGBA", (L, A), (110, 195, 250, 255))
    prop = L / A
    if base.width / base.height > prop:
        nova = (int(base.height * prop), base.height)
    else:
        nova = (base.width, int(base.width / prop))
    base = base.resize(nova, Image.LANCZOS)
    esq = (base.width - L) // 2
    topo = max(0, int((base.height - A) * 0.35))
    base = base.crop((esq, topo, esq + L, topo + A)).convert("RGBA")

    # veu: mais escuro embaixo e atras do texto
    veu = Image.new("RGBA", (L, A), (0, 0, 0, 0))
    dv = ImageDraw.Draw(veu)
    for y in range(A):
        p = y / A
        dv.line([(0, y), (L, y)], fill=(7, 46, 92, int(18 + 165 * max(0.0, (p - 0.12) / 0.88))))
    grad = Image.new("RGBA", (L, A), (0, 0, 0, 0))
    dg = ImageDraw.Draw(grad)
    for x in range(L):
        p = x / L
        dg.line([(x, 0), (x, A)], fill=(7, 46, 92, int(120 * max(0.0, 1 - p * 1.35))))
    veu.alpha_composite(grad)
    base.alpha_composite(veu)

    # titulo com ajuste automatico de largura
    provisorio = ImageDraw.Draw(base)
    f_titulo, largura_titulo = texto_ajustado(provisorio, "FGAero Land 2000", FONTE_B, 900, 96)
    x_titulo = 54
    y_titulo = 150

    # sprites posicionados fora da area de texto
    balao = achar("imagens/balloons/balloons_15.png", "imagens/balloons/*.png")
    peixe = achar("imagens/sealife/sealife_29.png", "imagens/sealife/*.png")
    aviao = achar("imagens/airplanes/*.png")
    colar_ajustado(base, balao, altura=200, pos=(L - 178, 18))
    colar_ajustado(base, peixe, altura=200, pos=(60, A - 232))
    colar_ajustado(base, aviao, altura=118, pos=(L - 300, A - 150))

    d = ImageDraw.Draw(base)
    f_sub = ImageFont.truetype(FONTE_R, 31)
    f_selo = ImageFont.truetype(FONTE_B, 25)

    def escrever(pos, txt, fonte, cor, sombra=(5, 36, 74, 210)):
        x, y = pos
        d.text((x + 3, y + 4), txt, font=fonte, fill=sombra)
        d.text((x, y), txt, font=fonte, fill=cor)

    escrever((x_titulo, y_titulo), "FGAero Land 2000", f_titulo, (255, 255, 255, 255))
    base_y = y_titulo + (f_titulo.size + 26)
    escrever((x_titulo + 4, base_y), "arquivo vivo do Frutiger Aero · 1.284 imagens", f_sub, (234, 250, 255, 255))
    escrever(
        (x_titulo + 4, base_y + 46),
        "galeria · 5 minigames · música sintetizada · anos 2000",
        f_sub,
        (223, 245, 255, 255),
    )

    # selo de vidro
    selo_txt = "vidro · bolhas · céu azul · 2004–2013"
    caixa = d.textbbox((0, 0), selo_txt, font=f_selo)
    larg = caixa[2] - caixa[0] + 44
    selo = Image.new("RGBA", (larg, 60), (0, 0, 0, 0))
    ds = ImageDraw.Draw(selo)
    ds.rounded_rectangle([0, 0, larg - 1, 59], radius=30, fill=(255, 255, 255, 240), outline=(255, 255, 255, 255), width=2)
    ds.text((22, 17), selo_txt, font=f_selo, fill=AZUL_ESCURO)
    base.alpha_composite(selo, (x_titulo + 4, base_y + 100))

    # globo como assinatura
    globo = glifo_globo(120)
    base.alpha_composite(globo, (L - 168, A - 150))

    base.convert("RGB").save(os.path.join(RAIZ, "og-image.jpg"), "JPEG", quality=88, optimize=True)
    print("  gerado: og-image.jpg", f"{L}x{A}", f"{os.path.getsize(os.path.join(RAIZ,'og-image.jpg'))//1024} KB", "(ceu:", os.path.basename(ceu or ""), ")")


if __name__ == "__main__":
    print("Gerando identidade visual...")
    gerar_icones()
    gerar_og()
    print("Pronto.")
