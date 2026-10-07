/* ==========================================================================
   FGAero Land 2000 — jogos.js
   Engine compartilhada dos minigames: canvas com densidade de tela, laço de
   animação com pausa automática, HUD, recordes, contagem regressiva,
   pontuações flutuantes, entradas (teclado/toque/ponteiro) e pré-carga de
   imagens do acervo.
   ========================================================================== */
(function () {
  "use strict";

  const FGA = window.FGA || {};
  const { $, $$, criar, inteiro, escolher, limitar, aleatorio } = FGA.util;

  /* ------------------------------------------------------------------
     Imagens dos jogos
     ------------------------------------------------------------------
     O acervo é de imagens grandes (1500 px ou mais). Desenhar esses PNGs
     encolhidos a cada quadro era o que deixava os jogos pesados — então,
     no carregamento, cada imagem ganha uma versão reduzida em canvas
     (img.mini) no tamanho em que ela realmente é desenhada, e o jogo usa
     essa versão. Vale também para telas com dpr alto (ver escalaTela).
     ------------------------------------------------------------------ */
  function criarMini(img, ladoMax) {
    if (!img || !ladoMax || img.mini) return;
    const montar = () => {
      if (img.mini || !img.naturalWidth) return;
      const escala = Math.min(1, ladoMax / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * escala));
      c.height = Math.max(1, Math.round(img.naturalHeight * escala));
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      g.drawImage(img, 0, 0, c.width, c.height);
      img.mini = c;
    };
    if (img.complete && img.naturalWidth) montar();
    else img.addEventListener("load", montar, { once: true });
  }

  /** A imagem já pode ser desenhada? (vale para <img> e para o mini) */
  function pronta(img) {
    if (!img) return false;
    return !!(img.mini || (img.complete && img.naturalWidth));
  }

  /** O que vai para o drawImage: a versão reduzida, quando existe. */
  function fonte(img) {
    return (img && img.mini) || img;
  }

  function carregarImagem(rel, ladoMax = 0) {
    const img = new Image();
    img.decoding = "async";
    img.src = FGA.imagem.url(rel);
    img.dataset.caminho = rel;
    criarMini(img, ladoMax);
    return img;
  }

  function carregarImagens(categoria, quantidade, ladoMax = 0) {
    const lista = (FGA.acervo[categoria] || []).slice();
    const escolhidas = [];
    const copia = lista.slice();
    while (escolhidas.length < quantidade && copia.length) {
      const i = Math.floor(Math.random() * copia.length);
      escolhidas.push(copia.splice(i, 1)[0]);
    }
    return escolhidas.map((rel) => carregarImagem(rel, ladoMax));
  }

  /* Densidade de tela com teto: em monitores 4K/Retina o dpr 2 fazia o
     canvas ter 2560 px de largura e o jogo ficava pesado sem ganho visível.
     Aqui o dpr vai no máximo até 1.5 e a largura real até 1600 px. */
  function escalaTela(larguraLogica) {
    const dpr = limitar(window.devicePixelRatio || 1, 1, 1.5);
    return Math.max(1, Math.min(dpr, 1600 / Math.max(1, larguraLogica)));
  }

  /** Cria um jogo completo ligado a um canvas e ao HUD da página. */
  FGA.criarJogo = function criarJogo(cfg) {
    const canvas = typeof cfg.canvas === "string" ? $(cfg.canvas) : cfg.canvas;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    const L = cfg.largura || 1280;
    const A = cfg.altura || 800;
    const palco = canvas.closest(".palco-jogo") || canvas.parentElement;
    const sobreposicao = $(".sobreposicao", palco);
    const contagemEl = $(".contagem", palco);
    const areaPontos = $(".pontos-flutuantes", palco);

    const jogo = {
      nome: cfg.nome || "jogo",
      largura: L,
      altura: A,
      ctx,
      canvas,
      estado: "parado", // parado | contagem | jogando | pausado | fim
      pontos: 0,
      recorde: FGA.recorde.ler(cfg.nome || "jogo"),
      tempo: 0,
      duracao: cfg.duracao || 0, // 0 = sem limite
      nivel: 1,
      entradas: Object.create(null),
      ponteiro: { x: L / 2, y: A / 2, ativo: false, xAntes: L / 2 },
      _ultimo: 0,
      _rAF: null,
      _fim: false,

      /* ---- HUD ---- */
      atualizarHUD() {
        $$("[data-hud]", document).forEach((el) => {
          const chave = el.dataset.hud;
          if (chave === "pontos") el.textContent = Math.round(this.pontos).toLocaleString("pt-BR");
          else if (chave === "recorde") el.textContent = Math.max(this.recorde, Math.round(this.pontos)).toLocaleString("pt-BR");
          else if (chave === "tempo") el.textContent = this.duracao ? Math.max(0, Math.ceil(this.duracao - this.tempo)) + "s" : Math.floor(this.tempo) + "s";
          else if (chave === "nivel") el.textContent = String(this.nivel);
          else if (chave === "barra") {
            const p = this.duracao ? limitar(1 - this.tempo / this.duracao, 0, 1) : 1;
            el.style.width = (p * 100).toFixed(1) + "%";
            const barra = el.parentElement;
            if (barra) barra.classList.toggle("hud__barra--aviso", this.duracao > 0 && p < 0.28);
          }
        });
      },

      /* ---- pontuação ---- */
      somar(valor = 1) {
        this.pontos += valor;
        this.atualizarHUD();
      },
      pontoFlutuante(x, y, texto, ouro = false) {
        if (!areaPontos) return;
        const el = document.createElement("span");
        el.className = "ponto-flutuante" + (ouro ? " ponto-flutuante--ouro" : "");
        el.textContent = texto;
        el.style.left = (x / L) * 100 + "%";
        el.style.top = (y / A) * 100 + "%";
        areaPontos.append(el);
        setTimeout(() => el.remove(), 950);
      },
      som(nome) {
        FGA.audio && FGA.audio.sfx(nome);
      },

      /* ---- sobreposição ---- */
      mostrarSobreposicao({ titulo, icone, texto, dicas = [], acoes = [], html = "" }) {
        if (!sobreposicao) return;
        sobreposicao.innerHTML = "";
        const caixa = criar("div", { classe: "sobreposicao__caixa" });
        if (titulo) {
          const h = criar("h2", { classe: icone ? "icone-titulo" : "" });
          if (icone && FGA.icones) h.append(FGA.icones.el(icone));
          h.append(criar("span", { html: titulo }));
          caixa.append(h);
        }
        if (texto) caixa.append(criar("p", { html: texto }));
        if (dicas.length) {
          const ul = criar("ul", { classe: "sobreposicao__dicas" });
          dicas.forEach((d) => ul.append(criar("li", { html: d })));
          caixa.append(ul);
        }
        if (html) caixa.insertAdjacentHTML("beforeend", html);
        const acoesEl = criar("div", { classe: "sobreposicao__acoes" });
        acoes.forEach((a) => {
          const b = criar("button", {
            classe: "botao " + (a.classe || ""),
            type: "button",
          });
          if (a.icone && FGA.icones) b.append(FGA.icones.el(a.icone, { classe: "ico--botao" }));
          b.append(criar("span", { texto: a.texto }));
          b.addEventListener("click", () => {
            FGA.audio && FGA.audio.desbloquear();
            a.aoClicar();
          });
          acoesEl.append(b);
        });
        if (acoes.length) caixa.append(acoesEl);
        sobreposicao.append(caixa);
        sobreposicao.hidden = false;
        trazerParaTela(caixa, 170);
      },
      esconderSobreposicao() {
        if (sobreposicao) sobreposicao.hidden = true;
      },

      /* ---- contagem regressiva 3·2·1 ---- */
      contagemRegressiva(aoClicar) {
        const passos = ["3", "2", "1", "VAI!"];
        let i = 0;
        this.estado = "contagem";
        if (!contagemEl) {
          aoClicar();
          return;
        }
        contagemEl.hidden = false;
        contagemEl.classList.remove("escondido-visual");
        const passo = () => {
          contagemEl.innerHTML = "";
          contagemEl.append(criar("span", { texto: passos[i] }));
          this.som(i === 3 ? "estrela" : "clique");
          i += 1;
          if (i < passos.length) setTimeout(passo, 620);
          else
            setTimeout(() => {
              contagemEl.hidden = true;
              contagemEl.innerHTML = "";
              aoClicar();
            }, 480);
        };
        passo();
      },

      /* ---- ciclo de vida ---- */
      preparar(pontosIniciais = 0) {
        this.pontos = pontosIniciais;
        this.tempo = 0;
        this.nivel = 1;
        this._fim = false;
        this.atualizarHUD();
      },
      comecar() {
        this.esconderSobreposicao();
        trazerParaTela(palco);
        this.preparar();
        if (cfg.iniciar) cfg.iniciar(this);
        this.contagemRegressiva(() => {
          this.estado = "jogando";
          this._ultimo = performance.now();
          this._rodar();
        });
      },
      pausar() {
        if (this.estado !== "jogando") return;
        this.estado = "pausado";
        this.mostrarSobreposicao({
          icone: "aviso",
          titulo: "Pausa",
          texto: "O céu continua ali. Respire e volte quando quiser.",
          acoes: [
            { texto: "Continuar", icone: "get_started", classe: "", aoClicar: () => this.continuar() },
            { texto: "Recomeçar", icone: "jogos", classe: "botao--fantasma", aoClicar: () => this.comecar() },
          ],
        });
      },
      continuar() {
        if (this.estado !== "pausado") return;
        this.esconderSobreposicao();
        this.estado = "jogando";
        this._ultimo = performance.now();
        this._rodar();
      },
      terminar(motivo = "") {
        if (this._fim) return;
        this._fim = true;
        this.estado = "fim";
        if (this._rAF) cancelAnimationFrame(this._rAF);
        const novo = FGA.recorde.gravar(this.nome, Math.round(this.pontos));
        const recorde = FGA.recorde.ler(this.nome);
        if (novo) this.som("estrela");
        else this.som("aviso");
        this.atualizarHUD();
        const temNome = FGA.recorde.tabela(this.nome).length >= 5;
        this.mostrarSobreposicao({
          icone: novo ? "sucesso" : "aviso",
          titulo: novo ? "Novo recorde!" : "Fim de jogo",
          texto: `${motivo || "Você terminou a rodada."}<br><strong>Pontuação: ${Math.round(this.pontos).toLocaleString("pt-BR")}</strong> · Recorde: ${recorde.toLocaleString("pt-BR")}`,
          html: this._htmlRecordes(),
          acoes: [
            { texto: "Jogar de novo", icone: "jogos", classe: "botao--verde", aoClicar: () => this.comecar() },
            { texto: "Outros jogos", icone: "jogos", classe: "botao--fantasma", aoClicar: () => (window.location.href = "jogos.html") },
          ],
        });
        if (cfg.aoTerminar) cfg.aoTerminar(this, novo, temNome);
        document.dispatchEvent(new CustomEvent("fga:fimJogo", { detail: { jogo: this.nome, pontos: this.pontos, novo } }));
      },
      _htmlRecordes() {
        const t = FGA.recorde.tabela(this.nome);
        if (!t.length) return "";
        const ul = criar("ul", { classe: "recordes" });
        t.forEach((r) =>
          ul.append(
            criar("li", {}, [
              criar("span", { texto: r.nome }),
              criar("span", { classe: "recordes__pontos", texto: Math.round(r.pontos).toLocaleString("pt-BR") }),
            ])
          )
        );
        const env = criar("div", {});
        env.append(criar("p", { classe: "dica-uso", texto: "Melhores rodadas neste navegador:" }), ul);
        const tmp = document.createElement("div");
        tmp.append(env);
        return tmp.innerHTML;
      },
      reiniciarTudo() {
        FGA.recorde.registrar(this.nome, "Você", Math.round(this.pontos));
        this.comecar();
      },

      guardarRecorde(nome = "Você") {
        FGA.recorde.registrar(this.nome, nome, Math.round(this.pontos));
      },

      _rodar() {
        const laço = (t) => {
          if (this.estado !== "jogando") return;
          const dt = Math.min(0.05, (t - this._ultimo) / 1000 || 0);
          this._ultimo = t;
          this.tempo += dt;
          if (this.duracao && this.tempo >= this.duracao) {
            this.terminar("Tempo esgotado!");
            return;
          }
          if (cfg.atualizar) cfg.atualizar(this, dt);
          if (edicao) edicao(this, dt);
          ctx.clearRect(0, 0, L, A);
          if (cfg.desenhar) cfg.desenhar(this, ctx);
          this.atualizarHUD();
          this._rAF = requestAnimationFrame(laço);
        };
        this._rAF = requestAnimationFrame(laço);
      },

      /* ---- utilidades de desenho ---- */
      bolha(ctx, x, y, r, alfa = 0.85, matiz = 195) {
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
        g.addColorStop(0, `hsla(${matiz}, 100%, 100%, ${alfa})`);
        g.addColorStop(0.42, `hsla(${matiz}, 92%, 84%, ${alfa * 0.5})`);
        g.addColorStop(0.85, `hsla(${matiz}, 88%, 66%, ${alfa * 0.28})`);
        g.addColorStop(1, `hsla(${matiz}, 80%, 60%, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - r * 0.32, y - r * 0.36, Math.max(1, r * 0.18), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${limitar(alfa + 0.15, 0, 1)})`;
        ctx.fill();
      },
      texto(ctx, txt, x, y, { tamanho = 34, cor = "#fff", alinhamento = "center", fonte = "bold" } = {}) {
        ctx.save();
        ctx.font = `${fonte} ${tamanho}px "Segoe UI", Trebuchet MS, sans-serif`;
        ctx.textAlign = alinhamento;
        ctx.textBaseline = "middle";
        ctx.lineWidth = Math.max(3, tamanho * 0.16);
        ctx.strokeStyle = "rgba(10,50,95,0.5)";
        ctx.strokeText(txt, x, y);
        ctx.fillStyle = cor;
        ctx.fillText(txt, x, y);
        ctx.restore();
      },

      /* ---- entradas ---- */
      tecla(...teclas) {
        return teclas.some((t) => this.entradas[t]);
      },
    };

    /* ---- ajuste de densidade de tela ---- */
    function medir() {
      const dpr = escalaTela(L);
      canvas.width = Math.floor(L * dpr);
      canvas.height = Math.floor(A * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (cfg.desenharFundo) cfg.desenharFundo(jogo, ctx);
    }

    /* ---- laço de edição (também roda pausado, para animar o fundo) ---- */
    let edicao = null;
    if (cfg.edicao) {
      edicao = cfg.edicao;
      const laçoEdicao = (t) => {
        if (jogo.estado === "jogando") {
          requestAnimationFrame(laçoEdicao);
          return;
        }
        const dt = 0.016;
        edicao(jogo, dt);
        ctx.clearRect(0, 0, L, A);
        if (cfg.desenhar) cfg.desenhar(jogo, ctx);
        requestAnimationFrame(laçoEdicao);
        void t;
      };
      requestAnimationFrame(laçoEdicao);
    }

    /* ---- teclado ---- */
    const teclasUsadas = cfg.teclas || [];
    window.addEventListener("keydown", (e) => {
      const tecla = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (teclasUsadas.length && teclasUsadas.includes(e.key)) e.preventDefault();
      jogo.entradas[tecla] = true;
      if (e.key === " " || e.key === "Enter") {
        if (document.activeElement === document.body && (jogo.estado === "parado" || jogo.estado === "fim")) {
          e.preventDefault();
          jogo.comecar();
        }
      }
      if (e.key === "p" || e.key === "P") {
        if (jogo.estado === "jogando") jogo.pausar();
        else if (jogo.estado === "pausado") jogo.continuar();
      }
      if (cfg.aoTeclar) cfg.aoTeclar(jogo, e);
    });
    window.addEventListener("keyup", (e) => {
      const tecla = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      jogo.entradas[tecla] = false;
    });

    /* ---- ponteiro / toque ---- */
    const paraCanvas = (e) => {
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return {
        x: ((p.clientX - r.left) / r.width) * L,
        y: ((p.clientY - r.top) / r.height) * A,
      };
    };
    const aoMover = (e) => {
      const p = paraCanvas(e);
      jogo.ponteiro.xAntes = jogo.ponteiro.x;
      jogo.ponteiro.x = p.x;
      jogo.ponteiro.y = p.y;
    };
    canvas.addEventListener("pointermove", aoMover, { passive: true });
    canvas.addEventListener("pointerdown", (e) => {
      FGA.audio && FGA.audio.desbloquear();
      jogo.ponteiro.ativo = true;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      const p = paraCanvas(e);
      jogo.ponteiro.x = p.x;
      jogo.ponteiro.y = p.y;
      if (cfg.aoClicar) cfg.aoClicar(jogo, p.x, p.y, e);
    });
    canvas.addEventListener("pointerup", () => {
      jogo.ponteiro.ativo = false;
    });
    canvas.addEventListener("touchstart", (e) => {
      if (cfg.evitarRolagem !== false) e.preventDefault();
      const p = paraCanvas(e);
      jogo.ponteiro.x = p.x;
      jogo.ponteiro.y = p.y;
      jogo.ponteiro.ativo = true;
      if (cfg.aoClicar) cfg.aoClicar(jogo, p.x, p.y, e);
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      if (cfg.evitarRolagem !== false) e.preventDefault();
      aoMover(e);
    }, { passive: false });

    /* ---- botões de toque declarados na página ---- */
    $$("[data-controle]").forEach((b) => {
      const chave = b.dataset.controle;
      const ligar = (v) => {
        jogo.entradas[chave] = v;
      };
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        ligar(true);
      });
      b.addEventListener("pointerup", () => ligar(false));
      b.addEventListener("pointerleave", () => ligar(false));
      b.addEventListener("pointercancel", () => ligar(false));
    });

    /* ---- pausa automática quando o canvas sai da tela ---- */
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((en) => {
            if (!en.isIntersecting && jogo.estado === "jogando") jogo.pausar();
          });
        },
        { threshold: 0.05 }
      );
      obs.observe(canvas);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && jogo.estado === "jogando") jogo.pausar();
    });

    medir();
    window.addEventListener("resize", medir, { passive: true });
    jogo.atualizarHUD();

    /* ---- tela inicial ---- */
    jogo.mostrarSobreposicao({
      icone: cfg.icone || "jogos",
      titulo: cfg.tituloTela || "Pronto para jogar?",
      texto: cfg.textoTela || cfg.descricao || "",
      dicas: cfg.dicas || [],
      acoes: [
        { texto: "Começar", icone: "get_started", classe: "botao--verde", aoClicar: () => jogo.comecar() },
        { texto: "Outros jogos", icone: "jogos", classe: "botao--fantasma", aoClicar: () => (window.location.href = "jogos.html") },
      ],
    });

    const botaoPausa = $("#botaoPausa");
    if (botaoPausa) {
      botaoPausa.addEventListener("click", () => {
        if (jogo.estado === "jogando") jogo.pausar();
        else if (jogo.estado === "pausado") jogo.continuar();
        else jogo.comecar();
      });
    }
    const botaoReiniciar = $("#botaoReiniciar");
    if (botaoReiniciar) botaoReiniciar.addEventListener("click", () => jogo.comecar());
    const botaoRecorde = $("#botaoRecorde");
    if (botaoRecorde)
      botaoRecorde.addEventListener("click", () => {
        jogo.guardarRecorde();
        FGA.toast("Registro salvo", "Sua pontuação entrou no ranking deste navegador.", "bom");
      });

    return jogo;
  };

  /* ---------- utilidades usadas pelos jogos ---------- */
  /* ---------- Utilidades compartilhadas ---------- */
  /* Traz um elemento para o meio da tela quando ele não está inteiro na área
     visível: sem isso, telas de jogo altas ficavam com os botões atrás do dock
     fixo (ou abaixo da dobra), o que atrapalhava o clique no celular. */
  function trazerParaTela(el, folga = 150) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cabeInteiro = r.top >= 0 && r.bottom <= window.innerHeight - 8;
    if (cabeInteiro) return;
    const alvo = r.height > window.innerHeight - folga ? r.top + window.scrollY - 90 : null;
    if (alvo === null) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
      window.scrollTo({ top: Math.max(0, alvo), behavior: "smooth" });
    }
  }

  FGA.jogoUtil = {
    carregarImagens,
    carregarImagem,
    criarMini,
    pronta,
    fonte,
    escalaTela,
    inteiro,
    escolher,
    aleatorio,
    limitar,
    trazerParaTela,
  };
})();
