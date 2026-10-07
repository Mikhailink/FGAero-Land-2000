#!/usr/bin/env python3
"""Curadoria + download + otimizacao do subset de imagens do FGAero Land 2000.

Baixa as imagens do repositorio Mikhailink/FGAero-Land-2000 seguindo as regras
de curadoria por pasta e salva versoes otimizadas (menores, para web) mantendo
EXATAMENTE o mesmo caminho relativo usado no repositorio oficial:
    imagens/<pasta>/<pasta>_<n>.<ext>
"""
import io, json, os, sys, time, urllib.request, concurrent.futures as cf
from PIL import Image

RAW = "https://raw.githubusercontent.com/Mikhailink/FGAero-Land-2000/main/"
ROOT = "/home/user"
DEST = os.path.join(ROOT, "imagens")

# pasta -> (quantidade, perfil)
SELECAO = {
    "skyboxes":      (10, "bg"),
    "foregrounds":   (7,  "bg"),
    "water":         (7,  "bg"),
    "buildings":     (8,  "bg"),
    "metro":         (6,  "bg"),
    "clouds":        (9,  "sprite"),
    "trees":         (9,  "sprite"),
    "balloons":      (11, "sprite"),
    "bubbles":       (11, "sprite"),
    "sealife":       (11, "sprite"),
    "globes":        (9,  "sprite"),
    "airplanes":     (9,  "sprite"),
    "animals":       (9,  "sprite"),
    "insects":       (7,  "sprite"),
    "flares":        (9,  "sprite"),
    "objects":       (14, "sprite"),
    "miscellaneous": (11, "sprite"),
    "furniture":     (7,  "sprite"),
    "people":        (7,  "sprite"),
}


def escolher(ix):
    """Aplica filtros de qualidade e ordena dos mais leves para os mais pesados."""
    escolhidas = {}
    for pasta, (qtd, perfil) in SELECAO.items():
        cand = []
        for it in ix:
            partes = it["path"].split("/")
            if len(partes) != 3 or partes[1] != pasta or it["w"] == 0:
                continue
            w, h, sz = it["w"], it["h"], it["size"]
            if not (25_000 <= sz <= 4_500_000):
                continue
            ratio = w / h
            if perfil == "bg":
                if w < 900 or not (1.2 <= ratio <= 2.6):
                    continue
            else:
                if max(w, h) < 260 or max(w, h) > 2600 or not (0.35 <= ratio <= 2.8):
                    continue
            cand.append(it)
        cand.sort(key=lambda x: x["size"])
        escolhidas[pasta] = cand[:qtd]
    return escolhidas


def baixar(item):
    pasta, nome = item["path"].split("/")[1:3]
    destino = os.path.join(DEST, pasta, nome)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    if os.path.exists(destino):
        return {"path": item["path"], "status": "cache"}
    for tent in range(4):
        try:
            req = urllib.request.Request(RAW + item["path"],
                                         headers={"User-Agent": "FGAero/1.0"})
            dados = urllib.request.urlopen(req, timeout=90).read()
            otimizar(dados, destino, pasta)
            return {"path": item["path"], "status": "ok",
                    "kb": round(os.path.getsize(destino) / 1024)}
        except Exception as e:
            ultimo = str(e)[:70]
            time.sleep(1.5 * (tent + 1))
    return {"path": item["path"], "status": "falha", "erro": ultimo}


def otimizar(dados, destino, pasta):
    """Redimensiona e recomprime mantendo o formato PNG (com alfa quando existe)."""
    im = Image.open(io.BytesIO(dados))
    im.load()
    tem_alfa = im.mode in ("RGBA", "LA", "P") and "transparency" in im.info or im.mode in ("RGBA", "LA")
    limite = 1500 if pasta in ("skyboxes", "water", "foregrounds", "metro", "buildings") else 760
    if max(im.size) > limite:
        f = limite / max(im.size)
        novo = (max(1, round(im.width * f)), max(1, round(im.height * f)))
        im = im.resize(novo, Image.LANCZOS)
    if tem_alfa:
        im = im.convert("RGBA")
        alpha = im.getchannel("A")
        # guarda apenas se realmente houver transparencia
        if alpha.getextrema()[0] >= 250:
            im = im.convert("RGB")
            tem_alfa = False
    if tem_alfa:
        im.save(destino, "PNG", optimize=True)
    else:
        im = im.convert("RGB")
        im.quantize(colors=256, method=Image.MEDIANCUT).save(destino, "PNG", optimize=True)
    # se o resultado ficou maior que o original, guarda o original cru
    if os.path.getsize(destino) > len(dados):
        with open(destino, "wb") as fh:
            fh.write(dados)


if __name__ == "__main__":
    ix = json.load(open(os.path.join(ROOT, "tools/index_completo.json")))
    sel = escolher(ix)
    total = sum(len(v) for v in sel.values())
    print(f"selecionadas {total} imagens")
    fila = [it for v in sel.values() for it in v]
    json.dump(sel, open(os.path.join(ROOT, "tools/selecao.json"), "w"), indent=1)
    feitos = []
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        for i, r in enumerate(ex.map(baixar, fila)):
            feitos.append(r)
            if (i + 1) % 25 == 0 or i + 1 == len(fila):
                print(f"  {i+1}/{len(fila)}", flush=True)
    ok = [r for r in feitos if r["status"] in ("ok", "cache")]
    print(f"baixadas {len(ok)}/{len(fila)}")
    for r in feitos:
        if r["status"] == "falha":
            print("  falha:", r["path"], r["erro"])
    json.dump(feitos, open(os.path.join(ROOT, "tools/download_log.json"), "w"), indent=1)
