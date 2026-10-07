#!/usr/bin/env node
/**
 * FGAero Land 2000 — conferência no navegador
 * ------------------------------------------------------------------
 * Abre o site num Chromium de verdade e verifica o que está publicado:
 * páginas, ícones do Windows Vista, galeria, as 4 trilhas (YouTube + MP3
 * da pasta music/), chat do AeroBot, os 5 minigames, os tamanhos dos
 * canvases e o layout no celular.
 *
 * Como rodar:
 *   npm i -D playwright && npx playwright install chromium
 *   python3 tools/servidor.py 8080        (noutro terminal)
 *   node tools/teste-navegador.js
 *
 * Variáveis: BASE (padrão http://127.0.0.1:8080) e SCREENSHOTS=1 para
 * salvar as capturas em ./capturas.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE || "http://127.0.0.1:8080/";
const CAPTURAS = process.env.SCREENSHOTS === "1" ? path.join(process.cwd(), "capturas") : null;
const PAGINAS = [
  "index.html",
  "historia.html",
  "galeria.html",
  "jogos.html",
  "curiosidades.html",
  "creditos.html",
  "404.html",
  "jogo-bolhas.html",
  "jogo-aquario.html",
  "jogo-voo.html",
  "jogo-memoria.html",
  "jogo-trivia.html",
];
const RE_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu;

let falhas = 0;
const problemas = [];

function registrar(rotulo, ok, detalhe) {
  console.log(`${ok ? "  ok  " : " FALHA"} ${rotulo}${detalhe ? " — " + detalhe : ""}`);
  if (!ok) {
    falhas++;
    problemas.push(rotulo + (detalhe ? ": " + detalhe : ""));
  }
}

async function abrir(browser, caminho, opcoes = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opcoes));
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push("ERRO JS: " + String(e).split("\n")[0].slice(0, 140)));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !/Unrecognized feature|No available adapters|net::ERR|Failed to load resource/i.test(t))
      erros.push("CONSOLE: " + t.slice(0, 140));
  });
  page.on("response", (r) => {
    const u = r.url();
    const externo = /youtube\.com|ytimg\.com|raw\.githubusercontent\.com/.test(u);
    /* 404 em music/: é a sondagem da trilha offline quando a faixa ainda não
       tem arquivo na pasta — comportamento esperado, não é erro */
    const sondagem = /\/music\//.test(u);
    if (r.status() >= 400 && !externo && !sondagem) erros.push(r.status() + " " + u.replace(BASE, ""));
  });
  await page.goto(BASE + caminho, { waitUntil: "load" });
  await page.waitForTimeout(1400);
  return { ctx, page, erros };
}

(async () => {
  if (CAPTURAS) fs.mkdirSync(CAPTURAS, { recursive: true });
  const browser = await chromium.launch();

  /* ---------------------------------------------- 1. páginas e ícones */
  console.log("\n== 1. Páginas, ícones do Vista, imagens e erros ==");
  for (const caminho of PAGINAS) {
    const { ctx, page, erros } = await abrir(browser, caminho);
    const dados = await page.evaluate((fonte) => {
      const re = new RegExp(fonte, "gu");
      const imgs = Array.from(document.querySelectorAll("img"));
      const vista = imgs.filter((i) => i.src.includes("/winVista/"));
      /* imagens com loading="lazy" fora da tela ainda não carregaram: não
         contam como quebradas (só as que falharam de verdade) */
      const falhou = (i) => (!i.complete || i.naturalWidth === 0) && !(i.loading === "lazy" && i.getBoundingClientRect().top > window.innerHeight);
      return {
        titulo: document.title,
        icones: vista.length,
        icoQuebrados: vista.filter(falhou).map((i) => i.src.split("/").pop()),
        imgQuebradas: imgs.filter(falhou).length,
        emoji: (document.body.innerText.match(re) || []).join(""),
      };
    }, RE_EMOJI.source);
    registrar(
      `${caminho.padEnd(20)} "${dados.titulo.slice(0, 32)}"`,
      erros.length === 0 && dados.icoQuebrados.length === 0 && dados.imgQuebradas === 0 && !dados.emoji && dados.icones > 0,
      [
        erros.slice(0, 2).join(" | "),
        dados.icoQuebrados.length ? "ícones quebrados: " + dados.icoQuebrados.join(",") : "",
        dados.imgQuebradas ? `imagens quebradas: ${dados.imgQuebradas}` : "",
        dados.emoji ? "emoji: " + dados.emoji : "",
        `ícones do Vista=${dados.icones}`,
      ]
        .filter(Boolean)
        .join(" ")
    );
    await ctx.close();
  }

  /* ---------------------------------------------- 2. galeria */
  console.log("\n== 2. Galeria: filtros, miniaturas, lightbox ==");
  {
    const { ctx, page, erros } = await abrir(browser, "galeria.html");
    const total = (await page.locator(".filtro").first().textContent()).trim();
    registrar("filtro 'Todas' com 171", /171/.test(total), total);
    await page.locator(".filtro").nth(3).click();
    await page.waitForTimeout(700);
    const depois = await page.locator(".galeria__item img").count();
    const rotulo = (await page.locator(".filtro").nth(3).textContent()).trim();
    registrar("filtro troca a grade", depois > 0, `${rotulo} → ${depois} miniaturas`);
    await page.locator(".filtro").first().click();
    await page.waitForTimeout(600);
    const quebradas = await page.evaluate(() => Array.from(document.querySelectorAll(".galeria__item img")).filter((i) => !i.complete || i.naturalWidth === 0).length);
    registrar("nenhuma miniatura quebrada", quebradas === 0, String(quebradas));
    await page.locator(".galeria__item").first().click();
    await page.waitForTimeout(900);
    const caixa = await page.evaluate(() => {
      const lb = document.querySelector(".lightbox");
      const img = lb?.querySelector(".lightbox__imagem");
      const botoes = Array.from(lb?.querySelectorAll(".botao, .janela__botao") || []);
      return { aberto: lb?.classList.contains("aberto") || false, largura: img?.naturalWidth || 0, comIcone: botoes.filter((b) => b.querySelector("img.ico")).length };
    });
    registrar("lightbox abre com a imagem e ícones", caixa.aberto && caixa.largura > 0 && caixa.comIcone > 0, JSON.stringify(caixa));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    registrar("Esc fecha o lightbox", !(await page.evaluate(() => document.querySelector(".lightbox")?.classList.contains("aberto"))));
    registrar("galeria sem erros", erros.length === 0, erros.slice(0, 2).join(" | "));
    if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, "galeria.png") });
    await ctx.close();
  }

  /* ---------------------------------------------- 3. música */
  console.log("\n== 3. Música: 4 trilhas, embed e MP3 da pasta music/ ==");
  {
    const { ctx, page, erros } = await abrir(browser, "index.html");
    const lista = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".yt__faixa-texto strong")).map((e) => e.textContent.trim().slice(0, 42))
    );
    registrar("4 trilhas listadas no player", lista.length === 4, lista.join(" | "));
    const capa = await page.evaluate(() => {
      const c = document.querySelector(".yt__capa");
      return { src: c?.getAttribute("src"), ok: !!c && c.complete && c.naturalWidth > 0 };
    });
    registrar("capa do player carregada (miniatura ou céu do acervo)", capa.ok, capa.src);

    await page.locator(".yt__faixa").nth(3).click();
    await page.waitForTimeout(2500);
    const trocada = await page.evaluate(() => ({
      faixa: window.FGA?.musicaYT?.faixaAtual,
      marcada: document.querySelector('.yt__faixa[aria-checked="true"] strong')?.textContent.trim().slice(0, 32),
    }));
    registrar("troca de trilha (4ª da lista)", trocada.faixa === "Scw_anb0oig", JSON.stringify(trocada));

    await page.locator(".yt__faixa").first().click();
    await page.waitForTimeout(1000);
    await page.locator(".yt .botao", { hasText: "Ouvir do arquivo" }).first().click();
    await page.waitForTimeout(3500);
    const mp3 = await page.evaluate(() => ({
      tocando: window.FGA?.musicaMP3?.tocando,
      faixa: window.FGA?.musicaMP3?.faixaId,
      duracao: Math.round(window.FGA?.musicaMP3?.el?.duration || 0),
      selo: document.querySelector(".yt__selo")?.textContent,
    }));
    registrar("MP3 local (music/) toca sem embed", mp3.tocando === true && mp3.duracao > 60, JSON.stringify(mp3));

    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll(".dock__botao")).find((x) => /música|trilha/i.test(x.getAttribute("title") || x.textContent));
      if (b) b.click();
    });
    await page.waitForTimeout(1200);
    const janela = await page.evaluate(() => {
      const j = document.querySelector(".janela--flutuante");
      return { existe: !!j, titulo: j?.querySelector(".janela__titulo")?.textContent?.trim(), faixas: j?.querySelectorAll(".yt__faixa").length || 0 };
    });
    registrar("janela Aero Player 2000 com a mesma lista", janela.existe && janela.faixas === 4, JSON.stringify(janela));
    await page.locator("#janelaMusica .yt__faixa").nth(1).click();
    await page.waitForTimeout(2600);
    const dois = await page.evaluate(() => ({
      alvos: Array.from(document.querySelectorAll("[id^='ytAlvo']")).map((e) => e.id),
      emUso: window.FGA?.musicaYT?.alvoEmUsoId,
      faixa: window.FGA?.musicaYT?.faixaAtual,
    }));
    registrar("2º player assume o alvo com a trilha escolhida", dois.alvos.length === 2 && dois.emUso !== "ytAlvo1" && dois.faixa === "hDmC3gc3A0E", JSON.stringify(dois));
    registrar("home sem erros", erros.length === 0, erros.slice(0, 2).join(" | "));
    if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, "index.png") });
    await ctx.close();
  }

  /* ---------------------------------------------- 4. chat */
  console.log("\n== 4. AeroBot ==");
  {
    const { ctx, page, erros } = await abrir(browser, "curiosidades.html");
    await page.locator("#chatBot .chat__campo").fill("o que é frutiger aero?");
    await page.locator("#chatBot .chat__enviar, #chatBot button[type=submit]").first().click();
    await page.waitForTimeout(1500);
    const chat = await page.evaluate(() => {
      const baloes = Array.from(document.querySelectorAll("#chatBot .balao"));
      return {
        baloes: baloes.length,
        icones: document.querySelectorAll("#chatBot .balao img.ico").length,
        quebrados: Array.from(document.querySelectorAll("#chatBot img")).filter((i) => !i.complete || i.naturalWidth === 0).length,
        resposta: (baloes[baloes.length - 1]?.textContent || "").replace(/\s+/g, " ").slice(0, 80),
      };
    });
    registrar("responde com ícones do Vista", chat.baloes >= 3 && chat.icones > 0 && chat.quebrados === 0, JSON.stringify(chat).slice(0, 140));
    registrar("curiosidades sem erros", erros.length === 0, erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ---------------------------------------------- 5. minigames */
  console.log("\n== 5. Minigames: sobreposição inteira, começam e contam ==");
  for (const [arquivo, seletor] of [
    ["jogo-bolhas.html", "#palcoBolhas"],
    ["jogo-aquario.html", "#palcoAquario"],
    ["jogo-voo.html", "#palcoVoo"],
    ["jogo-memoria.html", "#tabuleiroMemoria"],
    ["jogo-trivia.html", ".trivia"],
  ]) {
    const { ctx, page, erros } = await abrir(browser, arquivo);
    /* o Aquário é jogo de criação de cena: não tem tela de "começar" */
    const ehAquario = /aquario/.test(arquivo);
    if (ehAquario) {
      const itens = await page.locator(".seletor-itens__botao").count();
      const quadro = await page.evaluate(() => document.querySelector("#palcoAquario").toDataURL("image/png").length);
      registrar(`${arquivo.padEnd(19)} editor de cena`, itens > 100 && quadro > 20000 && erros.length === 0, `itens no seletor=${itens} | quadro desenhado=${Math.round(quadro / 1024)} KB | ${erros.slice(0, 1).join("")}`);
      if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, "jogo-aquario.png") });
      await ctx.close();
      continue;
    }
    const corte = await page.evaluate(() => {
      const s = document.querySelector(".sobreposicao");
      const c = s?.querySelector(".sobreposicao__caixa");
      if (!s || !c) return "sem sobreposição";
      const rs = s.getBoundingClientRect();
      const rc = c.getBoundingClientRect();
      const dentro = rc.top >= rs.top - 1 && rc.bottom <= rs.bottom + 1 && rc.left >= rs.left - 1 && rc.right <= rs.right + 1;
      return dentro ? "caixa inteira visível" : `cortada (${Math.round(rc.top)}..${Math.round(rc.bottom)} / ${Math.round(rs.top)}..${Math.round(rs.bottom)})`;
    });
    const botao = page.locator(".sobreposicao__acoes .botao").first();
    const temBotao = (await botao.count()) > 0;
    if (temBotao) {
      await botao.click();
      await page.waitForTimeout(3600);
    }
    const estado = await page.evaluate(() => {
      const hud = {};
      document.querySelectorAll("[data-hud]").forEach((e) => (hud[e.dataset.hud] = e.textContent.trim()));
      const canvas = document.querySelector(".palco-jogo canvas");
      const r = canvas ? canvas.getBoundingClientRect() : null;
      return {
        hud,
        comecou: document.querySelector(".sobreposicao")?.hidden === true,
        canvas: r ? Math.round(r.width) + "x" + Math.round(r.height) + " razão " + (r.width / r.height).toFixed(2) : "—",
      };
    });
    registrar(`${arquivo.padEnd(19)} ${seletor}`, /visível/.test(corte) && (temBotao ? estado.comecou : true) && erros.length === 0, `${corte} | hud=${JSON.stringify(estado.hud).slice(0, 60)} | canvas=${estado.canvas} | ${erros.slice(0, 1).join("")}`);
    await ctx.close();
  }

  /* ---------------------------------------------- 6. celular */
  console.log("\n== 6. Responsivo: 390x844 (celular) ==");
  for (const caminho of ["index.html", "galeria.html", "jogos.html", "jogo-aquario.html", "jogo-voo.html"]) {
    const { ctx, page, erros } = await abrir(browser, caminho, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const info = await page.evaluate(() => {
      const canvas = document.querySelector(".palco-jogo canvas");
      const r = canvas ? canvas.getBoundingClientRect() : null;
      return {
        sobra: document.documentElement.scrollWidth - window.innerWidth,
        hamburguer: !!document.querySelector(".menu__barras"),
        canvas: r ? Math.round(r.width) + "x" + Math.round(r.height) + " (razão " + (r.width / r.height).toFixed(2) + ")" : "—",
      };
    });
    registrar(`${caminho.padEnd(19)} sem rolagem lateral`, info.sobra <= 2 && erros.length === 0, `sobra ${info.sobra}px | hambúrguer=${info.hamburguer} | canvas=${info.canvas}`);
    if (CAPTURAS && caminho === "index.html") await page.screenshot({ path: path.join(CAPTURAS, "celular.png") });
    await ctx.close();
  }

  await browser.close();
  console.log(falhas ? `\n>>> ${falhas} FALHA(S)` : "\n>>> TUDO OK");
  if (problemas.length) console.log(problemas.slice(0, 10).join("\n"));
  process.exit(falhas ? 1 : 0);
})();
