#!/usr/bin/env python3
"""Gera js/acervo.js — manifesto de imagens do FGAero Land 2000.

- FGA.acervo  : somente imagens presentes localmente (usadas no site/preview)
- FGA.totais   : quantidade completa de cada pasta no repositorio oficial
- FGA.pastas   : metadados das categorias (nome, icone, descricao)

Rode novamente depois de baixar mais imagens:
    python3 tools/gerar_acervo.py
"""
import json, os, glob, collections

ROOT = "/home/user"
REPO = {
    "usuario": "Mikhailink",
    "nome": "FGAero-Land-2000",
    "ramo": "main",
    "url": "https://github.com/Mikhailink/FGAero-Land-2000",
    "raw": "https://raw.githubusercontent.com/Mikhailink/FGAero-Land-2000/main/",
}

PASTAS = {
    "skyboxes": ("Céus", "", "Panoramas de céu azul com nuvens — a base de todo wallpaper Aero."),
    "foregrounds": ("Primeiros planos", "", "Grama, folhagem e detalhes que ficam na frente da cena."),
    "water": ("Água", "", "Respingos, ondas e gotas: o elemento vital do Frutiger Aero."),
    "buildings": ("Construções", "", "Arquitetura moderna, torres de vidro e cidades do futuro brilhante."),
    "metro": ("Metrô e mobilidade", "", "Frutiger Metro: grafismos, transporte e o visual urbano pós-2004."),
    "clouds": ("Nuvens", "", "Nuvens recortadas para compor cenários e transparências."),
    "trees": ("Árvores", "", "Vegetação recortada — a promessa verde do design ecológico."),
    "balloons": ("Balões", "", "Balões de ar quente: otimismo, liberdade e céu aberto."),
    "bubbles": ("Bolhas", "", "Bolhas de sabão, o ícone mais repetido da estética."),
    "sealife": ("Vida marinha", "", "Peixes tropicais — Natureza + Tecnologia em estado puro."),
    "globes": ("Globos", "", "O planeta como marca: globalização com acabamento em vidro."),
    "airplanes": ("Aviões", "", "Voar era o verbo da década."),
    "animals": ("Animais", "", "Bichos fofos e selvagens em recortes de alta resolução."),
    "insects": ("Insetos", "", "Libélulas, joaninhas e borboletas em close."),
    "flares": ("Lentes e brilhos", "", "Lens flare, bokeh e auroras — a luz da época."),
    "objects": ("Objetos", "", "Gadgets, celulares, MP3 e apetrechos do começo do milênio."),
    "miscellaneous": ("Diversos", "", "Tudo que não cabe em etiqueta: o caos organizado do acervo."),
    "furniture": ("Mobília", "", "Interiores Aero: móveis de plástico brilhante e vidro."),
    "people": ("Pessoas", "", "Figuras humanas recortadas para composições e mockups."),
}

ORDEM = list(PASTAS.keys())


def main():
    # winVista guarda os ícones da interface (.ico/.png), não faz parte do acervo
    PASTAS_IGNORADAS = {"winVista"}

    locais = collections.defaultdict(list)
    for fp in glob.glob(os.path.join(ROOT, "imagens", "*", "*")):
        rel = os.path.relpath(fp, ROOT).replace(os.sep, "/")
        partes = rel.split("/")
        if len(partes) != 3 or partes[1] in PASTAS_IGNORADAS:
            continue
        locais[partes[1]].append(rel)

    # numeracao natural (objetos_2 antes de objetos_10)
    def chave(p):
        base = os.path.splitext(os.path.basename(p))[0]
        num = base.rsplit("_", 1)[-1]
        return (int(num) if num.isdigit() else 99999, base)

    for cat in locais:
        locais[cat].sort(key=chave)

    totais = {}
    if os.path.exists(os.path.join(ROOT, "tools", "tree.json")):
        tree = json.load(open(os.path.join(ROOT, "tools", "tree.json")))["tree"]
        for x in tree:
            if x["type"] == "blob" and x["path"].startswith("imagens/"):
                cat = x["path"].split("/")[1]
                totais[cat] = totais.get(cat, 0) + 1

    categorias = []
    for nome in ORDEM:
        rotulo, _icone, desc = PASTAS[nome]
        lista = locais.get(nome, [])
        categorias.append({
            "id": nome,
            "rotulo": rotulo,
            # miniatura do proprio acervo usada como icone da categoria
            "amostra": lista[0] if lista else None,
            "descricao": desc,
            "local": len(lista),
            "total": totais.get(nome, len(lista)),
        })
    # eventuais pastas fora da lista conhecida
    for nome in sorted(set(locais) - set(ORDEM)):
        categorias.append({
            "id": nome, "rotulo": nome.title(), "amostra": locais[nome][0] if locais[nome] else None,
            "descricao": "", "local": len(locais[nome]),
            "total": totais.get(nome, len(locais[nome])),
        })

    js = ["/* Gerado por tools/gerar_acervo.py — nao edite a mao. */",
          "window.FGA = window.FGA || {};",
          "FGA.repo = " + json.dumps(REPO, ensure_ascii=False, indent=2) + ";",
          "FGA.categorias = " + json.dumps(categorias, ensure_ascii=False, indent=2) + ";",
          "FGA.acervo = " + json.dumps({k: locais[k] for k in ORDEM if k in locais},
                                       ensure_ascii=False, indent=2) + ";",
          "FGA.totalLocal = %d;" % sum(len(v) for v in locais.values()),
          "FGA.totalRepositorio = %d;" % sum(totais.values()), ""]
    destino = os.path.join(ROOT, "js", "acervo.js")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    open(destino, "w", encoding="utf-8").write("\n".join(js))
    print("js/acervo.js:", sum(len(v) for v in locais.values()), "imagens locais,",
          sum(totais.values()), "no repositorio")
    for c in categorias:
        print(f"  {c['id']:15s} local {c['local']:4d} / repo {c['total']:4d}")


if __name__ == "__main__":
    main()
