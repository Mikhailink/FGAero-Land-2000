/* ==========================================================================
   FGAero Land 2000 — icones.js
   Biblioteca de ícones do site: usa os arquivos .ico originais do Windows
   Vista (pasta imagens/winVista), convertidos para PNG por
   tools/gerar_icones.py.

   Como usar:
     FGA.icones.html("jogos")          → string <img ...> para template
     FGA.icones.el("jogos")            → elemento <img> pronto
     FGA.icones.url("jogos")           → caminho do PNG
   Todos aceitam classe extra: FGA.icones.html("jogos", "ico--botao").
   ========================================================================== */
window.FGA = window.FGA || {};

FGA.icones = {
  base: "imagens/winVista/png/",

  /* chave semântica -> arquivo do Windows Vista (sem extensão) */
  mapa: {
    inicio: "vista_white",           /* bandeira do Windows */
    historia: "vista_book_3",        /* livro com caneta */
    galeria: "vista_photo_gallery",
    jogos: "vista_console",          /* PC + controle de videogame */
    curiosidades: "vista_info",
    creditos: "vista_book_2",
    som: "vista_movie",              /* mídia/áudio */
    musica: "vista_movie",
    cenario: "vista_personalization",/* área de trabalho com pincel */
    retro: "vista_pc_1",             /* monitor antigo */
    calmo: "vista_sidebar_1",        /* barra lateral com gadgets */
    topo: "vista_get_started",       /* seta de início */
    chat: "vista_messenger",
    aviso: "vista_warning",
    sucesso: "vista_firewall_status_1", /* escudo verde */
    erro: "vista_firewall_status_2",    /* escudo vermelho */
    busca: "vista_search_globe",
    acessivel: "vista_accessibility",
    seguranca: "vista_firewall_2",
    mundo: "vista_netcenter",        /* globo */
    quadro: "vista_collab",          /* quadro de colaboração */
    tempo: "vista_cal_1",
    estudo: "vista_book_1",
    xbox: "vista_xbox",
    desempenho: "vista_perf_center",
    loja: "vista_marketplace",
    mercado: "vista_marketplace",
    laptop: "vista_pc_2",
    notas: "vista_sticky_notes",
    bancada: "vista_bench",
    janela: "vista_sidebar_2",
    firewall: "vista_firewall_1",
    firewall3: "vista_firewall_status_3",
  },

  /* aceita "classe" como string ou { classe } para compatibilidade */
  _classe(valor) {
    if (!valor) return "";
    if (typeof valor === "string") return valor;
    return valor.classe || "";
  },

  url(chave) {
    const arquivo = this.mapa[chave];
    return arquivo ? this.base + arquivo + ".png" : null;
  },

  /* devolve a string HTML pronta para usar em template literals */
  html(chave, classe) {
    const url = this.url(chave);
    if (!url) return "";
    const extra = this._classe(classe);
    const classes = "ico" + (extra ? " " + extra : "");
    return `<img class="${classes}" src="${url}" alt="" aria-hidden="true" decoding="async">`;
  },

  /* devolve um elemento <img> (usado pelo JS que monta o DOM) */
  el(chave, classe) {
    const url = this.url(chave);
    if (!url) return document.createTextNode("");
    const extra = this._classe(classe);
    const img = document.createElement("img");
    img.className = "ico" + (extra ? " " + extra : "");
    img.src = url;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.decoding = "async";
    return img;
  },

  /* atalho: ícone + rótulo dentro de um fragmento (para botões) */
  comTexto(chave, classe, texto) {
    const frag = document.createDocumentFragment();
    frag.append(this.el(chave, classe));
    const span = document.createElement("span");
    span.textContent = texto;
    frag.append(span);
    return frag;
  },
};
