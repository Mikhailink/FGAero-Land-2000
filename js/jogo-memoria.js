/* ==========================================================================
   FGAero Land 2000 — jogo-memoria.js
   Memória Gloss: pares de imagens do acervo em três níveis, com cronômetro,
   contador de jogadas e pontuação (acertos × velocidade).
   ========================================================================== */
(function () {
  "use strict";
  const FGA = window.FGA || {};
  const { criar, embaralhar, limitar, escolher } = FGA.util;

  const quadro = document.querySelector("#tabuleiroMemoria");
  if (!quadro) return;

  const hudPontos = document.querySelector("[data-hud='pontos']");
  const hudJogadas = document.querySelector("[data-hud='jogadas']");
  const hudTempo = document.querySelector("[data-hud='tempo']");
  const hudNivel = document.querySelector("[data-hud='nivel']");
  const hudPares = document.querySelector("[data-hud='pares']");
  const barra = document.querySelector("[data-hud='barra']");
  const sobreposicao = document.querySelector("#sobreposicaoMemoria");
  const areaPontos = document.querySelector(".pontos-flutuantes", quadro.closest(".palco-jogo") || document.body);

  const NIVEIS = {
    facil: { pares: 6, colunas: 4, nome: "Fácil", bonus: 1, categorias: ["sealife", "balloons", "globes", "clouds", "insects", "animals"] },
    medio: { pares: 8, colunas: 4, nome: "Médio", bonus: 1.6, categorias: ["sealife", "balloons", "globes", "airplanes", "objects", "insects", "trees", "animals"] },
    dificil: { pares: 10, colunas: 5, nome: "Difícil", bonus: 2.4, categorias: ["sealife", "balloons", "globes", "airplanes", "objects", "insects", "trees", "animals", "furniture", "metro"] },
  };

  const estado = {
    nivel: FGA.armazem.ler("memoriaNivel", "facil"),
    pontos: 0,
    jogadas: 0,
    erros: 0,
    acertos: 0,
    inicio: 0,
    tempo: 0,
    timer: null,
    primeira: null,
    segunda: null,
    travado: false,
    pares: 0,
  };

  function imagensDoNivel(nivel) {
    const cfg = NIVEIS[nivel];
    const escolhidas = [];
    cfg.categorias.forEach((cat) => {
      const lista = embaralhar(FGA.imagem.lista(cat));
      if (lista.length) escolhidas.push(lista[0]);
    });
    // garante a quantidade de pares, completando com qualquer categoria
    const todas = embaralhar(FGA.imagem.todas().map((i) => i.src));
    while (escolhidas.length < cfg.pares && todas.length) {
      const rel = todas.pop();
      if (!escolhidas.includes(rel)) escolhidas.push(rel);
    }
    return escolhidas.slice(0, cfg.pares);
  }

  function atualizarHUD() {
    if (hudPontos) hudPontos.textContent = Math.round(estado.pontos).toLocaleString("pt-BR");
    if (hudJogadas) hudJogadas.textContent = String(estado.jogadas);
    if (hudTempo) hudTempo.textContent = estado.tempo.toFixed(0) + "s";
    if (hudNivel) hudNivel.textContent = NIVEIS[estado.nivel].nome;
    if (hudPares) hudPares.textContent = estado.pares + "/" + NIVEIS[estado.nivel].pares;
    if (barra) {
      const p = estado.pares / NIVEIS[estado.nivel].pares;
      barra.style.width = (p * 100).toFixed(1) + "%";
      const pai = barra.parentElement;
      if (pai) pai.classList.toggle("hud__barra--aviso", p > 0.75);
    }
  }

  function cronometrar() {
    clearInterval(estado.timer);
    estado.inicio = performance.now();
    estado.timer = setInterval(() => {
      estado.tempo = (performance.now() - estado.inicio) / 1000;
      atualizarHUD();
    }, 200);
  }

  function verPalco() {
    const palco = document.querySelector(".palco-jogo");
    if (palco && FGA.jogoUtil && FGA.jogoUtil.trazerParaTela) FGA.jogoUtil.trazerParaTela(palco, 170);
  }

  function montarTabuleiro() {
    const cfg = NIVEIS[estado.nivel];
    quadro.style.setProperty("--colunas", cfg.colunas);
    quadro.innerHTML = "";
    estado.pontos = 0;
    estado.jogadas = 0;
    estado.erros = 0;
    estado.acertos = 0;
    estado.pares = 0;
    estado.primeira = null;
    estado.segunda = null;
    estado.travado = false;
    estado.tempo = 0;

    const rels = imagensDoNivel(estado.nivel);
    const cartas = embaralhar(
      rels.flatMap((rel, i) => [
        { id: i, rel },
        { id: i, rel },
      ])
    );

    cartas.forEach((carta, indice) => {
      const b = criar("button", {
        classe: "carta",
        type: "button",
        "aria-pressed": "false",
        "aria-label": "Carta " + (indice + 1) + ", virada para baixo",
        dataset: { id: String(carta.id), indice: String(indice), rel: carta.rel },
      });
      const interno = criar("div", { classe: "carta__interno" });
      const costa = criar("div", { classe: "carta__face carta__face--costa" });
      const frente = criar("div", { classe: "carta__face carta__face--frente" });
      frente.append(
        FGA.imagem.tag(carta.rel, { deco: true, alt: "" }),
        criar("span", { classe: "carta__nome", texto: FGA.imagem.nome(carta.rel) })
      );
      interno.append(costa, frente);
      b.append(interno);
      b.addEventListener("click", () => virar(b));
      quadro.append(b);
    });

    atualizarHUD();
    cronometrar();
  }

  function virar(carta) {
    if (estado.travado || carta.classList.contains("virada") || carta.classList.contains("achada")) return;
    FGA.audio && FGA.audio.sfx("clique");
    carta.classList.add("virada");
    carta.setAttribute("aria-pressed", "true");
    carta.setAttribute("aria-label", "Carta virada: " + FGA.imagem.nome(carta.dataset.rel || ""));

    if (!estado.primeira) {
      estado.primeira = carta;
      return;
    }
    estado.segunda = carta;
    estado.jogadas += 1;
    verificarPar();
  }

  function verificarPar() {
    const a = estado.primeira;
    const b = estado.segunda;
    if (!a || !b) return;
    if (a === b) return;
    const iguais = a.dataset.id === b.dataset.id;
    estado.travado = true;

    if (iguais) {
      estado.acertos += 1;
      estado.pares += 1;
      const bonusRapido = estado.jogadas <= NIVEIS[estado.nivel].pares ? 60 : 0;
      const ganho = Math.round((100 + bonusRapido) * NIVEIS[estado.nivel].bonus);
      estado.pontos += ganho;
      [a, b].forEach((c) => {
        c.classList.add("achada");
        c.classList.remove("virada");
      });
      if (areaPontos) {
        const el = document.createElement("span");
        el.className = "ponto-flutuante ponto-flutuante--ouro";
        el.textContent = "+" + ganho;
        el.style.left = ((b.offsetLeft + b.offsetWidth / 2) / quadro.offsetWidth) * 100 + "%";
        el.style.top = ((b.offsetTop + b.offsetHeight / 2) / quadro.offsetHeight) * 100 + "%";
        areaPontos.append(el);
        setTimeout(() => el.remove(), 950);
      }
      FGA.audio && FGA.audio.sfx("acerto");
      estado.primeira = null;
      estado.segunda = null;
      estado.travado = false;
      atualizarHUD();
      if (estado.pares === NIVEIS[estado.nivel].pares) setTimeout(finalizar, 420);
      return;
    }

    estado.erros += 1;
    estado.pontos = Math.max(0, estado.pontos - 12);
    FGA.audio && FGA.audio.sfx("erro");
    setTimeout(() => {
      [a, b].forEach((c) => {
        c.classList.remove("virada");
        c.setAttribute("aria-pressed", "false");
      });
      estado.primeira = null;
      estado.segunda = null;
      estado.travado = false;
      atualizarHUD();
    }, 760);
    atualizarHUD();
  }

  function finalizar() {
    clearInterval(estado.timer);
    const segundos = estado.tempo;
    const bonusTempo = Math.max(0, Math.round((120 - segundos) * 4 * NIVEIS[estado.nivel].bonus));
    estado.pontos += bonusTempo;
    atualizarHUD();
    const novo = FGA.recorde.gravar("memoria", Math.round(estado.pontos));
    const recorde = FGA.recorde.ler("memoria");
    FGA.recorde.registrar("memoria", "Você", Math.round(estado.pontos));
    FGA.audio && FGA.audio.sfx(novo ? "estrela" : "acerto");
    mostrarSobreposicao({
      titulo: novo ? "Novo recorde!" : "Tabuleiro completo!",
      icone: novo ? "sucesso" : "jogos",
      texto: `Nível <strong>${NIVEIS[estado.nivel].nome}</strong> resolvido em <strong>${segundos.toFixed(1)}s</strong> com <strong>${estado.jogadas}</strong> jogadas (${estado.erros} erros).<br>
        Pontos: <strong>${Math.round(estado.pontos).toLocaleString("pt-BR")}</strong> (bônus de tempo: +${bonusTempo}) · Recorde: ${recorde.toLocaleString("pt-BR")}`,
      acoes: [
        { texto: "Jogar de novo", classe: "botao--verde", aoClicar: montarTabuleiro },
        { texto: "Trocar nível", classe: "botao--fantasma", aoClicar: () => menuInicial() },
        { texto: "Outros jogos", classe: "botao--fantasma", aoClicar: () => (window.location.href = "jogos.html") },
      ],
    });
  }

  function mostrarSobreposicao({ titulo, icone, texto, acoes = [] }) {
    if (!sobreposicao) return;
    sobreposicao.innerHTML = "";
    const caixa = criar("div", { classe: "sobreposicao__caixa" });
    const h = criar("h2", { classe: icone ? "icone-titulo" : "" });
    if (icone && FGA.icones) h.append(FGA.icones.el(icone));
    h.append(criar("span", { html: titulo }));
    caixa.append(h, criar("p", { html: texto }));
    const acoesEl = criar("div", { classe: "sobreposicao__acoes" });
    acoes.forEach((a) => {
      const b = criar("button", { classe: "botao " + (a.classe || ""), type: "button", texto: a.texto });
      b.addEventListener("click", () => {
        FGA.audio && FGA.audio.desbloquear();
        a.aoClicar();
      });
      acoesEl.append(b);
    });
    caixa.append(acoesEl);
    sobreposicao.append(caixa);
    sobreposicao.hidden = false;
    if (FGA.jogoUtil && FGA.jogoUtil.trazerParaTela) FGA.jogoUtil.trazerParaTela(caixa, 170);
  }

  function esconderSobreposicao() {
    if (sobreposicao) sobreposicao.hidden = true;
  }

  function menuInicial() {
    mostrarSobreposicao({
      titulo: "Memória Gloss",
      icone: "jogos",
      texto:
        "Encontre os pares de imagens do acervo. Escolha um nível para começar — o recorde é salvo neste navegador.",
      acoes: Object.entries(NIVEIS).map(([chave, cfg], i) => ({
        texto: `${cfg.nome} · ${cfg.pares} pares`,
        classe: i === 0 ? "botao--verde" : i === 1 ? "botao--ciano" : "botao--laranja",
        aoClicar: () => iniciarNivel(chave),
      })).concat([{ texto: "Outros jogos", classe: "botao--fantasma", aoClicar: () => (window.location.href = "jogos.html") }]),
    });
  }

  function iniciarNivel(chave) {
    estado.nivel = chave;
    FGA.armazem.gravar("memoriaNivel", chave);
    esconderSobreposicao();
    verPalco();
    montarTabuleiro();
    FGA.toast("Nível " + NIVEIS[chave].nome, NIVEIS[chave].pares + " pares embaralhados. Boa sorte!", "bom");
  }

  document.querySelector("#botaoReiniciar")?.addEventListener("click", montarTabuleiro);
  document.querySelector("#botaoNivel")?.addEventListener("click", menuInicial);
  document.querySelector("#botaoPausa")?.addEventListener("click", () => {
    if (estado.timer) {
      clearInterval(estado.timer);
      estado.timer = null;
      mostrarSobreposicao({
        icone: "aviso",
        titulo: "Pausa",
        texto: "O tabuleiro fica esperando.",
        acoes: [{ texto: "Continuar", classe: "botao--verde", aoClicar: () => { esconderSobreposicao(); cronometrar(); } }],
      });
    }
  });

  // pré-visualiza as cartas por um instante antes de esconder
  quadro.classList.add("memoria--previa");
  quadro.style.setProperty("--colunas", NIVEIS[estado.nivel].colunas);
  atualizarHUD();
  menuInicial();
})();
