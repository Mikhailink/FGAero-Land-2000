#!/usr/bin/env python3
"""Escaneia os cabecalhos PNG do repositorio FGAero-Land-2000 para descobrir
dimensoes e tamanho de cada imagem sem baixar o arquivo inteiro."""
import json, struct, urllib.request, concurrent.futures as cf

RAW = "https://raw.githubusercontent.com/Mikhailink/FGAero-Land-2000/main/"

def png_dims(url):
    req = urllib.request.Request(url, headers={"Range": "bytes=0-31",
                                               "User-Agent": "FGAero-tools/1.0"})
    with urllib.request.urlopen(req, timeout=25) as r:
        d = r.read(32)
    if len(d) < 24 or d[:4] != b"\x89PNG":
        return None
    return struct.unpack(">II", d[16:24])

def job(item):
    path, size = item
    try:
        dims = png_dims(RAW + path)
        return {"path": path, "size": size, "w": dims[0] if dims else 0,
                "h": dims[1] if dims else 0}
    except Exception as e:
        return {"path": path, "size": size, "w": 0, "h": 0, "err": str(e)[:60]}

if __name__ == "__main__":
    tree = json.load(open("/home/user/tree.json"))["tree"]
    items = [(x["path"], x.get("size", 0)) for x in tree
             if x["type"] == "blob" and x["path"].startswith("imagens/")]
    out = []
    with cf.ThreadPoolExecutor(max_workers=24) as ex:
        for i, res in enumerate(ex.map(job, items)):
            out.append(res)
            if i % 200 == 0:
                print(f"  ...{i}/{len(items)}", flush=True)
    json.dump(out, open("/home/user/tools/index_completo.json", "w"), indent=0)
    ok = [x for x in out if x["w"] > 0]
    print(f"escaneadas {len(ok)}/{len(items)}")
    print("maiores areas:", sorted(ok, key=lambda x: -x["w"] * x["h"])[:3])
