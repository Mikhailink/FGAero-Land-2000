/* ==========================================================================
   FGAero Land 2000 — paginas.js
   Lógica por página: galeria + lightbox, linha do tempo, curiosidades,
   widgets (apelido MSN, sorteio de wallpaper), hub de jogos e créditos.
   ========================================================================== */
(function () {
  "use strict";

  const FGA = window.FGA || {};
  const { $, $$, criar, escolher, inteiro, embaralhar, normalizar } = FGA.util;

  /* ---------- Linha do tempo ---------- */
  function montarLinhaDoTempo(alvo) {
    if (!alvo) return;
    const lista = criar("ol", { classe: "linha-tempo" });
    (FGA.linhaDoTempo || []).forEach((item) => {
      const li = criar("li", { classe: "linha-tempo__item surgir" }, [
        criar("span", { classe: "linha-tempo__ano", texto: item.ano }),
        criar("h3", { classe: "linha-tempo__titulo", html: item.titulo }),
        criar("p", { classe: "linha-tempo__texto", html: item.texto }),
        criar("span", { classe: "linha-tempo__fonte", texto: "Fontes: " + item.fonte }),
      ]);
      lista.append(li);
    });
    alvo.append(lista);
  }

  /* ---------- Galeria + lightbox ---------- */
  function criarLightbox() {
    let existente = document.getElementById("lightbox");
    if (existente) return existente;

    const caixa = criar("section", {
      id: "lightbox",
      classe: "lightbox",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Imagem ampliada",
    });
    const conteudo = criar("div", { classe: "lightbox__conteudo" });
    const janela = criar("div", { classe: "janela" });
    const barra = criar("header", { classe: "janela__barra" });
    const titulo = criar("h2", { classe: "janela__titulo", texto: "Imagem" });
    const botoes = criar("div", { classe: "janela__botoes" });
    botoes.append(
      criar("button", {
        classe: "janela__botao janela__botao--fechar",
        type: "button",
        texto: "✕",
        "aria-label": "Fechar",
      })
    );
    barra.append(titulo, botoes);

    const imagem = criar("img", { classe: "lightbox__imagem", alt: "" });
    const meta = criar("div", { classe: "lightbox__meta" });
    const info = criar("div");
    const acoes = criar("div", { classe: "lightbox__navegar" });
    const anterior = criar("button", { classe: "botao botao--pequeno botao--fantasma", type: "button", texto: "← Anterior" });
    const proximo = criar("button", { classe: "botao botao--pequeno botao--fantasma", type: "button", texto: "Próxima →" });
    const baixar = criar("a", { classe: "botao botao--pequeno botao--verde", texto: "⤓ Original", target: "_blank", rel: "noopener" });
    const github = criar("a", { classe: "botao botao--pequeno", texto: "Ver no GitHub", target: "_blank", rel: "noopener" });

    acoes.append(anterior, proximo, baixar, github);
    meta.append(info, acoes);

    const corpo = criar("div", { classe: "janela__corpo" }, [imagem, meta]);
    janela.append(barra, corpo);
    conteudo.append(janela);
    caixa.append(conteudo);
    document.body.append(caixa);

    caixa.addEventListener("click", (e) => {
      if (e.target === caixa) FGA.fecharLightbox();
    });
    botoes.firstElementChild.addEventListener("click", () => FGA.fecharLightbox());
    const lb = { caixa, titulo, imagem, info, anterior, proximo, baixar, github };
    FGA.__lightbox = lb;
    return caixa;
  }

  let itensAtuais = [];
  let indiceAtual = 0;

  function abrirLightbox(itens, indice) {
    criarLightbox();
    itensAtuais = itens;
    irPara(indice);
    FGA.__lightbox.caixa.classList.add("aberto");
    document.body.style.overflow = "hidden";
    FGA.audio && FGA.audio.sfx("vidro");
  }

  function irPara(indice) {
    const lb = FGA.__lightbox;
    if (!lb || !itensAtuais.length) return;
    indiceAtual = ((indice % itensAtuais.length) + itensAtuais.length) % itensAtuais.length;
    const item = itensAtuais[indiceAtual];
    lb.imagem.src = FGA.imagem.url(item.src);
    lb.imagem.alt = item.rotulo + " — " + item.src.split("/").pop();
    lb.titulo.textContent = item.rotulo + " · " + item.src.split("/").pop();
    lb.info.innerHTML = `<strong>${FGA.imagem.nome(item.src)}</strong><br>Categoria: ${item.rotulo} (${item.src.split("/")[1]}) · ${indiceAtual + 1} de ${itensAtuais.length}`;
    lb.baixar.href = FGA.repo.raw + item.src;
    lb.github.href = FGA.repo.url + "/blob/" + FGA.repo.ramo + "/" + item.src;
  }

  FGA.abrirLightbox = abrirLightbox;
  FGA.fecharLightbox = function fecharLightbox() {
    const lb = FGA.__lightbox;
    if (lb) lb.caixa.classList.remove("aberto");
    document.body.style.overflow = "";
  };
  FGA.proximaImagem = (passo) => {
    if (FGA.__lightbox && FGA.__lightbox.caixa.classList.contains("aberto")) irPara(indiceAtual + passo);
  };

  function montarGaleria(alvo, { limite = 0, comFiltros = true, inicial = "todas" } = {}) {
    if (!alvo) return;
    const todos = FGA.imagem.todas();
    let filtro = inicial;
    let mostrando = limite || todos.length;

    const barraFiltros = criar("div", { classe: "filtros", role: "group", "aria-label": "Filtrar por categoria" });
    const contagem = criar("p", { classe: "dica-uso", role: "status", "aria-live": "polite" });

    const grade = criar("div", { classe: "galeria" });
    const botaoMais = criar("button", {
      classe: "botao botao--pequeno botao--ciano espaco-topo",
      type: "button",
      texto: "Mostrar mais imagens ↓",
    });

    function lista() {
      return filtro === "todas" ? todos : todos.filter((i) => i.categoria === filtro);
    }

    function desenhar() {
      const base = lista();
      const recorte = base.slice(0, mostrando);
      grade.innerHTML = "";
      const frag = document.createDocumentFragment();
      recorte.forEach((item, i) => {
        const cartao = criar("button", {
          classe: "galeria__item surgir",
          type: "button",
          "aria-label": "Ampliar " + FGA.imagem.nome(item.src),
        });
        const moldura = criar("div", { classe: "galeria__moldura" }, [
          FGA.imagem.tag(item.src, { classe: "galeria__imagem", alt: FGA.imagem.nome(item.src), deco: true }),
        ]);
        const legenda = criar("div", { classe: "galeria__legenda" }, [
          criar("span", { classe: "galeria__nome", texto: FGA.imagem.nome(item.src) }),
          criar("span", { classe: "galeria__cat", texto: item.categoria }),
        ]);
        cartao.append(moldura, legenda);
        cartao.addEventListener("click", () => abrirLightbox(lista(), i));
        frag.append(cartao);
      });
      grade.append(frag);
      contagem.textContent = `${Math.min(mostrando, base.length)} de ${base.length} imagens nesta seleção · acervo total de ${FGA.totalRepositorio} arquivos em 19 categorias`;
      botaoMais.hidden = mostrando >= base.length;
      // reaplica o observador de entrada
      $$(".surgir", grade).forEach((el, i) => {
        el.style.transitionDelay = Math.min(300, (i % 10) * 45) + "ms";
        requestAnimationFrame(() => el.classList.add("visivel"));
      });
    }

    if (comFiltros) {
      const opcoes = [{ id: "todas", rotulo: "Todas", icone: "✳️" }].concat(
        (FGA.categorias || []).filter((c) => (FGA.acervo[c.id] || []).length)
      );
      opcoes.forEach((c) => {
        const b = criar("button", {
          classe: "filtro",
          type: "button",
          "aria-pressed": String(c.id === inicial),
          html: `${c.icone || ""} ${c.rotulo} <small>(${(FGA.acervo[c.id] || []).length})</small>`,
        });
        b.addEventListener("click", () => {
          filtro = c.id;
          mostrando = limite || todos.length;
          $$(".filtro", barraFiltros).forEach((o) => o.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true");
          desenhar();
          FGA.audio && FGA.audio.sfx("clique");
        });
        barraFiltros.append(b);
      });
    }

    botaoMais.addEventListener("click", () => {
      mostrando = Math.min(mostrando + (limite || 24), todos.length * 2);
      desenhar();
    });

    alvo.append(barraFiltros, contagem, grade, botaoMais);
    desenhar();
  }
  FGA.montarGaleria = montarGaleria;

  function montarFaixaAcervo(alvo, quantidade = 10) {
    if (!alvo) return;
    const todos = FGA.imagem.todas();
    const escolhidos = embaralhar(todos).slice(0, quantidade);
    const trilha = criar("div", { classe: "galeria" });
    escolhidos.forEach((item, i) => {
      const b = criar("button", { classe: "galeria__item surgir", type: "button", "aria-label": "Ampliar " + FGA.imagem.nome(item.src) });
      b.append(
        criar("div", { classe: "galeria__moldura" }, [
          FGA.imagem.tag(item.src, { classe: "galeria__imagem", deco: true, alt: "" }),
        ]),
        criar("div", { classe: "galeria__legenda" }, [
          criar("span", { classe: "galeria__nome", texto: FGA.imagem.nome(item.src) }),
          criar("span", { classe: "galeria__cat", texto: item.categoria }),
        ])
      );
      b.addEventListener("click", () => abrirLightbox(escolhidos, i));
      trilha.append(b);
    });
    const acoes = criar("div", { classe: "empilhado espaco-topo" }, [
      criar("a", { classe: "botao botao--pequeno", href: "galeria.html", texto: "Abrir a galeria completa →" }),
      criar("button", {
        classe: "botao botao--pequeno botao--fantasma",
        type: "button",
        texto: "🎲 Sortear outras",
        onclick: () => {
          alvo.innerHTML = "";
          montarFaixaAcervo(alvo, quantidade);
          FGA.audio && FGA.audio.sfx("clique");
        },
      }),
    ]);
    alvo.append(trilha, acoes);
    $$(".surgir", trilha).forEach((el, i) => {
      el.style.transitionDelay = (i % 10) * 50 + "ms";
      requestAnimationFrame(() => el.classList.add("visivel"));
    });
  }
  FGA.montarFaixaAcervo = montarFaixaAcervo;

  /* ---------- Curiosidades ---------- */
  function montarCuriosidades(alvo) {
    if (!alvo) return;
    const grade = criar("div", { classe: "grade grade--3" });
    (FGA.curiosidades || []).forEach((c) => {
      grade.append(
        criar("article", { classe: "curiosidade surgir" }, [
          criar("span", { classe: "curiosidade__icone", texto: c.icone, "aria-hidden": "true" }),
          criar("div", {}, [
            criar("h3", { classe: "curiosidade__titulo", texto: c.titulo }),
            criar("p", { classe: "curiosidade__texto", texto: c.texto }),
          ]),
        ])
      );
    });
    alvo.append(grade);
  }

  /* ---------- Widget: gerador de apelido MSN ---------- */
  const enfeites = [
    "★", "☆", "♥", "•°", "°•", "º°", "ツ", "♫", "♪", "☼", "❀", "✿", "→", "ツ", "εïз", "•́.•̀", "٭", "☁",
  ];
  const sufixos = [
    "no msn", "™", "®", "do barulho", "em 56k", "do Aqua", "┌∩┐", "vmk", "♥~", "(¬_¬)", "ツ",
  ];

  function montarGeradorApelido(alvo) {
    if (!alvo) return;
    const campo = criar("input", {
      classe: "chat__campo",
      type: "text",
      placeholder: "seu nome (ex.: Ana)",
      "aria-label": "Nome para o apelido",
      maxlength: "28",
    });
    const saida = criar("p", {
      classe: "trivia__enunciado",
      style: "min-height:2.6em; font-family:var(--fonte-mono); font-size:1.02rem",
      texto: "★•°•.¸ ツ",
    });
    const botao = criar("button", { classe: "botao botao--pequeno botao--verde", type: "button", texto: "Gerar apelido" });

    function gerar() {
      const nome = (campo.value || "você").trim().slice(0, 28);
      const a = escolher(enfeites);
      const b = escolher(enfeites);
      const meio = Math.random() < 0.5 ? nome.toUpperCase() : nome;
      const sufixo = Math.random() < 0.6 ? " " + escolher(sufixos) : "";
      saida.textContent = `${a}${b} ${meio}${sufixo} ${b}${a}`;
      FGA.audio && FGA.audio.sfx("estrela");
    }
    botao.addEventListener("click", gerar);
    campo.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        gerar();
      }
    });
    alvo.append(
      criar("div", { classe: "empilhado" }, [campo, botao]),
      saida,
      criar("p", {
        classe: "dica-uso",
        texto: "Dica: quanto mais caracteres especiais, mais autêntico era o apelido de 2006.",
      })
    );
  }

  /* ---------- Widget: sorteio de wallpaper ---------- */
  function montarSorteioWallpaper(alvo) {
    if (!alvo) return;
    const moldura = criar("div", { classe: "galeria__moldura", style: "aspect-ratio:16/9; border-radius:14px" });
    const legenda = criar("p", { classe: "dica-uso" });
    const acoes = criar("div", { classe: "empilhado" });
    const sortear = criar("button", { classe: "botao botao--pequeno botao--ciano", type: "button", texto: "🎲 Sortear papel de parede" });
    const usar = criar("a", { classe: "botao botao--pequeno botao--verde", texto: "⤓ Baixar original", target: "_blank", rel: "noopener" });

    function novo() {
      const rel = FGA.imagem.sprite("skyboxes", inteiro(0, 999));
      if (!rel) {
        legenda.textContent = "Nenhum céu disponível no acervo local.";
        return;
      }
      moldura.innerHTML = "";
      moldura.append(FGA.imagem.tag(rel, { classe: "galeria__imagem", alt: FGA.imagem.nome(rel), lazy: false }));
      legenda.textContent = "Cenário sorteado: " + rel.split("/").pop() + " — clique para aplicar ao site.";
      usar.href = FGA.repo.raw + rel;
      moldura.onclick = () => {
        const lista = FGA.imagem.lista("skyboxes");
        FGA.cenario.aplicar(lista.indexOf(rel), true);
      };
      FGA.audio && FGA.audio.sfx("respingo");
    }
    sortear.addEventListener("click", novo);
    acoes.append(sortear, usar);
    alvo.append(moldura, legenda, acoes);
    novo();
  }

  /* ---------- Hub de jogos ---------- */
  function montarJogos(alvo) {
    if (!alvo) return;
    const grade = criar("div", { classe: "grade grade--3" });
    (FGA.jogos || []).forEach((jogo, i) => {
      const palco = criar("div", { classe: "cartao-jogo__palco" });
      const sprite = FGA.imagem.sprite(jogo.sprite, i * 3 + 1);
      if (sprite) palco.append(FGA.imagem.tag(sprite, { deco: true, alt: "" }));
      for (let b = 0; b < 4; b++) {
        const bolha = criar("span", { classe: "cartao-jogo__bolha", "aria-hidden": "true" });
        bolha.style.cssText = `width:${inteiro(10, 26)}px;height:${inteiro(10, 26)}px;left:${inteiro(6, 88)}%;animation-delay:${(b * 1.6).toFixed(1)}s`;
        palco.append(bolha);
      }
      const recorde = FGA.recorde.ler(jogo.id);
      grade.append(
        criar("article", { classe: "cartao cartao-jogo surgir" }, [
          palco,
          criar("div", { classe: "cartao-jogo__texto" }, [
            criar("span", { classe: "cartao-jogo__etiqueta", texto: jogo.etiqueta }),
            criar("h3", { texto: jogo.titulo }),
            criar("p", { texto: jogo.resumo, style: "font-size:.93rem;margin-bottom:.3rem" }),
            criar("p", { classe: "dica-uso", html: "<strong>Como jogar:</strong> " + jogo.como }),
            criar("div", { classe: "empilhado" }, [
              criar("a", { classe: "botao botao--pequeno", href: jogo.rota, texto: "▶ Jogar agora" }),
              recorde ? criar("span", { classe: "recorde-chip", texto: "🏆 Recorde: " + recorde.toLocaleString("pt-BR") }) : null,
            ]),
          ]),
        ])
      );
    });
    alvo.append(grade);
  }

  /* ---------- Créditos ---------- */
  function montarCreditos(alvo) {
    if (!alvo || !FGA.creditos) return;
    const c = FGA.creditos;
    const grade = criar("div", { classe: "grade grade--2" });
    c.fontes.forEach((f) => {
      grade.append(
        criar("article", { classe: "cartao surgir" }, [
          criar("span", { classe: "cartao__rotulo", texto: "fonte" }),
          criar("h3", {}, [criar("a", { href: f.url, target: "_blank", rel: "noopener", texto: f.nome })]),
          criar("p", { texto: f.o, style: "font-size:.93rem;margin:0" }),
        ])
      );
    });
    alvo.append(grade);
  }

  /* ---------- Tabela de categorias (galeria.html) ---------- */
  function montarTabelaCategorias(alvo) {
    if (!alvo) return;
    (FGA.categorias || []).forEach((c) => {
      const tr = criar("tr");
      tr.append(
        criar("th", { scope: "row", html: `${c.icone} ${c.rotulo}` }),
        criar("td", { texto: c.local ? c.local + " imagens" : "—" }),
        criar("td", { texto: c.total + " arquivos" }),
        criar("td", { texto: c.descricao })
      );
      alvo.append(tr);
    });
  }

  /* ---------- Painel de recordes (jogos.html) ---------- */
  const LISTA_JOGOS = ["bolhas", "voo", "memoria", "trivia"];

  function montarPainelRecordes(alvo) {
    if (!alvo) return;
    const desenhar = () => {
      alvo.innerHTML = "";
      let algum = false;
      LISTA_JOGOS.forEach((id) => {
        const jogo = (FGA.jogos || []).find((j) => j.id === id);
        const pontos = FGA.recorde.ler(id);
        if (!pontos) return;
        algum = true;
        alvo.append(
          criar("li", {}, [
            criar("span", { html: `<a href="${jogo ? jogo.rota : '#'}">${jogo ? jogo.titulo : id}</a>` }),
            criar("span", { classe: "recordes__pontos", texto: pontos.toLocaleString("pt-BR") }),
          ])
        );
      });
      const memoriaMov = FGA.armazem.ler("memoriaNivel", null);
      if (memoriaMov) {
        alvo.append(criar("li", {}, [
          criar("span", { texto: "Nível salvo na memória: " + memoriaMov }),
          criar("span", { classe: "recordes__pontos", texto: "🎚️" }),
        ]));
      }
      if (!algum)
        alvo.append(criar("li", {}, [criar("span", { texto: "Nenhum recorde ainda — jogue uma rodada para inaugurar o quadro." })]));
    };
    desenhar();
    const limpar = $("#botaoLimparRecordes");
    if (limpar)
      limpar.addEventListener("click", () => {
        LISTA_JOGOS.forEach((id) => {
          FGA.armazem.limpar("recorde:" + id);
          FGA.armazem.limpar("tabela:" + id);
        });
        FGA.armazem.limpar("memoriaNivel");
        desenhar();
        FGA.toast("Recordes apagados", "O quadro voltou a ficar vazio.", "bom");
        FGA.audio && FGA.audio.sfx("clique");
      });
  }

  /* ---------- Inicialização por página ---------- */
  function iniciarPagina() {
    FGA.iniciar();
    const revelarAgora = () => FGA.prepararRevelacoes && FGA.prepararRevelacoes();

    const pagina = document.body.dataset.pagina;

    montarLinhaDoTempo($("#linhaDoTempo"));
    revelarAgora();
    if ($("#curiosidadesGrade")) { montarCuriosidades($("#curiosidadesGrade")); revelarAgora(); }
    if ($("#chatBot")) FGA.montarChat($("#chatBot"));
    if ($("#geradorApelido")) montarGeradorApelido($("#geradorApelido"));
    if ($("#sorteioWallpaper")) montarSorteioWallpaper($("#sorteioWallpaper"));
    if ($("#jogosGrade")) { montarJogos($("#jogosGrade")); revelarAgora(); }
    if ($("#creditosFontes")) { montarCreditos($("#creditosFontes")); revelarAgora(); }
    if ($("#tabelaCategorias")) montarTabelaCategorias($("#tabelaCategorias"));
    if ($("#recordesPainel")) montarPainelRecordes($("#recordesPainel"));

    const botaoTamanho = $("#botaoTamanho");
    const gradePrincipal = $("#galeria .galeria") || $(".galeria");
    if (botaoTamanho && gradePrincipal) {
      botaoTamanho.addEventListener("click", () => {
        const grande = !gradePrincipal.classList.contains("galeria--grande");
        gradePrincipal.classList.toggle("galeria--grande", grande);
        botaoTamanho.setAttribute("aria-pressed", String(grande));
        botaoTamanho.textContent = grande ? "🔍 Voltar ao tamanho normal" : "🔍 Alternar tamanho das miniaturas";
        FGA.audio && FGA.audio.sfx("clique");
      });
    }

    const galeria = $("#galeria");
    if (galeria) montarGaleria(galeria, { limite: Number(galeria.dataset.limite) || 24 });

    const faixa = $("#faixaAcervo");
    if (faixa) montarFaixaAcervo(faixa, Number(faixa.dataset.quantidade) || 10);

    const player = $("#areaPlayer");
    if (player) FGA.montarPlayer(player);

    // navegação do lightbox por teclado
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") FGA.proximaImagem(1);
      if (e.key === "ArrowLeft") FGA.proximaImagem(-1);
    });

    // botão de curiosidade no topo de curiosidades.html
    const botaoCuriosidade = $("#botaoCuriosidade");
    if (botaoCuriosidade) {
      botaoCuriosidade.addEventListener("click", () => {
        const c = escolher(FGA.curiosidades || []);
        const caixa = $("#curiosidadeDestaque");
        if (caixa && c) {
          caixa.innerHTML = "";
          caixa.append(
            criar("article", { classe: "curiosidade" }, [
              criar("span", { classe: "curiosidade__icone", texto: c.icone, "aria-hidden": "true" }),
              criar("div", {}, [
                criar("h3", { classe: "curiosidade__titulo", texto: c.titulo }),
                criar("p", { classe: "curiosidade__texto", texto: c.texto }),
              ]),
            ])
          );
        }
        FGA.audio && FGA.audio.sfx("estrela");
      });
    }

    // destaque inicial de curiosidade
    const destaque = $("#curiosidadeDestaque");
    if (destaque && !destaque.children.length) {
      const c = escolher(FGA.curiosidades || []);
      if (c) {
        destaque.append(
          criar("article", { classe: "curiosidade" }, [
            criar("span", { classe: "curiosidade__icone", texto: c.icone, "aria-hidden": "true" }),
            criar("div", {}, [
              criar("h3", { classe: "curiosidade__titulo", texto: c.titulo }),
              criar("p", { classe: "curiosidade__texto", texto: c.texto }),
            ]),
          ])
        );
      }
    }

    // herói: sprites flutuantes (funciona em <img> ou em qualquer wrapper)
    $$("[data-sprite]").forEach((el, i) => {
      const rel = FGA.imagem.sprite(el.dataset.sprite, i + inteiro(1, 7));
      if (!rel) return;
      if (el.tagName === "IMG") {
        const src = FGA.imagem.url(rel);
        el.addEventListener("error", () => {
          el.style.visibility = "hidden";
          el.dataset.falhou = "1";
        });
        el.src = src;
        if (!el.alt) el.alt = "";
        el.dataset.caminho = rel;
        return;
      }
      el.append(FGA.imagem.tag(rel, { deco: true, alt: "", lazy: false }));
    });

    revelarAgora();
    document.dispatchEvent(new CustomEvent("fga:pagina", { detail: { pagina } }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarPagina);
  else iniciarPagina();
})();
