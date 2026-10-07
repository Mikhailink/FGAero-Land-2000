/* ==========================================================================
   FGAero Land 2000 — jogo-aquario.js
   Aquário 2000: oficina criativa. Monte uma cena Frutiger Aero sobrepondo
   imagens do acervo (peixes, balões, objetos, nuvens...), arraste para
   ajustar, gire com a roda do mouse e exporte o quadro em PNG.
   ========================================================================== */
(function () {
  "use strict";
  const FGA = window.FGA || {};
  const { inteiro, aleatorio, limitar, escolher, embaralhar, criar } = FGA.util;

  const canvas = document.querySelector("#palcoAquario");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const L = 1280;
  const A = 800;

  const estado = {
    itens: [],
    selecionado: null,
    categoria: "sealife",
    arrastando: null,
    deslocamento: { x: 0, y: 0 },
    ceu: null,
    primeiroPlano: null,
    agua: true,
    tempo: 0,
  };

  const palco = canvas.closest(".palco-jogo");
  const areaPontos = document.querySelector(".pontos-flutuantes", palco);

  /* ---------- escala por categoria ---------- */
  const ESCALAS = {
    sealife: 0.34,
    balloons: 0.42,
    airplanes: 0.5,
    insects: 0.3,
    animals: 0.4,
    clouds: 0.62,
    trees: 0.6,
    buildings: 0.75,
    globes: 0.34,
    objects: 0.34,
    furniture: 0.45,
    people: 0.4,
    water: 0.5,
    bubbles: 0.3,
    miscellaneous: 0.42,
    flares: 0.55,
    metro: 0.5,
    foregrounds: 0.8,
  };

  const CATEGORIAS_SELETOR = [
    "sealife",
    "balloons",
    "airplanes",
    "insects",
    "animals",
    "objects",
    "clouds",
    "trees",
    "globes",
    "furniture",
    "people",
    "bubbles",
    "flares",
    "water",
    "miscellaneous",
  ];

  /* ---------- cache de imagens ---------- */
  const cache = new Map();
  function imagemDe(rel) {
    if (!cache.has(rel)) {
      const img = new Image();
      img.decoding = "async";
      img.src = FGA.imagem.url(rel);
      cache.set(rel, img);
    }
    return cache.get(rel);
  }

  /* ---------- seletor de itens ---------- */
  function montarSeletor() {
    const alvo = document.querySelector("#seletorItens");
    if (!alvo) return;
    alvo.innerHTML = "";
    CATEGORIAS_SELETOR.forEach((cat) => {
      const meta = (FGA.categorias || []).find((c) => c.id === cat);
      if (!meta) return;
      const grupo = criar("div", { classe: "seletor-itens__grupo" });
      const titulo = criar("p", {
        classe: "sobretitulo",
        texto: (meta.icone || "") + " " + meta.rotulo,
        style: "margin-top:.7rem",
      });
      const linha = criar("div", { classe: "seletor-itens" });
      (FGA.acervo[cat] || []).forEach((rel) => {
        const b = criar("button", {
          classe: "seletor-itens__botao",
          type: "button",
          "aria-pressed": "false",
          title: FGA.imagem.nome(rel) + " — clique e depois clique no palco",
        });
        const img = document.createElement("img");
        img.src = FGA.imagem.url(rel);
        img.alt = FGA.imagem.nome(rel);
        img.loading = "lazy";
        img.decoding = "async";
        b.append(img);
        b.addEventListener("click", () => {
          estado.categoria = cat;
          estado.selecionado = rel;
          document.querySelectorAll(".seletor-itens__botao").forEach((o) => o.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true");
          FGA.audio && FGA.audio.sfx("clique");
          FGA.toast("Item selecionado", FGA.imagem.nome(rel) + " — agora clique no palco para posicionar.", "bom");
        });
        linha.append(b);
      });
      grupo.append(titulo, linha);
      alvo.append(grupo);
    });
    // seleciona o primeiro item automaticamente
    const primeiro = alvo.querySelector(".seletor-itens__botao");
    if (primeiro) primeiro.click();
  }

  /* ---------- cena ---------- */
  function definirCena(aleatorioCena = false) {
    const ceus = FGA.imagem.lista("skyboxes");
    const planos = FGA.imagem.lista("foregrounds");
    estado.ceu = aleatorioCena ? escolher(ceus) : estado.ceu || escolher(ceus);
    estado.primeiroPlano = aleatorioCena ? escolher(planos) : estado.primeiroPlano || escolher(planos);
    if (estado.ceu) imagemDe(estado.ceu);
    if (estado.primeiroPlano) imagemDe(estado.primeiroPlano);
  }

  function sortearCena() {
    estado.itens = [];
    definirCena(true);
    const combos = [
      { cat: "sealife", n: [3, 6] },
      { cat: "bubbles", n: [2, 4] },
      { cat: "balloons", n: [1, 2] },
      { cat: "clouds", n: [1, 3] },
      { cat: "airplanes", n: [0, 1] },
      { cat: "objects", n: [0, 2] },
      { cat: "insects", n: [0, 2] },
      { cat: "flares", n: [1, 2] },
    ];
    combos.forEach((c) => {
      const quantos = inteiro(c.n[0], c.n[1]);
      const lista = embaralhar(FGA.imagem.lista(c.cat)).slice(0, quantos);
      lista.forEach((rel) => {
        const img = imagemDe(rel);
        estado.itens.push({
          rel,
          img,
          x: aleatorio(140, L - 140),
          y: aleatorio(120, A - 150),
          escala: (ESCALAS[c.cat] || 0.4) * aleatorio(0.85, 1.25),
          rotacao: aleatorio(-0.35, 0.35),
          flip: Math.random() < 0.5,
          cat: c.cat,
        });
      });
    });
    FGA.audio && FGA.audio.sfx("respingo");
    FGA.toast("Cena sorteada", "Use os controles para ajustar ou salve em PNG.", "bom");
  }

  /* ---------- desenho ---------- */
  function desenhar(t) {
    const dt = 1 / 60;
    estado.tempo += dt;
    const dpr = limitar(window.devicePixelRatio || 1, 1, 2);
    if (canvas.width !== Math.floor(L * dpr)) {
      canvas.width = Math.floor(L * dpr);
      canvas.height = Math.floor(A * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // céu
    const ceuImg = estado.ceu ? cache.get(estado.ceu) : null;
    if (ceuImg && ceuImg.complete && ceuImg.naturalWidth) {
      ctx.drawImage(ceuImg, 0, 0, L, A);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, A);
      g.addColorStop(0, "#5cb4ec");
      g.addColorStop(0.6, "#bfe8ff");
      g.addColorStop(1, "#e8f9ff");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, L, A);
    }

    // camada de água translúcida
    if (estado.agua) {
      const agua = ctx.createLinearGradient(0, A * 0.46, 0, A);
      agua.addColorStop(0, "rgba(96,190,240,0.08)");
      agua.addColorStop(0.5, "rgba(64,165,225,0.24)");
      agua.addColorStop(1, "rgba(20,110,180,0.4)");
      ctx.fillStyle = agua;
      ctx.fillRect(0, A * 0.46, L, A * 0.54);
      // bolhas subindo
      for (let i = 0; i < 26; i++) {
        const semente = i * 137.5;
        const vel = 0.25 + (i % 5) * 0.08;
        const y = A - (((estado.tempo * 60 * vel + semente) % (A * 0.6)) + 40);
        const x = ((semente * 3.7) % L) + Math.sin(estado.tempo + i) * 24;
        const r = 5 + (i % 7) * 2.4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // itens
    estado.itens.forEach((it) => {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rotacao);
      if (it.flip) ctx.scale(-1, 1);
      const img = it.img;
      const larguraBase = L * 0.5 * it.escala * 2;
      const altBase = img && img.naturalWidth ? (larguraBase * img.naturalHeight) / img.naturalWidth : larguraBase;
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, -larguraBase / 2, -altBase / 2, larguraBase, altBase);
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(-larguraBase / 2, -altBase / 2, larguraBase, altBase);
      }
      ctx.restore();
    });

    // primeiro plano (grama/folhagem)
    const plano = estado.primeiroPlano ? cache.get(estado.primeiroPlano) : null;
    if (plano && plano.complete && plano.naturalWidth) {
      const alt = Math.min(A * 0.42, (L * plano.naturalHeight) / plano.naturalWidth);
      ctx.drawImage(plano, 0, A - alt, L, alt);
    }

    // moldura de vidro
    const brilho = ctx.createLinearGradient(0, 0, L, A * 0.6);
    brilho.addColorStop(0, "rgba(255,255,255,0.28)");
    brilho.addColorStop(0.4, "rgba(255,255,255,0.03)");
    brilho.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, L, A);

    // assinatura
    ctx.save();
    ctx.font = '600 26px "Segoe UI", sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "right";
    ctx.fillText("FGAero Land 2000", L - 28, A - 24);
    ctx.restore();

    // item selecionado destacado
    if (estado.selecionado) {
      ctx.save();
      ctx.font = '600 24px "Segoe UI", sans-serif';
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.strokeStyle = "rgba(10,50,95,0.45)";
      ctx.lineWidth = 4;
      ctx.textAlign = "left";
      const txt = FGA.imagem.nome(estado.selecionado) + " — clique no palco para posicionar";
      ctx.strokeText(txt, 24, 40);
      ctx.fillText(txt, 24, 40);
      ctx.restore();
    }
    return dt;
  }

  /* ---------- interação ---------- */
  function paraCanvas(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: ((p.clientX - r.left) / r.width) * L, y: ((p.clientY - r.top) / r.height) * A };
  }

  function itemEm(x, y) {
    for (let i = estado.itens.length - 1; i >= 0; i--) {
      const it = estado.itens[i];
      const img = it.img;
      const larg = L * 0.5 * it.escala * 2;
      const alt = img && img.naturalWidth ? (larg * img.naturalHeight) / img.naturalWidth : larg;
      if (Math.abs(x - it.x) < larg / 2 && Math.abs(y - it.y) < alt / 2) return it;
    }
    return null;
  }

  canvas.addEventListener("pointerdown", (e) => {
    FGA.audio && FGA.audio.desbloquear();
    const p = paraCanvas(e);
    const it = itemEm(p.x, p.y);
    if (it) {
      estado.arrastando = it;
      estado.deslocamento = { x: p.x - it.x, y: p.y - it.y };
      estado.itens.splice(estado.itens.indexOf(it), 1);
      estado.itens.push(it);
      canvas.style.cursor = "grabbing";
      FGA.audio && FGA.audio.sfx("clique");
      return;
    }
    if (estado.selecionado) {
      const img = imagemDe(estado.selecionado);
      const novo = {
        rel: estado.selecionado,
        img,
        x: p.x,
        y: p.y,
        escala: ESCALAS[estado.categoria] || 0.4,
        rotacao: 0,
        flip: false,
        cat: estado.categoria,
      };
      estado.itens.push(novo);
      FGA.audio && FGA.audio.sfx("bolha");
      if (areaPontos) {
        const el = document.createElement("span");
        el.className = "ponto-flutuante";
        el.textContent = "+ item";
        el.style.left = (p.x / L) * 100 + "%";
        el.style.top = (p.y / A) * 100 + "%";
        areaPontos.append(el);
        setTimeout(() => el.remove(), 950);
      }
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    const p = paraCanvas(e);
    if (estado.arrastando) {
      estado.arrastando.x = limitar(p.x - estado.deslocamento.x, 0, L);
      estado.arrastando.y = limitar(p.y - estado.deslocamento.y, 0, A);
    } else {
      const sobre = itemEm(p.x, p.y);
      canvas.style.cursor = sobre ? "grab" : estado.selecionado ? "copy" : "default";
    }
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
    canvas.addEventListener(ev, () => {
      if (estado.arrastando) FGA.audio && FGA.audio.sfx("vidro");
      estado.arrastando = null;
      canvas.style.cursor = "default";
    })
  );

  canvas.addEventListener("wheel", (e) => {
    const r = canvas.getBoundingClientRect();
    const p = { x: ((e.clientX - r.left) / r.width) * L, y: ((e.clientY - r.top) / r.height) * A };
    const it = itemEm(p.x, p.y);
    if (it) {
      e.preventDefault();
      it.escala = limitar(it.escala * (e.deltaY < 0 ? 1.1 : 0.9), 0.06, 3.2);
    }
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    const alvo = e.target.tagName;
    if (alvo === "INPUT" || alvo === "TEXTAREA") return;
    const it = estado.arrastando || estado.itens[estado.itens.length - 1];
    if (!it) return;
    const passo = e.shiftKey ? 24 : 6;
    if (e.key === "Delete" || e.key === "Backspace") {
      estado.itens.splice(estado.itens.indexOf(it), 1);
      FGA.audio && FGA.audio.sfx("erro");
    } else if (e.key === "ArrowLeft") it.x -= passo;
    else if (e.key === "ArrowRight") it.x += passo;
    else if (e.key === "ArrowUp") it.y -= passo;
    else if (e.key === "ArrowDown") it.y += passo;
    else if (e.key === "+" || e.key === "=") it.escala = limitar(it.escala * 1.1, 0.06, 3.2);
    else if (e.key === "-") it.escala = limitar(it.escala * 0.9, 0.06, 3.2);
    else if (e.key === "r") it.rotacao += 0.12;
    else if (e.key === "f") it.flip = !it.flip;
    else return;
    e.preventDefault();
  });

  /* ---------- botões ---------- */
  function ligarBotoes() {
    const acoes = {
      "#botaoDesfazer": () => {
        estado.itens.pop();
        FGA.audio && FGA.audio.sfx("clique");
      },
      "#botaoLimpar": () => {
        estado.itens = [];
        FGA.audio && FGA.audio.sfx("erro");
      },
      "#botaoSortear": sortearCena,
      "#botaoAgua": (b) => {
        estado.agua = !estado.agua;
        b.setAttribute("aria-pressed", String(estado.agua));
      },
      "#botaoTrocarCeu": () => {
        definirCena(true);
        FGA.audio && FGA.audio.sfx("vidro");
      },
      "#botaoSalvar": salvar,
      "#botaoTelaCheia": () => {
        const alvo = document.querySelector(".palco-jogo");
        if (!alvo) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else if (alvo.requestFullscreen) alvo.requestFullscreen().catch(() => {});
      },
    };
    Object.entries(acoes).forEach(([sel, fn]) => {
      const b = document.querySelector(sel);
      if (b)
        b.addEventListener("click", () => {
          FGA.audio && FGA.audio.desbloquear();
          fn(b);
        });
    });
    const agua = document.querySelector("#botaoAgua");
    if (agua) agua.setAttribute("aria-pressed", String(estado.agua));
  }

  function salvar() {
    try {
      const dados = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dados;
      a.download = "fgaero-aquario-" + Date.now() + ".png";
      document.body.append(a);
      a.click();
      a.remove();
      FGA.toast("Quadro salvo!", "Se o download não iniciar, abra a imagem em nova aba e salve manualmente.", "bom");
      FGA.audio && FGA.audio.sfx("estrela");
      // oferece a versão navegável, que funciona mesmo com download bloqueado
      const aba = document.querySelector("#linkNovaAba");
      if (aba) {
        aba.href = dados;
        aba.hidden = false;
      }
    } catch (e) {
      FGA.toast("Não foi possível exportar", "O navegador bloqueou a exportação do quadro.", "aviso");
    }
  }

  /* ---------- laço ---------- */
  function laço() {
    desenhar(performance.now());
    requestAnimationFrame(laço);
  }

  definirCena(false);
  montarSeletor();
  ligarBotoes();
  // cena inicial simpática
  ["sealife", "bubbles", "balloons", "flares"].forEach((cat, i) => {
    const rel = FGA.imagem.sprite(cat, i + 2);
    if (!rel) return;
    estado.itens.push({
      rel,
      img: imagemDe(rel),
      x: 260 + i * 250 + aleatorio(-40, 40),
      y: 320 + aleatorio(-90, 120),
      escala: (ESCALAS[cat] || 0.4) * aleatorio(0.9, 1.15),
      rotacao: aleatorio(-0.2, 0.2),
      flip: Math.random() < 0.5,
      cat,
    });
  });
  laço();
  FGA.toast("Aquário 2000", "Escolha um item na lista, clique no palco para posicionar e arraste para ajustar.", "bom");
})();
