/* ==========================================================================
   FGAero Land 2000 — jogo-trivia.js
   Trivia Aero: 10 perguntas sorteadas sobre a estética, o Windows Aero e a
   internet brasileira dos anos 2000, com explicação em cada resposta.
   ========================================================================== */
(function () {
  "use strict";
  const FGA = window.FGA || {};
  const { criar, embaralhar, limitar } = FGA.util;

  const palco = document.querySelector("#palcoTrivia");
  if (!palco) return;

  const hudPontos = document.querySelector("[data-hud='pontos']");
  const hudPergunta = document.querySelector("[data-hud='pergunta']");
  const hudSequencia = document.querySelector("[data-hud='sequencia']");
  const hudTempo = document.querySelector("[data-hud='tempo']");
  const barra = document.querySelector("[data-hud='barra']");
  const sobreposicao = document.querySelector("#sobreposicaoTrivia");
  const areaPontos = document.querySelector(".pontos-flutuantes", palco);

  const TOTAL = 10;
  const TEMPO_PERGUNTA = 25;

  const estado = {
    perguntas: [],
    atual: 0,
    pontos: 0,
    sequencia: 0,
    melhorSequencia: 0,
    acertos: 0,
    tempo: TEMPO_PERGUNTA,
    timer: null,
    respondidas: [],
    travado: false,
  };

  function atualizarHUD() {
    if (hudPontos) hudPontos.textContent = Math.round(estado.pontos).toLocaleString("pt-BR");
    if (hudPergunta) hudPergunta.textContent = `${Math.min(estado.atual + 1, TOTAL)}/${TOTAL}`;
    if (hudSequencia) hudSequencia.textContent = "x" + Math.max(1, estado.sequencia);
    if (hudTempo) hudTempo.textContent = Math.max(0, Math.ceil(estado.tempo)) + "s";
    if (barra) {
      const p = estado.atual / TOTAL;
      barra.style.width = (p * 100).toFixed(1) + "%";
      const pai = barra.parentElement;
      if (pai) pai.classList.toggle("hud__barra--aviso", estado.tempo <= 8);
    }
  }

  function iniciar() {
    estado.perguntas = embaralhar(FGA.trivia || [])
      .slice(0, TOTAL)
      .map((p) => {
        const opcoes = embaralhar(p.opcoes.map((texto, i) => ({ texto, certa: i === p.certa })));
        return Object.assign({}, p, { opcoesEmbaralhadas: opcoes });
      });
    estado.atual = 0;
    estado.pontos = 0;
    estado.sequencia = 0;
    estado.melhorSequencia = 0;
    estado.acertos = 0;
    estado.respondidas = [];
    esconderSobreposicao();
    mostrarPergunta();
    FGA.toast("Trivia Aero", "10 perguntas. Responder rápido vale bônus!", "bom");
  }

  function cronometrar() {
    clearInterval(estado.timer);
    estado.tempo = TEMPO_PERGUNTA;
    atualizarHUD();
    estado.timer = setInterval(() => {
      estado.tempo -= 0.25;
      if (estado.tempo <= 0) {
        clearInterval(estado.timer);
        responder(null);
      }
      atualizarHUD();
    }, 250);
  }

  function mostrarPergunta() {
    const p = estado.perguntas[estado.atual];
    if (!p) return finalizar();
    estado.travado = false;
    palco.innerHTML = "";

    const janela = criar("div", { classe: "janela" });
    const barraJanela = criar("header", { classe: "janela__barra" }, [
      criar("h2", { classe: "janela__titulo", texto: `Pergunta ${estado.atual + 1} de ${TOTAL}` }),
    ]);
    const corpo = criar("div", { classe: "janela__corpo" });
    corpo.append(criar("p", { classe: "trivia__enunciado", texto: p.pergunta }));

    const opcoes = criar("div", { classe: "trivia__opcoes", role: "group", "aria-label": "Alternativas" });
    p.opcoesEmbaralhadas.forEach((o, i) => {
      const b = criar("button", { classe: "opcao", type: "button" });
      b.append(
        criar("span", { classe: "opcao__letra", texto: String.fromCharCode(65 + i) }),
        criar("span", { texto: o.texto })
      );
      b.addEventListener("click", () => responder(b, o.certa));
      opcoes.append(b);
    });
    corpo.append(opcoes);

    const feedback = criar("div", { classe: "trivia__feedback" });
    feedback.hidden = true;
    corpo.append(feedback);

    janela.append(barraJanela, corpo);
    palco.append(janela);
    cronometrar();
  }

  function responder(botao, certa) {
    if (estado.travado) return;
    estado.travado = true;
    clearInterval(estado.timer);
    const p = estado.perguntas[estado.atual];
    const feedback = palco.querySelector(".trivia__feedback");
    const botoes = Array.from(palco.querySelectorAll(".opcao"));

    botoes.forEach((b) => {
      b.disabled = true;
      const ehCerta = p.opcoesEmbaralhadas[botoes.indexOf(b)].certa;
      if (ehCerta) b.classList.add("opcao--certa");
    });
    if (botao && certa === false) botao.classList.add("opcao--errada");

    let ganho = 0;
    if (certa === true) {
      estado.sequencia += 1;
      estado.melhorSequencia = Math.max(estado.melhorSequencia, estado.sequencia);
      const bonusTempo = Math.round(limitar(estado.tempo, 0, TEMPO_PERGUNTA) * 4);
      ganho = 100 + bonusTempo + (estado.sequencia - 1) * 25;
      estado.pontos += ganho;
      estado.acertos += 1;
      FGA.audio && FGA.audio.sfx("acerto");
      if (areaPontos) {
        const el = document.createElement("span");
        el.className = "ponto-flutuante ponto-flutuante--ouro";
        el.textContent = "+" + ganho;
        el.style.left = "50%";
        el.style.top = "42%";
        areaPontos.append(el);
        setTimeout(() => el.remove(), 950);
      }
      if (feedback) {
        feedback.innerHTML = `<strong>✅ Certo! +${ganho} pontos</strong>${p.explica}`;
        feedback.hidden = false;
        feedback.style.animation = "entrarBalao .3s ease-out";
      }
    } else {
      estado.sequencia = 0;
      FGA.audio && FGA.audio.sfx("erro");
      if (feedback) {
        const tempo = certa === null ? "O tempo acabou." : "Não foi essa.";
        feedback.innerHTML = `<strong>${certa === null ? "⏰ " + tempo : "❌ " + tempo}</strong>${p.explica}`;
        feedback.hidden = false;
      }
    }
    estado.respondidas.push({ pergunta: p.pergunta, ganho, certa: certa === true });
    atualizarHUD();

    const proximo = criar("div", { classe: "empilhado espaco-topo" }, [
      criar("button", {
        classe: "botao botao--pequeno",
        type: "button",
        texto: estado.atual + 1 >= TOTAL ? "Ver resultado →" : "Próxima pergunta →",
      }),
    ]);
    proximo.firstElementChild.addEventListener("click", () => {
      FGA.audio && FGA.audio.desbloquear();
      estado.atual += 1;
      if (estado.atual >= TOTAL) finalizar();
      else mostrarPergunta();
    });
    if (feedback) feedback.after(proximo);
    proximo.firstElementChild.focus({ preventScroll: true });
  }

  function finalizar() {
    clearInterval(estado.timer);
    const novo = FGA.recorde.gravar("trivia", Math.round(estado.pontos));
    const recorde = FGA.recorde.ler("trivia");
    FGA.recorde.registrar("trivia", "Você", Math.round(estado.pontos));
    const acertos = estado.acertos;
    const conceito =
      acertos >= 10 ? "Arquivista do Frutiger Aero 🏆" :
      acertos >= 8 ? "Curador de acervo 🥇" :
      acertos >= 6 ? "Fã de vidro e bolhas 🥈" :
      acertos >= 4 ? "Visitante curioso 🥉" : "Turista do 56k 📼";
    FGA.audio && FGA.audio.sfx(novo ? "estrela" : "acerto");

    if (areaPontos) areaPontos.innerHTML = "";
    palco.innerHTML = "";
    mostrarSobreposicao({
      titulo: novo ? "🏆 Novo recorde!" : "📊 Resultado final",
      texto: `Você acertou <strong>${acertos} de ${TOTAL}</strong> e fez <strong>${Math.round(estado.pontos).toLocaleString("pt-BR")}</strong> pontos.<br>
        Melhor sequência: <strong>${estado.melhorSequencia}</strong> · Recorde neste navegador: ${recorde.toLocaleString("pt-BR")}<br>
        Seu título: <strong>${conceito}</strong>`,
      html: resumoHtml(),
      acoes: [
        { texto: "↻ Jogar novamente", classe: "botao--verde", aoClicar: iniciar },
        { texto: "📚 Ler as curiosidades", classe: "botao--ciano", aoClicar: () => (window.location.href = "curiosidades.html") },
        { texto: "🎮 Outros jogos", classe: "botao--fantasma", aoClicar: () => (window.location.href = "jogos.html") },
      ],
    });
  }

  function resumoHtml() {
    const itens = estado.respondidas
      .map(
        (r, i) =>
          `<li><strong>${r.certa ? "✅" : "❌"} ${i + 1}.</strong> ${r.pergunta} <em>(${r.ganho > 0 ? "+" + r.ganho : "0"} pts)</em></li>`
      )
      .join("");
    return `<details class="acordeao"><summary>Revisar as ${estado.respondidas.length} perguntas</summary><ul class="lista-bolha">${itens}</ul></details>`;
  }

  function mostrarSobreposicao({ titulo, texto, html = "", acoes = [] }) {
    if (!sobreposicao) return;
    sobreposicao.innerHTML = "";
    const caixa = criar("div", { classe: "sobreposicao__caixa" });
    caixa.append(criar("h2", { html: titulo }), criar("p", { html: texto }));
    if (html) caixa.insertAdjacentHTML("beforeend", html);
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
  }

  function esconderSobreposicao() {
    if (sobreposicao) sobreposicao.hidden = true;
  }

  document.querySelector("#botaoPausa")?.addEventListener("click", () => {
    if (estado.timer) {
      clearInterval(estado.timer);
      estado.timer = null;
      mostrarSobreposicao({
        titulo: "⏸ Pausa",
        texto: "O relógio parou. Continue quando quiser.",
        acoes: [
          { texto: "▶ Continuar", classe: "botao--verde", aoClicar: () => { esconderSobreposicao(); cronometrar(); } },
          { texto: "↻ Recomeçar", classe: "botao--fantasma", aoClicar: iniciar },
        ],
      });
    }
  });

  atualizarHUD();
  mostrarSobreposicao({
    titulo: "🧠 Trivia Aero",
    texto:
      "Dez perguntas sorteadas sobre a estética Frutiger Aero, o Windows Vista/7 e a internet dos anos 2000 no Brasil. Cada resposta vem com explicação e as fontes estão na página de créditos.",
    html: `<ul class="sobreposicao__dicas"><li>Acerto base: <strong>100 pontos</strong></li><li>Bônus por rapidez: até <strong>+100</strong></li><li>Sequência de acertos: <strong>+25</strong> por nível</li><li>25 segundos por pergunta</li></ul>`,
    acoes: [
      { texto: "▶ Começar", classe: "botao--verde", aoClicar: iniciar },
      { texto: "🎮 Outros jogos", classe: "botao--fantasma", aoClicar: () => (window.location.href = "jogos.html") },
    ],
  });
})();
