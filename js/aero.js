/* ==========================================================================
   FGAero Land 2000 — aero.js
   Núcleo do site: utilitários, armazenamento seguro, áudio (efeitos + trilha
   sintetizada), álbum do YouTube, acervo de imagens, cenários de céu, bolhas
   de fundo, navegação, animações de entrada, toasts, dock, janelas flutuantes
   e o AeroBot (chat). Requer js/acervo.js, js/conteudo.js e js/icones.js.
   ========================================================================== */
(function () {
  "use strict";

  const FGA = (window.FGA = window.FGA || {});

  /* ---------- 1. Utilitários ---------- */
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

  const aleatorio = (min, max) => Math.random() * (max - min) + min;
  const inteiro = (min, max) => Math.floor(aleatorio(min, max + 1));
  const escolher = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
  const embaralhar = (lista) => {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };
  const normalizar = (texto) =>
    String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s?!]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  function criar(tag, props = {}, filhos = []) {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === "classe") el.className = v;
      else if (k === "texto") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) el.setAttribute(k, v);
    });
    (Array.isArray(filhos) ? filhos : [filhos]).forEach((f) => {
      if (f) el.append(f);
    });
    return el;
  }

  FGA.util = { $, $$, aleatorio, inteiro, escolher, limitar, embaralhar, normalizar, criar };

  /* ---------- 2. Armazenamento seguro (o preview roda em iframe restrito) ---------- */
  const memoria = {};
  const armazem = {
    ler(chave, padrao = null) {
      try {
        const v = window.localStorage.getItem("fga:" + chave);
        return v === null ? (chave in memoria ? memoria[chave] : padrao) : JSON.parse(v);
      } catch (e) {
        return chave in memoria ? memoria[chave] : padrao;
      }
    },
    gravar(chave, valor) {
      memoria[chave] = valor;
      try {
        window.localStorage.setItem("fga:" + chave, JSON.stringify(valor));
      } catch (e) {
        /* modo restrito: segue apenas em memória */
      }
    },
    limpar(chave) {
      delete memoria[chave];
      try {
        window.localStorage.removeItem("fga:" + chave);
      } catch (e) {}
    },
  };
  FGA.armazem = armazem;
  FGA.recorde = {
    ler: (jogo) => Number(armazem.ler("recorde:" + jogo, 0)) || 0,
    gravar(jogo, pontos) {
      const atual = FGA.recorde.ler(jogo);
      if (pontos > atual) {
        armazem.gravar("recorde:" + jogo, pontos);
        return true;
      }
      return false;
    },
    tabela: (jogo) => armazem.ler("tabela:" + jogo, []),
    registrar(jogo, nome, pontos) {
      const t = FGA.recorde.tabela(jogo);
      t.push({ nome: nome || "Visitante", pontos, quando: Date.now() });
      t.sort((a, b) => b.pontos - a.pontos);
      armazem.gravar("tabela:" + jogo, t.slice(0, 5));
      FGA.recorde.gravar(jogo, pontos);
    },
  };

  /* ---------- 3. Áudio: efeitos e trilha sintetizada ---------- */
  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  /* nomes em português -> valores válidos de OscillatorType.
     (as faixas usavam "seno"/"triangulo"/"quadrada" direto, o que fazia o
     navegador reclamar no console e cair no tipo padrão) */
  const TIPOS_OSC = {
    seno: "sine",
    sine: "sine",
    triangulo: "triangle",
    triangle: "triangle",
    quadrada: "square",
    square: "square",
    dente: "sawtooth",
    sawtooth: "sawtooth",
  };

  const faixas = [
    {
      id: "ceu2006",
      nome: "Céu de 2006",
      descricao: "pad de vidro + arpejo suave",
      bpm: 92,
      raiz: 57,
      escala: [0, 2, 4, 7, 9, 12, 14, 16],
      arpejo: "seno",
      brilho: 0.6,
    },
    {
      id: "aquario",
      nome: "Aquário MIDI",
      descricao: "peixes, bolhas e sinte brilhante",
      bpm: 112,
      raiz: 60,
      escala: [0, 3, 5, 7, 10, 12, 15, 17],
      arpejo: "triangulo",
      brilho: 0.85,
    },
    {
      id: "neoAero",
      nome: "Neo-Aero 2022",
      descricao: "shimmer nostálgico em modo dórico",
      bpm: 100,
      raiz: 50,
      escala: [0, 2, 3, 5, 7, 9, 10, 12],
      arpejo: "quadrada",
      brilho: 0.7,
    },
  ];

  const audio = {
    ctx: null,
    mestre: null,
    ganhoMusica: null,
    ganhoSfx: null,
    ligado: false,
    tocaMusica: false,
    faixaAtual: 0,
    volume: 0.6,
    _passo: 0,
    _proximo: 0,
    _timer: null,
    aoMudar: null,

    desbloquear() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
          this.ctx = new AC();
        } catch (e) {
          return null;
        }
        this.mestre = this.ctx.createGain();
        this.mestre.gain.value = 0.9 * this.volume;
        this.mestre.connect(this.ctx.destination);

        this.ganhoMusica = this.ctx.createGain();
        this.ganhoMusica.gain.value = 0;
        const filtro = this.ctx.createBiquadFilter();
        filtro.type = "lowpass";
        filtro.frequency.value = 5200;
        this.ganhoMusica.connect(filtro).connect(this.mestre);

        this.ganhoSfx = this.ctx.createGain();
        this.ganhoSfx.gain.value = 0.85;
        this.ganhoSfx.connect(this.mestre);
        this._filtroMusica = filtro;
      }
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      this.ligado = true;
      return this.ctx;
    },

    definirVolume(v) {
      this.volume = limitar(v, 0, 1);
      if (this.mestre) this.mestre.gain.value = 0.9 * this.volume;
      armazem.gravar("volume", this.volume);
    },

    /* --- efeitos pontuais --- */
    tom({ f = 660, dur = 0.14, tipo = "sine", vol = 0.22, atraso = 0, desliza = null }) {
      if (!this.ligado || !this.ctx) return;
      const t0 = this.ctx.currentTime + atraso;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = TIPOS_OSC[tipo] || tipo;
      osc.frequency.setValueAtTime(f, t0);
      if (desliza) osc.frequency.exponentialRampToValueAtTime(Math.max(40, desliza), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.ganhoSfx);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },

    ruido({ dur = 0.22, vol = 0.18, corte = 1400, atraso = 0 }) {
      if (!this.ligado || !this.ctx) return;
      const t0 = this.ctx.currentTime + atraso;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const dados = buffer.getChannelData(0);
      for (let i = 0; i < n; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const fonte = this.ctx.createBufferSource();
      fonte.buffer = buffer;
      const filtro = this.ctx.createBiquadFilter();
      filtro.type = "bandpass";
      filtro.frequency.value = corte;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      fonte.connect(filtro).connect(g).connect(this.ganhoSfx);
      fonte.start(t0);
    },

    sfx(nome) {
      if (!this.ligado) return;
      switch (nome) {
        case "clique":
          this.tom({ f: 880, dur: 0.09, tipo: "sine", vol: 0.16 });
          this.tom({ f: 1320, dur: 0.07, tipo: "sine", vol: 0.1, atraso: 0.05 });
          break;
        case "vidro":
          this.tom({ f: 1180, dur: 0.5, tipo: "sine", vol: 0.14 });
          this.tom({ f: 1760, dur: 0.42, tipo: "sine", vol: 0.08, atraso: 0.05 });
          break;
        case "bolha":
          this.tom({ f: aleatorio(520, 900), dur: 0.12, tipo: "sine", vol: 0.2, desliza: aleatorio(240, 420) });
          break;
        case "acerto":
          [0, 4, 7, 12].forEach((s, i) =>
            this.tom({ f: freq(72 + s), dur: 0.2, tipo: "triangle", vol: 0.16, atraso: i * 0.06 })
          );
          break;
        case "erro":
          this.tom({ f: 220, dur: 0.22, tipo: "square", vol: 0.12, desliza: 140 });
          this.tom({ f: 165, dur: 0.26, tipo: "square", vol: 0.1, atraso: 0.12 });
          break;
        case "respingo":
          this.ruido({ dur: 0.3, vol: 0.16, corte: 2200 });
          this.tom({ f: 480, dur: 0.16, tipo: "sine", vol: 0.12, desliza: 900 });
          break;
        case "estrela":
          [0, 7, 12, 19].forEach((s, i) =>
            this.tom({ f: freq(76 + s), dur: 0.3, tipo: "sine", vol: 0.13, atraso: i * 0.075 })
          );
          break;
        case "aviso":
          this.tom({ f: 520, dur: 0.16, tipo: "triangle", vol: 0.14 });
          this.tom({ f: 390, dur: 0.2, tipo: "triangle", vol: 0.12, atraso: 0.14 });
          break;
        case "mensagem":
          this.tom({ f: 990, dur: 0.1, tipo: "sine", vol: 0.14 });
          this.tom({ f: 1480, dur: 0.12, tipo: "sine", vol: 0.11, atraso: 0.08 });
          break;
        default:
          this.tom({ f: 740, dur: 0.1, vol: 0.14 });
      }
    },

    /* --- trilha sintetizada em tempo real --- */
    tocar(indice) {
      this.desbloquear();
      if (!this.ctx) return;
      this.faixaAtual = ((indice % faixas.length) + faixas.length) % faixas.length;
      this.tocaMusica = true;
      this._passo = 0;
      this._proximo = this.ctx.currentTime + 0.08;
      this.ganhoMusica.gain.cancelScheduledValues(this.ctx.currentTime);
      this.ganhoMusica.gain.setTargetAtTime(0.34, this.ctx.currentTime, 0.6);
      if (!this._timer) this._timer = setInterval(() => this._agendar(), 60);
      armazem.gravar("faixa", this.faixaAtual);
      armazem.gravar("musicaLigada", true);
      if (typeof this.aoMudar === "function") this.aoMudar();
    },

    pausar() {
      this.tocaMusica = false;
      if (this.ganhoMusica && this.ctx) {
        this.ganhoMusica.gain.cancelScheduledValues(this.ctx.currentTime);
        this.ganhoMusica.gain.setTargetAtTime(0, this.ctx.currentTime, 0.35);
      }
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
      armazem.gravar("musicaLigada", false);
      if (typeof this.aoMudar === "function") this.aoMudar();
    },

    alternar(indice) {
      if (this.tocaMusica && indice === undefined) this.pausar();
      else this.tocar(indice === undefined ? this.faixaAtual : indice);
    },

    _agendar() {
      if (!this.tocaMusica || !this.ctx) return;
      const faixa = faixas[this.faixaAtual];
      const duracaoPasso = 60 / faixa.bpm / 2; // colcheias
      while (this._proximo < this.ctx.currentTime + 0.35) {
        this._tocarPasso(faixa, this._passo, this._proximo, duracaoPasso);
        this._passo = (this._passo + 1) % 32;
        this._proximo += duracaoPasso;
      }
    },

    _tocarPasso(faixa, passo, t, d) {
      const ctx = this.ctx;
      const escala = faixa.escala;
      const grau = (i) => freq(faixa.raiz + 12 + escala[((i % escala.length) + escala.length) % escala.length]);

      // baixo do compasso
      if (passo % 8 === 0) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        const base = freq(faixa.raiz + (passo % 16 === 0 ? 0 : 5));
        osc.frequency.value = base;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d * 5.5);
        osc.connect(g).connect(this.ganhoMusica);
        osc.start(t);
        osc.stop(t + d * 6);
      }

      // acorde/pad a cada dois compassos
      if (passo % 16 === 0) {
        const acorde = [0, 4, 7, 11].map((s, i) => freq(faixa.raiz + 12 + s + (i === 3 ? 5 : 0)));
        acorde.forEach((f) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.075, t + 0.9);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d * 14);
          osc.connect(g).connect(this.ganhoMusica);
          osc.start(t);
          osc.stop(t + d * 15);
        });
      }

      // arpejo
      const padraoArpejo = [0, 2, 4, 6, 4, 2, 5, 3];
      if (passo % 2 === 1 || Math.random() < 0.25) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = TIPOS_OSC[faixa.arpejo] || "sine";
        osc.frequency.value = grau(padraoArpejo[Math.floor(passo / 2) % padraoArpejo.length] + (Math.random() < 0.2 ? 7 : 0));
        const vol = 0.075 * faixa.brilho;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d * 1.6);
        osc.connect(g).connect(this.ganhoMusica);
        osc.start(t);
        osc.stop(t + d * 2);
      }

      // varredura de ruído (efeito "respirar do céu")
      if (passo % 32 === 24) {
        const n = Math.floor(ctx.sampleRate * 1.2);
        const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
        const dados = buffer.getChannelData(0);
        for (let i = 0; i < n; i++) dados[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.6);
        const fonte = ctx.createBufferSource();
        fonte.buffer = buffer;
        const filtro = ctx.createBiquadFilter();
        filtro.type = "bandpass";
        filtro.frequency.value = 3200;
        filtro.Q.value = 0.8;
        const g = ctx.createGain();
        g.gain.value = 0.05;
        fonte.connect(filtro).connect(g).connect(this.ganhoMusica);
        fonte.start(t);
      }
    },

    get faixas() {
      return faixas;
    },
    get faixa() {
      return faixas[this.faixaAtual];
    },
  };
  FGA.audio = audio;

  /* ---------- 4. Acervo de imagens ---------- */
  const repo = (FGA.repo && FGA.repo.raw) || "";
  const acervo = FGA.acervo || {};
  const localSet = new Set();
  Object.values(acervo).forEach((lista) => lista.forEach((p) => localSet.add(p)));

  const baseURL = document.baseURI || window.location.href;

  const imagens = {
    /* Devolve SEMPRE uma URL absoluta: o Chromium resolve url() de custom
       properties em relação à FOLHA DE ESTILO, o que transformava
       "imagens/..." em "css/imagens/..." e gerava 404 no fundo do céu. */
    url(rel) {
      if (!rel) return "";
      if (/^(https?:)?\/\//i.test(rel)) return rel;
      return localSet.has(rel) ? new URL(rel, baseURL).href : repo + rel;
    },
    lista(cat) {
      return (acervo[cat] || []).slice();
    },
    todas() {
      const saida = [];
      (FGA.categorias || []).forEach((c) => {
        (acervo[c.id] || []).forEach((p) => saida.push({ src: p, categoria: c.id, rotulo: c.rotulo }));
      });
      return saida;
    },
    /* escolhe uma imagem da categoria de forma determinística */
    sprite(cat, semente = 0) {
      const lista = imagens.lista(cat);
      if (!lista.length) return null;
      return lista[Math.abs(Math.floor(semente)) % lista.length];
    },
    nome(rel) {
      const arquivo = rel.split("/").pop().replace(/\.(png|jpe?g|webp)$/i, "");
      const partes = arquivo.split("_");
      const cat = partes[0];
      const num = partes.slice(1).join("_");
      const meta = (FGA.categorias || []).find((c) => c.id === cat);
      return `${meta ? meta.rotulo : cat} #${num}`;
    },
    /* cria <img> com fallback: local -> repositório -> oculto */
    tag(rel, { classe = "", alt = "", lazy = true, deco = false } = {}) {
      const img = document.createElement("img");
      img.className = classe;
      img.alt = alt || "";
      if (deco) img.setAttribute("aria-hidden", "true");
      if (lazy) img.loading = "lazy";
      img.decoding = "async";
      const tentativas = [rel, repo + rel];
      let i = 0;
      img.addEventListener("error", () => {
        i += 1;
        if (i < tentativas.length) img.src = tentativas[i];
        else {
          img.style.visibility = "hidden";
          img.dataset.falhou = "1";
        }
      });
      img.src = tentativas[0];
      return img;
    },
  };
  FGA.imagem = imagens;

  /* ---------- 5. Cenário de céu ---------- */
  const paletas = [
    { ceu: ["#6fc0ff", "#b8e6ff", "#eaf9ff"], nome: "Manhã de 2006" },
    { ceu: ["#4fa8e8", "#a9dcff", "#ddf3ff"], nome: "Azul Vista" },
    { ceu: ["#79c8f0", "#c8ecff", "#f2fbff"], nome: "Céu de Asadal" },
    { ceu: ["#5fb6ea", "#aee0ff", "#def6ff"], nome: "Aqua Glass" },
    { ceu: ["#8ed0f5", "#d5efff", "#ffffff"], nome: "Neo-Aero" },
  ];

  const cenario = {
    indice: 0,
    trocar(passo = 1) {
      const lista = imagens.lista("skyboxes");
      if (!lista.length) return;
      this.indice = (this.indice + passo + lista.length) % lista.length;
      this.aplicar(this.indice);
      return lista[this.indice];
    },
    aplicar(i, avisar = true) {
      const lista = imagens.lista("skyboxes");
      if (!lista.length) return;
      const idx = ((i % lista.length) + lista.length) % lista.length;
      this.indice = idx;
      const rel = lista[idx];
      const pal = paletas[idx % paletas.length];
      const raiz = document.documentElement;
      raiz.style.setProperty("--ceu-imagem", `url("${imagens.url(rel)}")`);
      raiz.style.setProperty("--ceu-1", pal.ceu[0]);
      raiz.style.setProperty("--ceu-2", pal.ceu[1]);
      raiz.style.setProperty("--ceu-3", pal.ceu[2]);
      armazem.gravar("ceu", idx);
      if (avisar) {
        FGA.toast("Cenário trocado", `${pal.nome} · ${rel.split("/").pop()}`, "bom");
        audio.sfx("vidro");
      }
      document.dispatchEvent(new CustomEvent("fga:ceu", { detail: { indice: idx, imagem: rel } }));
      return rel;
    },
    iniciar() {
      const lista = imagens.lista("skyboxes");
      if (!lista.length) return;
      const salvo = armazem.ler("ceu", null);
      const inicial = salvo === null ? inteiro(0, lista.length - 1) : salvo;
      const teste = new Image();
      teste.src = imagens.url(lista[((inicial % lista.length) + lista.length) % lista.length]);
      this.aplicar(inicial, false);
    },
  };
  FGA.cenario = cenario;

  /* ---------- 6. Bolhas de fundo (canvas) ---------- */
  function bolhasDeFundo(canvas) {
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext("2d");
    let largura = 0;
    let altura = 0;
    let dpr = 1;
    let bolhas = [];
    let rodando = true;
    let ultimo = performance.now();

    function criarBolha(espalhar) {
      const raio = aleatorio(6, 30);
      return {
        x: aleatorio(0, largura),
        y: espalhar ? aleatorio(0, altura) : altura + raio * 2,
        raio,
        vel: aleatorio(0.18, 0.65) * (raio / 18),
        balanco: aleatorio(0.4, 1.4),
        fase: aleatorio(0, Math.PI * 2),
        alfa: aleatorio(0.28, 0.72),
      };
    }

    function medir() {
      dpr = limitar(window.devicePixelRatio || 1, 1, 2);
      largura = window.innerWidth;
      altura = window.innerHeight;
      canvas.width = Math.floor(largura * dpr);
      canvas.height = Math.floor(altura * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const alvo = limitar(Math.round((largura * altura) / 46000), 10, 46);
      bolhas = Array.from({ length: alvo }, () => criarBolha(true));
    }

    function desenhar(t) {
      const dt = Math.min(48, t - ultimo) / 16.6667;
      ultimo = t;
      ctx.clearRect(0, 0, largura, altura);
      bolhas.forEach((b) => {
        b.y -= b.vel * dt;
        b.fase += 0.014 * dt * b.balanco;
        const x = b.x + Math.sin(b.fase) * 16;
        if (b.y + b.raio < -10) Object.assign(b, criarBolha(false));
        const g = ctx.createRadialGradient(x - b.raio * 0.35, b.y - b.raio * 0.4, b.raio * 0.1, x, b.y, b.raio);
        g.addColorStop(0, `rgba(255,255,255,${b.alfa})`);
        g.addColorStop(0.45, `rgba(200,240,255,${b.alfa * 0.5})`);
        g.addColorStop(0.82, `rgba(140,210,255,${b.alfa * 0.32})`);
        g.addColorStop(1, "rgba(255,255,255,0.02)");
        ctx.beginPath();
        ctx.arc(x, b.y, b.raio, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - b.raio * 0.3, b.y - b.raio * 0.34, Math.max(1, b.raio * 0.2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${limitar(b.alfa + 0.2, 0, 1)})`;
        ctx.fill();
      });
    }

    function laço(t) {
      if (!rodando) return;
      const calmo = document.body.classList.contains("calmo");
      if (!document.hidden && !calmo) desenhar(t);
      else ultimo = t;
      requestAnimationFrame(laço);
    }

    medir();
    window.addEventListener("resize", medir, { passive: true });
    requestAnimationFrame(laço);
    return {
      parar() {
        rodando = false;
      },
      get quantidade() {
        return bolhas.length;
      },
    };
  }
  FGA.bolhasDeFundo = bolhasDeFundo;

  /* ---------- 7. Toasts ---------- */
  let areaToasts = null;
  function toast(titulo, texto, tipo = "") {
    if (!document.body) return;
    if (!areaToasts) {
      areaToasts = criar("div", { classe: "toasts", role: "status", "aria-live": "polite" });
      document.body.append(areaToasts);
    }
    const chaveIcone = tipo === "bom" ? "sucesso" : tipo === "aviso" ? "aviso" : "info";
    const linhaTitulo = criar("div", { classe: "toast__titulo" });
    if (FGA.icones) linhaTitulo.append(FGA.icones.el(chaveIcone, { classe: "ico--chip" }));
    linhaTitulo.append(criar("strong", { texto: titulo }));
    const el = criar("div", { classe: "toast" + (tipo ? " toast--" + tipo : "") }, [
      linhaTitulo,
      criar("span", { texto: texto || "" }),
    ]);
    areaToasts.append(el);
    setTimeout(() => {
      el.style.transition = "opacity .4s, transform .4s";
      el.style.opacity = "0";
      el.style.transform = "translateX(24px)";
      setTimeout(() => el.remove(), 420);
    }, 3800);
    return el;
  }
  FGA.toast = toast;

  /* ---------- 8. Navegação, revelações e contadores ---------- */
  function montarNavegacao() {
    const botao = $(".menu__hamburguer");
    const menu = $("#menuPrincipal");
    if (botao && menu) {
      const alternar = (abrir) => {
        const vaiAbrir = abrir === undefined ? !menu.classList.contains("aberto") : abrir;
        menu.classList.toggle("aberto", vaiAbrir);
        botao.setAttribute("aria-expanded", String(vaiAbrir));
      };
      botao.addEventListener("click", (e) => {
        e.stopPropagation();
        alternar();
      });
      menu.addEventListener("click", (e) => {
        if (e.target.closest("a")) alternar(false);
      });
      document.addEventListener("click", (e) => {
        if (!menu.contains(e.target) && !botao.contains(e.target)) alternar(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") alternar(false);
      });
      window.addEventListener("resize", () => {
        if (window.innerWidth > 860) alternar(false);
      });
    }
    // marca a página atual
    const atual = document.body.dataset.pagina;
    $$(".menu__link").forEach((a) => {
      const alvo = (a.getAttribute("href") || "").replace(".html", "");
      if (alvo === atual) a.setAttribute("aria-current", "page");
    });
  }

  let observadorRevelacoes = null;

  /* Revela os elementos .surgir conforme entram na tela.
     Pode (e deve) ser chamada de novo depois de inserir conteúdo dinâmico. */
  function prepararRevelacoes(raiz = document) {
    const alvos = $$(".surgir", raiz).filter((el) => !el.dataset.revelado);
    if (!alvos.length) return;

    const revelar = (el) => {
      el.dataset.revelado = "1";
      el.classList.add("visivel");
    };

    if (!("IntersectionObserver" in window)) {
      alvos.forEach(revelar);
      return;
    }
    if (!observadorRevelacoes) {
      observadorRevelacoes = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((en) => {
            if (en.isIntersecting) {
              en.target.dataset.revelado = "1";
              en.target.classList.add("visivel");
              observadorRevelacoes.unobserve(en.target);
            }
          });
        },
        { rootMargin: "0px 0px -60px 0px", threshold: 0.05 }
      );
    }
    alvos.forEach((el, i) => {
      el.style.transitionDelay = Math.min(320, (i % 8) * 55) + "ms";
      observadorRevelacoes.observe(el);
    });
  }
  FGA.prepararRevelacoes = prepararRevelacoes;

  function animarContadores() {
    const alvos = $$("[data-contar]");
    if (!alvos.length) return;
    const iniciar = (el) => {
      const fim = Number(el.dataset.contar) || 0;
      const dur = 1100;
      const t0 = performance.now();
      const passo = (t) => {
        const p = limitar((t - t0) / dur, 0, 1);
        const suave = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(fim * suave).toLocaleString("pt-BR");
        if (p < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };
    if (!("IntersectionObserver" in window)) {
      alvos.forEach(iniciar);
      return;
    }
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (en.isIntersecting) {
          iniciar(en.target);
          obs.unobserve(en.target);
        }
      });
    });
    alvos.forEach((el) => obs.observe(el));
  }

  /* ---------- 9. Janelas flutuantes (estilo Vista) ---------- */
  function tornarArrastavel(janela) {
    const barra = $(".janela__barra", janela);
    if (!barra) return;
    let dx = 0;
    let dy = 0;
    let arrastando = false;

    const mover = (e) => {
      if (!arrastando) return;
      const p = e.touches ? e.touches[0] : e;
      janela.style.left = limitar(p.clientX - dx, 4, window.innerWidth - janela.offsetWidth - 4) + "px";
      janela.style.top = limitar(p.clientY - dy, 4, window.innerHeight - 46) + "px";
      janela.style.right = "auto";
      janela.style.bottom = "auto";
      e.preventDefault();
    };
    const soltar = () => {
      arrastando = false;
      janela.classList.remove("arrastando");
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("mouseup", soltar);
      window.removeEventListener("touchend", soltar);
    };
    const pegar = (e) => {
      if (e.target.closest(".janela__botoes")) return;
      const p = e.touches ? e.touches[0] : e;
      const r = janela.getBoundingClientRect();
      dx = p.clientX - r.left;
      dy = p.clientY - r.top;
      arrastando = true;
      janela.classList.add("arrastando");
      window.addEventListener("mousemove", mover, { passive: false });
      window.addEventListener("touchmove", mover, { passive: false });
      window.addEventListener("mouseup", soltar);
      window.addEventListener("touchend", soltar);
      e.preventDefault();
    };
    barra.addEventListener("mousedown", pegar);
    barra.addEventListener("touchstart", pegar, { passive: false });
  }

  function criarJanela({ id, titulo, icone, corpo }) {
    const existente = document.getElementById(id);
    if (existente) return existente;

    const iconeEl = icone
      ? String(icone).includes("/")
        ? criar("img", { classe: "janela__icone", src: icone, alt: "", "aria-hidden": "true" })
        : FGA.icones.el(icone, { classe: "janela__icone-ico" })
      : null;

    const janela = criar("section", {
      id,
      classe: "janela janela--flutuante",
      role: "dialog",
      "aria-label": titulo,
    });
    const barra = criar("header", { classe: "janela__barra" }, [
      iconeEl,
      criar("h2", { classe: "janela__titulo", texto: titulo }),
      criar("div", { classe: "janela__botoes" }, [
        criar("button", {
          classe: "janela__botao",
          type: "button",
          title: "Minimizar",
          "aria-label": "Minimizar janela",
          texto: "–",
          onclick: () => {
            janela.classList.add("minimizada");
            janela.dispatchEvent(new CustomEvent("fga:minimizar"));
          },
        }),
        criar("button", {
          classe: "janela__botao janela__botao--fechar",
          type: "button",
          title: "Fechar",
          "aria-label": "Fechar janela",
          texto: "×",
          onclick: () => {
            janela.remove();
            document.dispatchEvent(new CustomEvent("fga:fecharJanela", { detail: { id } }));
          },
        }),
      ]),
    ]);
    const conteudo = criar("div", { classe: "janela__corpo" });
    if (typeof corpo === "string") conteudo.innerHTML = corpo;
    else if (corpo) conteudo.append(corpo);
    janela.append(barra, conteudo);
    document.body.append(janela);
    tornarArrastavel(janela);
    return janela;
  }
  FGA.criarJanela = criarJanela;

  /* ---------- 10. Música: trilha do YouTube + trilha sintetizada ---------- */
  let promessaYT = null;

  function carregarAPIYouTube() {
    if (promessaYT) return promessaYT;
    promessaYT = new Promise((resolver, rejeitar) => {
      if (window.YT && window.YT.Player) return resolver(window.YT);
      if (!document.getElementById("yt-iframe-api")) {
        const s = document.createElement("script");
        s.id = "yt-iframe-api";
        s.src = "https://www.youtube.com/iframe_api";
        s.async = true;
        s.onerror = () => rejeitar(new Error("api-bloqueada"));
        document.head.append(s);
      }
      const inicio = Date.now();
      const relogio = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(relogio);
          resolver(window.YT);
        } else if (Date.now() - inicio > 10000) {
          clearInterval(relogio);
          rejeitar(new Error("tempo-esgotado"));
        }
      }, 220);
    });
    return promessaYT;
  }

  let contadorYt = 0;
  const musicaYT = {
    player: null,
    /* cada player do site (seção da página e janela do dock) tem seu próprio
       alvo com id único — antes os dois dividiam o mesmo id e só o primeiro
       funcionava. */
    alvos: [],
    alvoEmUsoId: null,
    /* o YouTube troca o alvo por um <iframe> com o MESMO id, então a
       existência do id (e não do nó antigo) é o que importa aqui */
    temAlvo() {
      return this.alvos.some((a) => !!document.getElementById(a.el.id));
    },
    alvoAtivo() {
      const vivos = this.alvos.filter((a) => document.getElementById(a.el.id));
      if (!vivos.length) return null;
      const naJanela = vivos.find((a) => {
        const no = document.getElementById(a.el.id);
        return no && no.closest(".janela--flutuante");
      });
      return naJanela || vivos[0];
    },
    estado: "parado", // parado | carregando | tocando | pausado | erro
    erroDetalhe: "",
    aoMudar: null,
    _relogio: null,

    get dados() {
      return FGA.musica || {};
    },

    /* Monta de novo o encaixe dentro do alvo (o YouTube troca esse nó por
       um <iframe>; se o embed foi destruído, precisamos de um lugar novo). */
    garantirMontagem(alvo) {
      if (!alvo || !alvo.el) return null;
      const iframe = alvo.el.querySelector("iframe");
      if (iframe) return null;
      let casa = alvo.el.querySelector(".yt__montagem");
      if (!casa) {
        casa = criar("div", { classe: "yt__montagem" });
        alvo.el.append(casa);
      }
      return casa;
    },

    async tocar(alvoPedido) {
      const dados = this.dados;
      if (!dados.videoId) return;
      audio.pausar(); // nunca as duas trilhas ao mesmo tempo

      const alvo = alvoPedido || this.alvoAtivo();
      if (!alvo) {
        this.falhar("O player não está aberto nesta página.");
        return;
      }

      // já existe um player rodando neste mesmo alvo: só retoma
      if (this.player && this.alvoEmUsoId === alvo.el.id) {
        try {
          this.player.playVideo();
          this.estado = "tocando";
          this.avisar();
          return;
        } catch (e) {
          this.player = null;
        }
      }

      // estava tocando em outro player da página: desmonta o antigo
      if (this.player) {
        try {
          if (this.player.destroy) this.player.destroy();
        } catch (e) {}
        const anterior = this.alvos.find((a) => a.el.id === this.alvoEmUsoId);
        if (anterior) {
          const velho = anterior.el.querySelector("iframe");
          if (velho) velho.remove();
          this.garantirMontagem(anterior);
        }
        this.player = null;
      }

      const casa = this.garantirMontagem(alvo);
      if (!casa) return;

      this.estado = "carregando";
      this.avisar();
      try {
        const YT = await carregarAPIYouTube();
        this.alvoEmUsoId = alvo.el.id;
        this.player = new YT.Player(casa, {
          width: "100%",
          height: "100%",
          videoId: dados.videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              e.target.setVolume(Math.round(audio.volume * 100));
              e.target.playVideo();
              this.estado = "tocando";
              this.avisar();
            },
            onStateChange: (e) => {
              const estadoYT = (window.YT && window.YT.PlayerState) || {};
              if (e.data === estadoYT.PLAYING) {
                this.estado = "tocando";
                audio.pausar();
              } else if (e.data === estadoYT.PAUSED) this.estado = "pausado";
              else if (e.data === estadoYT.ENDED) this.estado = "parado";
              this.avisar();
            },
            onError: () =>
              this.falhar("O YouTube recusou a reprodução nesta página (embed bloqueado)."),
          },
        });
        clearTimeout(this._relogio);
        this._relogio = setTimeout(() => {
          if (this.estado !== "tocando") {
            this.falhar(
              "O player do YouTube não iniciou nesta janela — provavelmente o sandbox do preview bloqueou o embed."
            );
          }
        }, 9000);
      } catch (e) {
        this.falhar(
          e.message === "api-bloqueada"
            ? "Não foi possível carregar a API do YouTube (sem conexão?)."
            : "O YouTube demorou demais para responder."
        );
      }
    },

    pausar() {
      if (this.player && this.player.pauseVideo) {
        try {
          this.player.pauseVideo();
        } catch (e) {}
      }
      if (this.estado !== "erro") this.estado = "pausado";
      this.avisar();
    },

    alternar() {
      if (this.estado === "tocando") this.pausar();
      else this.tocar();
    },

    volume(v) {
      if (this.player && this.player.setVolume) {
        try {
          this.player.setVolume(Math.round(v * 100));
        } catch (e) {}
      }
    },

    falhar(detalhe) {
      this.estado = "erro";
      this.erroDetalhe = detalhe || "";
      this.avisar();
      FGA.toast(
        "Trilha do YouTube indisponível",
        detalhe + " Use a aba “Sintetizado” ou abra o vídeo direto no YouTube.",
        "aviso"
      );
    },

    avisar() {
      if (typeof this.aoMudar === "function") this.aoMudar();
    },
  };
  FGA.musicaYT = musicaYT;

  function blocoYouTube() {
    const dados = FGA.musica || {};
    const caixa = criar("div", { classe: "yt" });

    const palco = criar("div", { classe: "yt__palco" });
    const alvo = criar("div", { classe: "yt__alvo", id: "ytAlvo" + ++contadorYt });
    alvo.append(criar("div", { classe: "yt__montagem" }));
    const registro = { el: alvo };
    musicaYT.alvos.push(registro);
    const fachada = criar("button", {
      classe: "yt__fachada",
      type: "button",
      "aria-label": "Tocar a trilha oficial no YouTube: " + (dados.titulo || ""),
    });
    const capa = document.createElement("img");
    capa.className = "yt__capa";
    /* o sandbox do preview (e qualquer rede restrita) bloqueia o i.ytimg.com;
       nesse caso cai para uma imagem local do acervo */
    capa.src = dados.posterLocal || dados.thumb || "";
    if (dados.thumb && dados.posterLocal) {
      capa.addEventListener("error", () => {
        capa.src = dados.posterLocal;
      });
      const teste = new Image();
      teste.onload = () => {
        capa.src = dados.thumb;
      };
      teste.src = dados.thumb;
    }
    capa.alt = "";
    capa.loading = "lazy";
    const play = criar("span", { classe: "yt__play", "aria-hidden": "true" });
    play.append(FGA.icones.el("som", { classe: "ico--dock" }));
    const selo = criar("span", { classe: "yt__selo", texto: "trilha oficial · YouTube" });
    fachada.append(capa, selo, play);
    palco.append(alvo, fachada);

    const titulo = criar("p", { classe: "yt__titulo", html: `<strong>${dados.titulo || ""}</strong>` });
    const meta = criar("p", {
      classe: "yt__meta",
      html: `canal <a href="${dados.canal || "#"}" target="_blank" rel="noopener">${dados.autor || ""}</a> · <a href="${dados.url || "#"}" target="_blank" rel="noopener">assistir no YouTube</a>`,
    });

    const controles = criar("div", { classe: "player__controles" });
    const botaoTocar = criar("button", { classe: "botao botao--pequeno botao--verde", type: "button" });
    const botaoPausar = criar("button", {
      classe: "botao botao--pequeno botao--fantasma",
      type: "button",
      texto: "Pausar",
    });
    controles.append(botaoTocar, botaoPausar);

    const aviso = criar("p", { classe: "yt__aviso" });
    caixa.append(palco, titulo, meta, controles, aviso);

    fachada.addEventListener("click", () => {
      audio.desbloquear();
      musicaYT.tocar(registro);
    });
    botaoTocar.addEventListener("click", () => {
      audio.desbloquear();
      musicaYT.tocar(registro);
    });
    botaoPausar.addEventListener("click", () => musicaYT.pausar());

    caixa.atualizar = () => {
      const estado = musicaYT.estado;
      const tocando = estado === "tocando";
      botaoTocar.textContent =
        estado === "carregando" ? "carregando…" : tocando ? "Reiniciar" : "Tocar trilha oficial";
      botaoTocar.setAttribute("aria-pressed", String(tocando));
      /* só o player que está tocando esconde a fachada (senão a capa ficaria
         por cima do vídeo do outro player) */
      fachada.style.display = tocando && musicaYT.alvoEmUsoId === alvo.id ? "none" : "";
      aviso.innerHTML =
        estado === "erro"
          ? `<strong>Não deu para tocar aqui:</strong> ${musicaYT.erroDetalhe} <a href="${dados.url}" target="_blank" rel="noopener">Abrir no YouTube →</a>`
          : estado === "carregando"
            ? "carregando o player do YouTube…"
            : "";
    };
    caixa.atualizar();
    return caixa;
  }

  function blocoSintetizado() {
    const caixa = criar("div", { classe: "synth" });
    const tela = criar("div", { classe: "player__tela", role: "status", "aria-live": "off" });
    const onda = criar("span", { classe: "player__onda", "aria-hidden": "true" }, [
      criar("i"),
      criar("i"),
      criar("i"),
      criar("i"),
      criar("i"),
    ]);
    const texto = criar("span", { texto: "parado — clique em Tocar" });
    tela.append(onda, texto);

    const controles = criar("div", { classe: "player__controles" });
    /* os botões do player usam ícones do Vista + rótulo em texto */
    const rotular = (botao, chave, txt) => {
      botao.textContent = "";
      botao.append(FGA.icones.el(chave, { classe: "ico--botao" }), criar("span", { texto: txt }));
    };
    const botaoTocar = criar("button", {
      classe: "botao botao--pequeno botao--ciano",
      type: "button",
      "aria-pressed": "false",
    });
    rotular(botaoTocar, "som", "Tocar");
    const botaoFaixa = criar("button", {
      classe: "botao botao--pequeno botao--fantasma",
      type: "button",
    });
    rotular(botaoFaixa, "musica", "Próxima faixa");
    controles.append(botaoTocar, botaoFaixa);

    const lista = criar("div", { classe: "player__faixas" });
    audio.faixas.forEach((f, i) => {
      const b = criar("button", { classe: "player__faixa", type: "button", "aria-pressed": "false" });
      const icone = criar("span", { classe: "player__faixa-icone" });
      icone.append(FGA.icones.el("musica", { classe: "ico--chip" }));
      b.append(icone, criar("span", { html: `<strong>${f.nome}</strong><br><small>${f.descricao}</small>` }));
      b.addEventListener("click", () => {
        audio.tocar(i);
        caixa.atualizar();
      });
      lista.append(b);
    });

    caixa.append(tela, controles, lista);
    caixa.atualizar = () => {
      const tocando = audio.tocaMusica;
      rotular(botaoTocar, "som", tocando ? "Pausar" : "Tocar");
      botaoTocar.setAttribute("aria-pressed", String(tocando));
      tela.classList.toggle("player__tela--tocando", tocando);
      texto.textContent = tocando ? `${audio.faixa.nome} — ${audio.faixa.descricao}` : "parado — clique em Tocar";
      $$(".player__faixa", lista).forEach((b, i) => {
        b.setAttribute("aria-pressed", String(tocando && i === audio.faixaAtual));
      });
    };
    botaoTocar.addEventListener("click", () => {
      audio.alternar();
      caixa.atualizar();
    });
    botaoFaixa.addEventListener("click", () => {
      audio.tocar(audio.faixaAtual + 1);
      caixa.atualizar();
    });
    caixa.atualizar();
    return caixa;
  }

  function montarPlayer(alvo) {
    if (!alvo) return null;
    const jaTem = $(".player", alvo);
    if (jaTem) return jaTem;

    const player = criar("div", { classe: "player" });
    const abas = criar("div", { classe: "abas", role: "tablist", "aria-label": "Escolha a trilha sonora" });
    const corpoYT = blocoYouTube();
    const corpoSynth = blocoSintetizado();

    const abaYT = criar("button", { classe: "aba", type: "button", role: "tab", "aria-selected": "true" });
    abaYT.append(FGA.icones.el("som", { classe: "ico--chip" }), criar("span", { texto: "Trilha oficial (YouTube)" }));
    const abaSynth = criar("button", { classe: "aba", type: "button", role: "tab", "aria-selected": "false" });
    abaSynth.append(FGA.icones.el("musica", { classe: "ico--chip" }), criar("span", { texto: "Sintetizado" }));
    abas.append(abaYT, abaSynth);

    const volume = criar("label", { classe: "player__volume" });
    const entrada = criar("input", {
      type: "range",
      min: "0",
      max: "100",
      value: String(Math.round((armazem.ler("volume", 0.6) || 0.6) * 100)),
      "aria-label": "Volume",
    });
    volume.append(FGA.icones.el("som", { classe: "ico--chip" }), entrada);

    const painel = criar("div", { classe: "player__painel" }, [corpoYT, corpoSynth]);
    corpoSynth.hidden = true;

    function selecionar(qual) {
      const yt = qual === "yt";
      abaYT.setAttribute("aria-selected", String(yt));
      abaSynth.setAttribute("aria-selected", String(!yt));
      corpoYT.hidden = !yt;
      corpoSynth.hidden = yt;
      if (yt) audio.pausar();
      else musicaYT.pausar();
      (yt ? corpoYT : corpoSynth).atualizar();
    }
    abaYT.addEventListener("click", () => selecionar("yt"));
    abaSynth.addEventListener("click", () => selecionar("synth"));

    entrada.addEventListener("input", () => {
      audio.definirVolume(Number(entrada.value) / 100);
      musicaYT.volume(audio.volume);
    });

    player.append(abas, painel, volume);

    const atualizarTudo = () => {
      corpoYT.atualizar();
      corpoSynth.atualizar();
    };
    audio.aoMudar = atualizarTudo;
    musicaYT.aoMudar = atualizarTudo;
    atualizarTudo();

    alvo.append(player);
    return player;
  }
  FGA.montarPlayer = montarPlayer;

  /* ---------- 10.1 Controle unificado da trilha sonora ---------- */
  function trilhaAtual() {
    if (musicaYT.estado === "tocando") return "youtube";
    if (audio.tocaMusica) return "sintetizada";
    return null;
  }

  function alternarTrilha() {
    const atual = trilhaAtual();
    if (atual === "youtube") musicaYT.pausar();
    else if (atual === "sintetizada") audio.pausar();
    else if (FGA.musica && FGA.musica.videoId && (musicaYT.temAlvo() || musicaYT.player)) {
      audio.desbloquear();
      musicaYT.tocar();
    } else {
      audio.tocar(audio.faixaAtual);
    }
    return trilhaAtual();
  }
  FGA.alternarTrilha = alternarTrilha;
  FGA.trilhaAtual = trilhaAtual;

  /* ---------- 11. AeroBot (chat estilo MSN) ---------- */
  function respostaDoBot(pergunta) {
    const bot = FGA.bot || { regras: [], padroes: [] };
    const texto = normalizar(pergunta);
    if (!texto) return "digita algo aí!";
    let melhor = null;
    let melhorPontos = 0;
    bot.regras.forEach((regra) => {
      let pontos = 0;
      regra.chaves.forEach((chave) => {
        const c = normalizar(chave);
        if (!c) return;
        if (texto === c) pontos += 4;
        else if (new RegExp("(^|\\s)" + c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\s|$)").test(texto)) pontos += 2.5;
        else if (texto.includes(c)) pontos += 1.6;
      });
      if (pontos > melhorPontos) {
        melhorPontos = pontos;
        melhor = regra;
      }
    });
    if (melhor && melhorPontos >= 1.6) {
      const cur = escolher(FGA.curiosidades || [{ texto: "o vidro do Vista tinha desfoque em tempo real!" }]);
      return String(melhor.resposta)
        .replace("%LOCAL%", String(FGA.totalLocal || 171))
        .replace("%CURIOSIDADE%", cur.texto);
    }
    return escolher(bot.padroes || ["hmm, não sei essa."]);
  }

  function montarChat(alvo) {
    if (!alvo) return null;
    const bot = FGA.bot || { nome: "AeroBot", status: "", saudacao: "oi!" };
    const janela = criar("div", { classe: "chat" });

    const cabecalho = criar("div", { classe: "chat__topo" });
    cabecalho.append(
      FGA.icones.el("chat", { classe: "ico--g" }),
      criar("div", {}, [
        criar("strong", { texto: bot.nome }),
        criar("small", { texto: bot.status || "" }),
      ])
    );

    const historico = criar("div", {
      classe: "chat__historico",
      role: "log",
      "aria-live": "polite",
      "aria-label": "Conversa com " + bot.nome,
    });
    const formulario = criar("form", { classe: "chat__form" });
    const campo = criar("input", {
      classe: "chat__campo",
      type: "text",
      placeholder: "digite sua pergunta...",
      "aria-label": "Mensagem para o AeroBot",
      autocomplete: "off",
      maxlength: "180",
    });
    const enviar = criar("button", { classe: "botao botao--pequeno", type: "submit", texto: "Enviar" });
    formulario.append(campo, enviar);

    const sugestoes = criar("div", { classe: "chat__sugestoes" });
    (bot.sugestoes || []).forEach((s) => {
      const b = criar("button", { classe: "chat__sugestao", type: "button", texto: s });
      b.addEventListener("click", () => {
        campo.value = s;
        formulario.dispatchEvent(new Event("submit", { cancelable: true }));
      });
      sugestoes.append(b);
    });

    janela.append(cabecalho, historico, sugestoes, formulario);

    function balao(texto, quem) {
      const b = criar("div", { classe: "balao balao--" + quem }, [
        criar("span", { classe: "balao__autor", texto: quem === "bot" ? bot.nome : "você" }),
        criar("span", { html: texto }),
      ]);
      historico.append(b);
      historico.scrollTop = historico.scrollHeight;
      return b;
    }

    balao(bot.saudacao, "bot");

    let pensando = false;
    formulario.addEventListener("submit", (e) => {
      e.preventDefault();
      const txt = campo.value.trim();
      if (!txt || pensando) return;
      balao(
        txt.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])),
        "usuario"
      );
      campo.value = "";
      pensando = true;
      audio.sfx("mensagem");
      const digitando = balao("<em>está digitando…</em>", "bot");
      setTimeout(() => {
        digitando.remove();
        balao(respostaDoBot(txt), "bot");
        audio.sfx("clique");
        pensando = false;
      }, 520 + Math.random() * 520);
    });

    alvo.append(janela);
    return janela;
  }
  FGA.montarChat = montarChat;
  FGA.respostaDoBot = respostaDoBot;

  /* ---------- 12. Dock ---------- */
  function montarDock() {
    const dock = $("#dock");
    if (!dock) return;
    dock.innerHTML = "";

    const acoes = [
      {
        id: "musica",
        icone: "som",
        rotulo: "Música Aero",
        aoClicar: () => {
          const janela = criarJanela({
            id: "janelaMusica",
            titulo: "Aero Player 2000",
            icone: "som",
            corpo: criar("div", { classe: "player-area" }),
          });
          janela.classList.remove("minimizada");
          montarPlayer($(".player-area", janela));
          audio.desbloquear();
          if (!trilhaAtual()) {
            if (FGA.musica && FGA.musica.videoId && musicaYT.temAlvo()) musicaYT.tocar();
            else {
              audio.tocar(audio.faixaAtual);
              FGA.toast("Música ligada", "Trilha sintetizada em tempo real (Web Audio)", "bom");
            }
          }
        },
      },
      {
        id: "curiosidade",
        icone: "curiosidades",
        rotulo: "Curiosidade",
        aoClicar: () => mostrarCuriosidade(),
      },
      {
        id: "ceu",
        icone: "cenario",
        rotulo: "Trocar cenário",
        aoClicar: () => cenario.trocar(1 + inteiro(0, 2)),
      },
      {
        id: "retro",
        icone: "retro",
        rotulo: "Modo 2000",
        alternavel: () => document.body.classList.contains("retro"),
        aoClicar: (botao) => {
          const retro = !document.body.classList.contains("retro");
          document.body.classList.toggle("retro", retro);
          armazem.gravar("retro", retro);
          botao.setAttribute("aria-pressed", String(retro));
          FGA.toast(
            retro ? "Modo 2000 ativado" : "Modo Aero ativado",
            retro ? "janelas sólidas, como em 2002" : "vidro, brilho e desfoque de volta",
            retro ? "aviso" : "bom"
          );
          audio.sfx(retro ? "aviso" : "vidro");
        },
      },
      {
        id: "calmo",
        icone: "calmo",
        rotulo: "Efeitos calmos",
        alternavel: () => document.body.classList.contains("calmo"),
        aoClicar: (botao) => {
          const calmo = !document.body.classList.contains("calmo");
          document.body.classList.toggle("calmo", calmo);
          armazem.gravar("calmo", calmo);
          botao.setAttribute("aria-pressed", String(calmo));
          FGA.toast(calmo ? "Modo calmo" : "Modo completo", calmo ? "animações e bolhas reduzidas" : "efeitos visuais completos");
        },
      },
      {
        id: "topo",
        icone: "topo",
        rotulo: "Voltar ao topo",
        aoClicar: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      },
    ];

    acoes.forEach((a) => {
      const b = criar("button", {
        classe: "dock__botao",
        type: "button",
        "aria-label": a.rotulo,
        title: a.rotulo,
      });
      b.append(FGA.icones.el(a.icone, { classe: "ico--dock" }), criar("span", { classe: "dock__rotulo", texto: a.rotulo }));
      if (a.alternavel) b.setAttribute("aria-pressed", String(a.alternavel()));
      b.addEventListener("click", () => {
        audio.desbloquear();
        audio.sfx("clique");
        a.aoClicar(b);
      });
      dock.append(b);
    });

    const relogio = criar("div", { classe: "dock__relogio", "aria-hidden": "true" });
    relogio.append(criar("span"), criar("small"));
    dock.append(relogio);
    const atualizarRelogio = () => {
      const agora = new Date();
      relogio.firstElementChild.textContent = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      relogio.lastElementChild.textContent = agora.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    };
    atualizarRelogio();
    setInterval(atualizarRelogio, 20000);
  }

  function mostrarCuriosidade(dado) {
    const lista = FGA.curiosidades || [];
    const item = dado || escolher(lista);
    if (!item) return;
    const corpo = criar("div", {}, [
      criar("p", { classe: "curiosidade__topo", html: `<strong>${item.titulo}</strong>` }),
      criar("p", { html: item.texto }),
      criar("p", { classe: "dica-uso", texto: "Clique no título da janela para arrastar; o botão da direita fecha e o da esquerda minimiza." }),
    ]);
    const existente = document.getElementById("janelaCuriosidade");
    if (existente) existente.remove();
    const janela = criarJanela({
      id: "janelaCuriosidade",
      titulo: "Curiosidade da hora",
      icone: "curiosidades",
      corpo,
    });
    janela.classList.remove("minimizada");
    audio.sfx("estrela");
    return janela;
  }
  FGA.mostrarCuriosidade = mostrarCuriosidade;

  /* ---------- 13. Atalhos de teclado ---------- */
  function atalhos() {
    document.addEventListener("keydown", (e) => {
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (digitando) return;
      if (e.key === "m") {
        const atual = alternarTrilha();
        FGA.toast(
          atual ? "Trilha ligada" : "Trilha pausada",
          atual === "youtube" ? "trilha oficial (YouTube)" : atual === "sintetizada" ? "trilha sintetizada" : "atalho: M",
          "bom"
        );
      } else if (e.key === "c") {
        cenario.trocar(1);
      } else if (e.key === "k") {
        mostrarCuriosidade();
      } else if (e.key === "Escape") {
        const lb = document.getElementById("lightbox");
        if (lb) lb.classList.remove("aberto");
      }
    });
  }

  /* ---------- 14. Inicialização ---------- */
  FGA.iniciar = function iniciar(opcoes = {}) {
    const preferencias = {
      retro: armazem.ler("retro", false),
      calmo: armazem.ler("calmo", false),
      volume: armazem.ler("volume", 0.6),
      faixa: armazem.ler("faixa", 0),
    };
    audio.faixaAtual = limitar(Number(preferencias.faixa) || 0, 0, faixas.length - 1);
    audio.volume = limitar(Number(preferencias.volume) || 0.6, 0, 1);
    if (preferencias.retro) document.body.classList.add("retro");
    if (preferencias.calmo) document.body.classList.add("calmo");

    // áudio só destrava com interação do usuário
    const destravar = () => {
      audio.desbloquear();
      if (audio.mestre) audio.mestre.gain.value = 0.9 * audio.volume;
      document.removeEventListener("pointerdown", destravar);
      document.removeEventListener("keydown", destravar);
    };
    document.addEventListener("pointerdown", destravar);
    document.addEventListener("keydown", destravar);

    cenario.iniciar();

    // botão de som do cabeçalho (ícone de mídia do Vista)
    const botaoSom = document.getElementById("botaoSom");
    if (botaoSom) {
      botaoSom.innerHTML = "";
      botaoSom.append(FGA.icones.el("som", { classe: "ico--botao" }));
      const sincronizar = () => {
        const atual = trilhaAtual();
        botaoSom.setAttribute("aria-pressed", String(!!atual));
        botaoSom.title = atual ? "Pausar a trilha (atalho: M)" : "Tocar a trilha do site (atalho: M)";
      };
      botaoSom.addEventListener("click", () => {
        const atual = alternarTrilha();
        sincronizar();
        FGA.toast(
          atual ? "Trilha ligada" : "Trilha pausada",
          atual === "youtube"
            ? FGA.musica
              ? FGA.musica.titulo
              : "trilha oficial"
            : atual === "sintetizada"
              ? "trilha sintetizada"
              : "atalho: M",
          "bom"
        );
      });
      const aoMudarAntes = audio.aoMudar;
      audio.aoMudar = () => {
        if (typeof aoMudarAntes === "function") aoMudarAntes();
        sincronizar();
      };
      const aoMudarYTAntes = musicaYT.aoMudar;
      musicaYT.aoMudar = () => {
        if (typeof aoMudarYTAntes === "function") aoMudarYTAntes();
        sincronizar();
      };
      sincronizar();
    }

    montarNavegacao();
    prepararRevelacoes();
    animarContadores();
    montarDock();
    atalhos();

    const canvas = document.getElementById("bolhasFundo");
    if (canvas) FGA.__bolhas = bolhasDeFundo(canvas);

    document.dispatchEvent(new CustomEvent("fga:pronto", { detail: opcoes }));
    return true;
  };

  FGA.versao = "1.1.0";
})();
