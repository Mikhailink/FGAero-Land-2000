#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera as paginas HTML do FGAero Land 2000 a partir de um modelo unico.

Uso:  python3 tools/gerar_paginas.py
Saida: index.html, historia.html, galeria.html, jogos.html, curiosidades.html,
       creditos.html, 404.html e as 5 paginas de minigame.
"""
import os
import re, re

RAIZ = "/home/user"
SITE = "FGAero Land 2000"

NAV = [
    ("index.html", "Início", "inicio"),
    ("historia.html", "História", "historia"),
    ("galeria.html", "Galeria", "galeria"),
    ("jogos.html", "Jogos", "jogos"),
    ("curiosidades.html", "Curiosidades", "curiosidades"),
    ("creditos.html", "Créditos", "creditos"),
]

# mapa de icones do Windows Vista (arquivos em imagens/winVista/png)
ICONES = {
    "inicio": "vista_white",
    "historia": "vista_book_3",
    "galeria": "vista_photo_gallery",
    "jogos": "vista_console",
    "curiosidades": "vista_info",
    "creditos": "vista_book_2",
    "som": "vista_movie",
    "musica": "vista_movie",
    "cenario": "vista_personalization",
    "retro": "vista_pc_1",
    "calmo": "vista_sidebar_1",
    "topo": "vista_get_started",
    "chat": "vista_messenger",
    "aviso": "vista_warning",
    "sucesso": "vista_firewall_status_1",
    "erro": "vista_firewall_status_2",
    "busca": "vista_search_globe",
    "acessivel": "vista_accessibility",
    "mundo": "vista_netcenter",
    "quadro": "vista_collab",
    "tempo": "vista_cal_1",
    "estudo": "vista_book_1",
    "xbox": "vista_xbox",
    "desempenho": "vista_perf_center",
    "mercado": "vista_marketplace",
    "laptop": "vista_pc_2",
    "notas": "vista_sticky_notes",
}


_TOKEN_ICO = re.compile(r"%%ico:([a-z0-9_]+)(?::([a-z0-9_\-]+))?%%")


def aplicar_icones(texto):
    """Troca os marcadores %%ico:chave:classe%% pelas imagens do Windows Vista."""
    return _TOKEN_ICO.sub(lambda m: ico(m.group(1), m.group(2) or ""), texto)


def ico(chave, classe="", alt=""):
    """Devolve a tag <img> de um icone do Windows Vista."""
    arquivo = ICONES.get(chave)
    if not arquivo:
        return ""
    classes = ("ico " + classe).strip()
    return f'<img class="{classes}" src="imagens/winVista/png/{arquivo}.png" alt="{alt}" aria-hidden="true" decoding="async">'


def botao(classe, href, chave_icone, rotulo, extra=""):
    """Botao/enlace com icone do Vista no lugar do emoji."""
    tag = "a" if href else "button"
    atributo = f'href="{href}"' if href else 'type="button"'
    return f'<{tag} class="{classe}" {atributo}{extra}>{ico(chave_icone, "ico--botao")}<span>{rotulo}</span></{tag}>'


FAVICON = (
    "data:image/svg+xml,"
    "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E"
    "%3Cdefs%3E%3CradialGradient id='a' cx='35%25' cy='28%25'%3E"
    "%3Cstop offset='0' stop-color='%23ffffff'/%3E%3Cstop offset='.55' stop-color='%238fd8ff'/%3E"
    "%3Cstop offset='1' stop-color='%232f86d0'/%3E%3C/radialGradient%3E"
    "%3ClinearGradient id='b' x1='0' y1='0' x2='0' y2='1'%3E"
    "%3Cstop offset='0' stop-color='%23eaffd0'/%3E%3Cstop offset='1' stop-color='%2379c346'/%3E"
    "%3C/linearGradient%3E%3C/defs%3E"
    "%3Ccircle cx='32' cy='32' r='30' fill='url(%23a)'/%3E"
    "%3Cpath d='M4 42c9-7 18-6 28-1s20 4 28-3v10A30 30 0 0 1 4 42z' fill='url(%23b)'/%3E"
    "%3Ccircle cx='32' cy='32' r='29' fill='none' stroke='%23ffffff' stroke-width='2' opacity='.85'/%3E"
    "%3C/svg%3E"
)

SELO = """<svg class="marca__selo" viewBox="0 0 64 64" role="img" aria-label="Selo do FGAero Land 2000">
        <defs>
          <radialGradient id="seloA" cx="34%" cy="26%" r="78%">
            <stop offset="0" stop-color="#ffffff"></stop>
            <stop offset="0.55" stop-color="#8fd8ff"></stop>
            <stop offset="1" stop-color="#2f86d0"></stop>
          </radialGradient>
          <linearGradient id="seloB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#eaffd0"></stop>
            <stop offset="1" stop-color="#79c346"></stop>
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#seloA)"></circle>
        <path d="M4 43c9-7 18-6 28-1s20 4 28-3v10A30 30 0 0 1 4 43z" fill="url(#seloB)" opacity="0.95"></path>
        <path d="M4 43c9-7 18-6 28-1s20 4 28-3" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.8"></path>
        <circle cx="32" cy="32" r="29" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.9"></circle>
        <circle cx="23" cy="20" r="6" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.75"></circle>
        <circle cx="41" cy="15" r="3.6" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.7"></circle>
      </svg>"""

CENARIO = """<div class="cenario" aria-hidden="true">
      <div class="cenario__ceu"></div>
      <div class="cenario__luz"></div>
      <div class="cenario__grao"></div>
    </div>
    <canvas id="bolhasFundo" aria-hidden="true"></canvas>
    <div class="blob blob--1" aria-hidden="true"></div>
    <div class="blob blob--2" aria-hidden="true"></div>
    <div class="blob blob--3" aria-hidden="true"></div>"""


def cabecalho(pagina, titulo, descricao, scripts_extra_css=(), scripts_extra_js=()):
    menu = "\n".join(
        f'          <a class="menu__link" href="{href}">{ico(chave, "ico--menu")}<span>{rotulo}</span></a>'
        for href, rotulo, chave in NAV
    )
    css = "\n".join(f'    <link rel="stylesheet" href="{c}">' for c in scripts_extra_css)
    js = "\n".join(f'    <script src="{s}"></script>' for s in scripts_extra_js)
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{titulo}</title>
    <meta name="description" content="{descricao}">
    <meta name="author" content="FGAero Land 2000">
    <meta name="theme-color" content="#8fd0ff">
    <meta name="color-scheme" content="light">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{titulo}">
    <meta property="og:description" content="{descricao}">
    <meta property="og:image" content="og-image.jpg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="FGAero Land 2000 — arquivo vivo do Frutiger Aero">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" href="{FAVICON}">
    <link rel="icon" type="image/png" sizes="192x192" href="icone-192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="icone-512.png">
    <link rel="apple-touch-icon" href="apple-touch-icon.png">
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="css/estilo.css">
    <link rel="stylesheet" href="css/aero.css">
{css}
    <meta name="format-detection" content="telephone=no">
  </head>
  <body data-pagina="{pagina}">
    <a class="pular-link" href="#conteudo">Ir para o conteúdo</a>
    {CENARIO}
    <header class="topo">
      <div class="topo__interno">
        <a class="marca" href="index.html">
          {SELO}
          <span class="marca__texto">
            <span class="marca__nome">FGAero Land 2000</span>
            <span class="marca__lema">arquivo vivo do Frutiger Aero</span>
          </span>
        </a>
        <button class="botao-icone menu__hamburguer" type="button" aria-expanded="false" aria-controls="menuPrincipal" aria-label="Abrir menu"><span class="menu__barras" aria-hidden="true"></span></button>
        <nav class="menu" id="menuPrincipal" aria-label="Navegação principal">
{menu}
        </nav>
        <div class="topo__acoes">
          <button class="botao-icone" id="botaoSom" type="button" title="Ligar ou pausar a trilha (atalho: M)" aria-label="Ligar ou pausar a trilha sonora">%%ico:som:ico--topo%%</button>
        </div>
      </div>
    </header>
    <main id="conteudo">
"""
RODAPE = """    </main>
    <footer class="rodape">
      <div class="container">
        <div class="rodape__grade">
          <div>
            <h3>FGAero Land 2000</h3>
            <p style="font-size:.92rem">
              Um arquivo vivo da estética Frutiger Aero (2004–2013): história, galeria com
              <strong>1.284 imagens</strong> catalogadas, cinco minigames e a internet brasileira
              dos anos 2000.
            </p>
            <p style="font-size:.86rem">
              Publicado no GitHub e hospedado na Vercel · HTML, CSS e JavaScript puros.
            </p>
          </div>
          <div>
            <h4>Navegar</h4>
            <ul class="rodape__lista">
              <li><a href="historia.html">História da estética</a></li>
              <li><a href="galeria.html">Galeria do acervo</a></li>
              <li><a href="jogos.html">Minigames</a></li>
              <li><a href="curiosidades.html">Curiosidades e linhas do tempo</a></li>
              <li><a href="creditos.html">Créditos e fontes</a></li>
            </ul>
          </div>
          <div>
            <h4>Acervo</h4>
            <ul class="rodape__lista">
              <li><a href="https://github.com/Mikhailink/FGAero-Land-2000" target="_blank" rel="noopener">github.com/Mikhailink/FGAero-Land-2000</a></li>
              <li><a href="https://frutigeraeroarchive.org" target="_blank" rel="noopener">frutigeraeroarchive.org</a></li>
              <li><a href="https://aesthetics.fandom.com/wiki/Frutiger_Aero" target="_blank" rel="noopener">Aesthetics Wiki · Frutiger Aero</a></li>
              <li><a href="https://cari.institute" target="_blank" rel="noopener">CARI — Consumer Aesthetics Research Institute</a></li>
            </ul>
          </div>
          <div>
            <h4>Atalhos</h4>
            <ul class="rodape__lista">
              <li><strong>M</strong> liga/pausa a música</li>
              <li><strong>C</strong> troca o cenário de céu</li>
              <li><strong>K</strong> abre uma curiosidade</li>
              <li><strong>← →</strong> navegam na galeria</li>
              <li><strong>P</strong> pausa os minigames</li>
            </ul>
          </div>
        </div>
        <div class="rodape__base">
          <span>© <span id="anoAtual">2026</span> FGAero Land 2000 · projeto editorial sem fins comerciais.</span>
          <span>Imagens do acervo Frutiger Aero Archive · créditos aos autores originais.</span>
          <span>Feito com vidro, bolhas e saudade.</span>
        </div>
      </div>
    </footer>
    <div class="dock" id="dock" role="toolbar" aria-label="Ferramentas do site"></div>
    <script src="js/acervo.js"></script>
    <script src="js/icones.js"></script>
    <script src="js/conteudo.js"></script>
    <script src="js/aero.js"></script>
    <script src="js/paginas.js"></script>
{EXTRA_JS}
    <script>document.getElementById("anoAtual") && (document.getElementById("anoAtual").textContent = new Date().getFullYear());</script>
  </body>
</html>
"""


def pagina(pagina, titulo, descricao, corpo, css=(), js=()):
    html = cabecalho(pagina, titulo, descricao, css, js) + corpo + RODAPE
    html = html.replace("{EXTRA_JS}", "\n".join(f'    <script src="{s}"></script>' for s in js))
    html = aplicar_icones(html)
    assert "%%ico:" not in html, "sobrou marcador de icone sem substituir"
    return html


def escrever(nome, conteudo):
    caminho = os.path.join(RAIZ, nome)
    with open(caminho, "w", encoding="utf-8") as fh:
        fh.write(conteudo)
    print("  gerado:", nome, f"({len(conteudo)//1024} KB)")


# ==========================================================================
# INDEX
# ==========================================================================
INDEX = """
      <section class="hero">
        <div class="container hero__grade">
          <div>
            <span class="sobretitulo">2004 — 2013 · e de volta agora</span>
            <h1 class="hero__titulo">
              FGAero Land 2000
              <span>o paraíso de vidro, bolhas e céu azul da internet</span>
            </h1>
            <p class="hero__texto">
              Bem-vindo ao arquivo vivo da estética <strong>Frutiger Aero</strong>: a era em que
              computadores, wallpapers e comerciais prometiam um futuro limpo, verde e banhado de
              luz. Aqui você navega por <strong>1.284 imagens catalogadas</strong>, joga minigames
              com a cara de 2008, ouve as trilhas de ambiência e lembra como era a internet antes
              do design chapado.
            </p>
            <div class="empilhado espaco-topo">
              <a class="botao botao--grande botao--verde" href="jogos.html">%%ico:jogos:ico--botao%%<span>Jogar os minigames</span></a>
              <a class="botao botao--grande" href="galeria.html">%%ico:galeria:ico--botao%%<span>Explorar a galeria</span></a>
              <a class="botao botao--grande botao--fantasma" href="historia.html">%%ico:historia:ico--botao%%<span>Ler a história</span></a>
            </div>
            <div class="hero__selos">
              <span class="selo">%%ico:cenario:ico--chip%%<span>Céus trocáveis</span></span>
              <span class="selo">%%ico:musica:ico--chip%%<span>Trilha de 2007 no YouTube</span></span>
              <span class="selo">%%ico:acessivel:ico--chip%%<span>Cursor do Windows Vista</span></span>
              <span class="selo">%%ico:inicio:ico--chip%%<span>Bolhas em tela cheia</span></span>
            </div>
          </div>
          <div class="hero__palco">
            <img class="hero__globo" data-sprite="globes" alt="Globo de vidro do acervo Frutiger Aero">
            <span class="hero__enfeite hero__enfeite--1" data-sprite="balloons"></span>
            <span class="hero__enfeite hero__enfeite--2" data-sprite="sealife"></span>
            <span class="hero__enfeite hero__enfeite--3" data-sprite="airplanes"></span>
            <span class="hero__enfeite hero__enfeite--4" data-sprite="bubbles"></span>
          </div>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container">
          <div class="indicadores">
            <div class="indicador surgir">
              <span class="indicador__numero" data-contar="1284">0</span>
              <span class="indicador__texto">imagens no acervo do repositório</span>
            </div>
            <div class="indicador surgir">
              <span class="indicador__numero" data-contar="19">0</span>
              <span class="indicador__texto">categorias catalogadas</span>
            </div>
            <div class="indicador surgir">
              <span class="indicador__numero" data-contar="5">0</span>
              <span class="indicador__texto">minigames no arcade Aero</span>
            </div>
            <div class="indicador surgir">
              <span class="indicador__numero" data-contar="4">0</span>
              <span class="indicador__texto">trilhas de ambiência Aero no player</span>
            </div>
            <div class="indicador surgir">
              <span class="indicador__numero" data-contar="13">0</span>
              <span class="indicador__texto">marcos na linha do tempo</span>
            </div>
            <div class="indicador surgir">
              <span class="indicador__numero" data-contar="16">0</span>
              <span class="indicador__texto">curiosidades dos anos 2000</span>
            </div>
          </div>
        </div>
      </section>

      <section class="secao" id="o-que-e">
        <div class="container duas-colunas">
          <div class="surgir">
            <span class="sobretitulo">o conceito</span>
            <h2>O que é Frutiger Aero?</h2>
            <p>
              Frutiger Aero é o nome dado ao visual que dominou o design entre
              <strong>2004 e 2013</strong>: janelas de vidro translúcido, brilhos de lente, nuvens
              recortadas, bolhas de sabão, peixes tropicais, grama com orvalho e a promessa
              publicitária de que a tecnologia era limpa, ecológica e otimista.
            </p>
            <p>
              O nome só apareceu em <strong>2017</strong>, quando <strong>Sofi Xian</strong>, do
              <em>Consumer Aesthetics Research Institute</em> (CARI), juntou duas referências: a
              família tipográfica criada por <strong>Adrian Frutiger</strong> e o
              <strong>Windows Aero</strong>, o tema translúcido do Windows Vista e do Windows 7 —
              cujo nome é um backronym: <em>Authentic, Energetic, Reflective, Open</em>.
            </p>
            <p>
              Na época, ninguém dizia "isso é Frutiger Aero". Dizia-se <em>Web 2.0 gloss</em> sobre
              os botões brilhantes, ou simplesmente "o wallpaper do meu monitor novo". O estilo era
              o ar que se respirava: por isso ele é reconhecido instantaneamente por quem viveu.
            </p>
            <div class="empilhado espaco-topo">
              <a class="botao botao--pequeno" href="historia.html">Ver a linha do tempo completa →</a>
              <a class="botao botao--pequeno botao--fantasma" href="https://aesthetics.fandom.com/wiki/Frutiger_Aero" target="_blank" rel="noopener">Definição na Aesthetics Wiki</a>
            </div>
          </div>
          <aside class="painel surgir">
            <h3>A paleta e os motivos</h3>
            <div class="empilhado" style="margin-bottom:1rem">
              <span class="selo" style="background:linear-gradient(180deg,#ffffff,#8fd0ff)">azul céu</span>
              <span class="selo" style="background:linear-gradient(180deg,#ffffff,#6fe3ff)">ciano vidro</span>
              <span class="selo" style="background:linear-gradient(180deg,#f4ffe4,#8fd94f)">verde grama</span>
              <span class="selo" style="background:linear-gradient(180deg,#ffffff,#e6f7ff)">branco brilho</span>
              <span class="selo" style="background:linear-gradient(180deg,#fff6cf,#ffd35e)">amarelo sol</span>
            </div>
            <ul class="lista-bolha">
              <li><strong>Vidro</strong> — transparência com desfoque (Aero Glass) em janelas, botões e ícones.</li>
              <li><strong>Água</strong> — gotas, respingos, ondulações e aquários digitais.</li>
              <li><strong>Natureza</strong> — céu limpo, grama, árvores, peixes tropicais, libélulas.</li>
              <li><strong>Luz</strong> — lens flare, bokeh, auroras, brilho diagonal nos logotipos.</li>
              <li><strong>Skeuomorfismo</strong> — o digital imitando o real: bloco de notas com papel, vidro com reflexo.</li>
              <li><strong>Tipografia</strong> — Frutiger e suas primas humanistas, sempre limpas.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container">
          <div class="secao__cabecalho secao__cabecalho--centro surgir">
            <span class="sobretitulo">família aero</span>
            <h2>Não é uma estética só: é uma família</h2>
            <p>
              O Frutiger Aero conviveu com primas próximas — cada uma com um sotaque próprio de
              vidro, gráfico ou natureza.
            </p>
          </div>
          <div class="grade grade--3">
            <article class="cartao surgir">
              <span class="cartao__rotulo">2002 — 2007</span>
              <h3>Y2K Futurism</h3>
              <p>O antecessor. Cromo, azul metálico, plástico transparente e a ansiedade otimista da virada do milênio. Deixou de herança o gosto pelo brilho.</p>
            </article>
            <article class="cartao surgir">
              <span class="cartao__rotulo">2005 — 2010</span>
              <h3>Frutiger Metro</h3>
              <p>A vertente urbana: silhuetas, grafismos chapados, cores saturadas, transporte público e gente em movimento. Está na pasta <code>metro</code> do acervo.</p>
            </article>
            <article class="cartao surgir">
              <span class="cartao__rotulo">2004 — 2012</span>
              <h3>Helvetica Aqua Aero</h3>
              <p>Foco em água, aquários e tipografia neutra. É o vocabulário dos teclados "à prova d'água" e dos monitores com peixes.</p>
            </article>
            <article class="cartao surgir">
              <span class="cartao__rotulo">2006 — 2013</span>
              <h3>Technozen</h3>
              <p>O lado zen e organizado: minimalismo macio, pedras empilhadas, fontes japonesas e beats calmos de lo-fi corporativo.</p>
            </article>
            <article class="cartao surgir">
              <span class="cartao__rotulo">2007 — 2013</span>
              <h3>Frutiger Eco</h3>
              <p>A versão ecológica explícita: energia limpa, folhas, moinhos e o discurso "verde" aplicado a logos e campanhas.</p>
            </article>
            <article class="cartao surgir">
              <span class="cartao__rotulo">2022 — hoje</span>
              <h3>Neo-Aero</h3>
              <p>O renascimento nostálgico no TikTok, no YouTube e em arquivos como este. O passado virou linguagem para falar do presente.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="secao">
        <div class="container">
          <div class="secao__cabecalho surgir">
            <span class="sobretitulo">acervo</span>
            <h2>Direto do arquivo para a sua tela</h2>
            <p>
              Todas as imagens seguem o padrão <code>pasta_numero.png</code> e ficam versionadas no
              repositório. A amostra abaixo é sorteada a cada visita — clique em qualquer uma para
              ampliar, ver o nome do arquivo e baixar o original.
            </p>
          </div>
          <div id="faixaAcervo" data-quantidade="10"></div>
        </div>
      </section>

      <section class="secao secao--escura">
        <div class="container">
          <div class="secao__cabecalho secao__cabecalho--centro surgir">
            <span class="sobretitulo" style="background:rgba(255,255,255,.2);color:#fff">arcade aero</span>
            <h2>Cinco minigames com acabamento em vidro</h2>
            <p>
              Estourar bolhas, decorar um aquário, voar por nuvens, achar pares e responder trivia.
              Todos rodam em JavaScript puro, salvam recordes no seu navegador e pausam sozinhos
              quando você sai da tela.
            </p>
          </div>
          <div class="grade grade--3">
            <article class="cartao cartao--destaque surgir">
              <span class="cartao__rotulo">60 segundos</span>
              <h3>Estoura-Bolhas Aero</h3>
              <p>Combo até x4, bolhas douradas que dão tempo extra e bolhas pesadas que custam pontos.</p>
              <p><a class="botao botao--pequeno botao--verde" href="jogo-bolhas.html">%%ico:jogos:ico--botao%%<span>Jogar</span></a></p>
            </article>
            <article class="cartao surgir">
              <span class="cartao__rotulo">criativo</span>
              <h3>Aquário 2000</h3>
              <p>Monte sua própria cena Aero sobrepondo peixes, balões e objetos do acervo — e exporte em PNG.</p>
              <p><a class="botao botao--pequeno" href="jogo-aquario.html">%%ico:cenario:ico--botao%%<span>Criar cena</span></a></p>
            </article>
            <article class="cartao surgir">
              <span class="cartao__rotulo">endless</span>
              <h3>Voo Aero</h3>
              <p>Pilote o planador, colete balões e desvie dos brilhos escuros em velocidade crescente.</p>
              <p><a class="botao botao--pequeno botao--ciano" href="jogo-voo.html">%%ico:mundo:ico--botao%%<span>Voar</span></a></p>
            </article>
          </div>
          <p class="centralizado espaco-topo">
            <a class="botao botao--grande" href="jogos.html">Ver os 5 jogos e os recordes →</a>
          </p>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container duas-colunas">
          <div class="surgir">
            <span class="sobretitulo">trilha sonora</span>
            <h2>Quatro trilhas para navegar</h2>
            <p>
              O player traz <strong>quatro faixas</strong> de ambiência Aero — de
              <strong>“HOME: 2007 Aero Ambience”</strong> (Focusyn Audio) a
              <strong>“A Brighter Age”</strong> (Dreamfibre) e à playlist
              <em>Somewhere in 2007</em>. Escolha na lista e a música toca pelo player oficial do
              YouTube, aqui dentro, sem baixar nada.
            </p>
            <p class="dica-uso">
              Aperte <strong>M</strong> (ou o botão do topo) para tocar e pausar. Se o embed do
              YouTube não iniciar (preview em sandbox, rede restrita), use
              <strong>“Ouvir do arquivo (music/)”</strong>: toca o MP3 gravado na pasta
              <code>music/</code> do projeto, sem internet. A aba <em>Sintetizado</em> continua ali
              para quem quiser música gerada na hora pela Web Audio API.
            </p>
            <div id="areaPlayer"></div>
          </div>
          <aside class="surgir">
            <div class="secao__cabecalho">
              <span class="sobretitulo">atalhos e ferramentas</span>
              <h3>O dock embaixo da tela</h3>
            </div>
            <ul class="lista-bolha">
              <li>%%ico:musica:ico--chip%% <strong>Trilha sonora</strong> — abre o player flutuante estilo Vista, com 4 faixas do YouTube e MP3 local.</li>
              <li>%%ico:curiosidades:ico--chip%% <strong>Curiosidade</strong> — a janela arrastável com um fato da época.</li>
              <li>%%ico:cenario:ico--chip%% <strong>Trocar cenário</strong> — sorteia outro céu do acervo (64 disponíveis no repositório).</li>
              <li>%%ico:retro:ico--chip%% <strong>Modo 2000</strong> — janelas sólidas, bordas duras, visual de 2002.</li>
              <li>%%ico:calmo:ico--chip%% <strong>Efeitos calmos</strong> — reduz animações e bolhas.</li>
              <li>%%ico:topo:ico--chip%% <strong>Topo</strong> — volta ao começo da página.</li>
            </ul>
            <div id="curiosidadeDestaque" class="espaco-topo"></div>
          </aside>
        </div>
      </section>
"""

# ==========================================================================
# HISTÓRIA
# ==========================================================================
HISTORIA = """
      <section class="hero">
        <div class="container">
          <span class="sobretitulo">linha do tempo</span>
          <h1 class="hero__titulo">
            A história de uma estética sem nome
            <span>de Bliss (1996) ao renascimento Neo-Aero (2022–hoje)</span>
          </h1>
          <p class="hero__texto">
            Treze marcos para entender como o vidro, as bolhas e o céu azul se tornaram a paisagem
            padrão da internet — e por que eles voltaram. Cada item traz as fontes consultadas.
          </p>
        </div>
      </section>

      <section class="secao">
        <div class="container">
          <div id="linhaDoTempo"></div>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container duas-colunas">
          <div class="surgir">
            <span class="sobretitulo">anatomia</span>
            <h2>Como reconhecer uma imagem Frutiger Aero</h2>
            <p>
              Você não precisa de legenda para sentir. Mas se quiser uma lista de checagem, é esta:
            </p>
            <ul class="lista-bolha">
              <li><strong>Fundo de céu limpo</strong> com nuvens fofas e horizonte amplo.</li>
              <li><strong>Superfícies de vidro ou água</strong> com brilho no topo e refração embaixo.</li>
              <li><strong>Natureza idealizada</strong>: grama podada, folhas sem pragas, peixes coloridos.</li>
              <li><strong>Objeto tecnológico</strong> integrado à paisagem (monitor, celular, avião, carro).</li>
              <li><strong>Luz artificial</strong>: lens flare, bokeh, aurora, brilho diagonal.</li>
              <li><strong>Paleta azul-verde-branco</strong> com toques de amarelo sol.</li>
              <li><strong>Tipografia humanista</strong>, quase sempre Frutiger ou similar.</li>
              <li><strong>Mensagem otimista</strong>: tecnologia limpa, futuro sustentável, tudo em ordem.</li>
            </ul>
          </div>
          <aside class="painel surgir">
            <h3>Três perguntas frequentes</h3>
            <details class="acordeao">
              <summary>Por que "Frutiger"?</summary>
              <p>
                Em homenagem à família tipográfica desenhada por <strong>Adrian Frutiger</strong>
                (1928–2015), criada para a sinalização do aeroporto Charles de Gaulle e depois
                espalhada por manuais, painéis, logotipos e caixas de eletrônicos.
              </p>
            </details>
            <details class="acordeao">
              <summary>E por que "Aero"?</summary>
              <p>
                Do <strong>Windows Aero</strong>, o tema visual do Vista (2006–2007) e do Windows 7
                (2009): vidro translúcido, desfoque, Aero Snap, Aero Peek e Flip 3D. "Aero" é um
                backronym de <em>Authentic, Energetic, Reflective, Open</em>.
              </p>
            </details>
            <details class="acordeao">
              <summary>Ninguém chamava assim na época?</summary>
              <p>
                Ninguém. O termo foi cunhado em <strong>2017</strong> por Sofi Xian, do CARI, para
                dar nome a um conjunto de referências que, na época, pareciam coisas separadas:
                o Windows, os comerciais de TV, os wallpapers de fábrica, os ícones do iPhone.
              </p>
            </details>
            <details class="acordeao">
              <summary>Quando e por que acabou?</summary>
              <p>
                Entre 2012 e 2013. O Windows 8 (2012) aposentou o Aero e o iOS 7 (2013) trocou
                reflexos por superfícies chapadas: nasceu o <em>flat design</em>. Em 2017 o
                <em>Corporate Memphis</em> fechou o ciclo. O Frutiger Aero deixou de ser presente
                para virar memória — e memória a gente restaura.
              </p>
            </details>
          </aside>
        </div>
      </section>

      <section class="secao">
        <div class="container">
          <div class="secao__cabecalho surgir">
            <span class="sobretitulo">evidências</span>
            <h2>Imagens do período no acervo</h2>
            <p>
              Céus, água, vida marinha e brilhos de lente — os quatro pilares visuais da estética,
              direto das pastas <code>skyboxes</code>, <code>water</code>, <code>sealife</code> e
              <code>flares</code>.
            </p>
          </div>
          <div id="faixaAcervo" data-quantidade="8"></div>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container">
          <div class="secao__cabecalho secao__cabecalho--centro surgir">
            <span class="sobretitulo">contexto</span>
            <h2>O mundo em que isso floresceu</h2>
          </div>
          <div class="grade grade--4">
            <article class="cartao surgir"><h3>%%ico:desempenho:ico--titulo%%Internet discada</h3><p>56k, modem gritando e CDs de "50 horas grátis" nas bancas. Baixar uma música era um evento.</p></article>
            <article class="cartao surgir"><h3>%%ico:chat:ico--titulo%%MSN e Orkut</h3><p>Apelidos com caracteres especiais, scraps, comunidades e o botão "chamar atenção".</p></article>
            <article class="cartao surgir"><h3>%%ico:laptop:ico--titulo%%Gadgets brilhantes</h3><p>MP3 players, celulares com capa, telas de LCD azul e toques polifônicos.</p></article>
            <article class="cartao surgir"><h3>%%ico:calmo:ico--titulo%%Otimismo verde</h3><p>O discurso ecológico entra no design: tecnologia limpa, futuro sustentável, tudo brilhando.</p></article>
          </div>
        </div>
      </section>
"""

# ==========================================================================
# GALERIA
# ==========================================================================
GALERIA = """
      <section class="hero">
        <div class="container">
          <span class="sobretitulo">acervo aberto</span>
          <h1 class="hero__titulo">
            Galeria Frutiger Aero
            <span>171 imagens disponíveis aqui · 1.284 no repositório completo</span>
          </h1>
          <p class="hero__texto">
            Todas as imagens seguem o padrão <code>pasta_numero.png</code> e vêm do acervo
            <strong>Frutiger Aero Archive</strong>, versionadas no repositório do projeto. Filtre por
            categoria, clique para ampliar e baixe o arquivo original.
          </p>
          <div class="empilhado espaco-topo">
            <a class="botao botao--pequeno botao--verde" href="https://github.com/Mikhailink/FGAero-Land-2000" target="_blank" rel="noopener">%%ico:mundo:ico--botao%%<span>Repositório com as 1.284 imagens</span></a>
            <a class="botao botao--pequeno" href="https://frutigeraeroarchive.org" target="_blank" rel="noopener">Frutiger Aero Archive</a>
          </div>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container">
          <div class="galeria__barra surgir">
            <div>
              <span class="sobretitulo">explorar</span>
              <h2 style="margin-bottom:.2rem">Filtre e amplie</h2>
              <p class="dica-uso" style="margin:0">
                Dica: use as setas <strong>← →</strong> do teclado para navegar na visualização
                ampliada, e <strong>Esc</strong> para fechar.
              </p>
            </div>
            <div class="empilhado">
              <button class="botao botao--pequeno botao--fantasma" id="botaoTamanho" type="button" aria-pressed="false">
                %%ico:busca:ico--botao%%<span>Alternar tamanho das miniaturas</span>
              </button>
            </div>
          </div>
          <div id="galeria" data-limite="24"></div>
        </div>
      </section>

      <section class="secao">
        <div class="container duas-colunas">
          <div class="surgir">
            <span class="sobretitulo">como funciona</span>
            <h2>Padrão de nomes e organização</h2>
            <p>
              Cada arquivo é nomeado como <code>pasta_numero.extensão</code> — por exemplo,
              <code>imagens/sealife/sealife_37.png</code>. Isso permite que qualquer script liste,
              filtre ou monte cenas automaticamente, como fazem o
              <a href="jogo-aquario.html">Aquário 2000</a> e o
              <a href="jogo-memoria.html">Memória Gloss</a>.
            </p>
            <table class="tabela">
              <caption class="escondido-visual">Categorias do acervo</caption>
              <thead>
                <tr><th>Categoria</th><th>Aqui</th><th>Repositório</th><th>Tema</th></tr>
              </thead>
              <tbody id="tabelaCategorias"></tbody>
            </table>
          </div>
          <aside class="painel surgir">
            <h3>Como baixar o acervo inteiro</h3>
            <ol class="lista-bolha" style="list-style:decimal; padding-left:1.4rem">
              <li>Abra o <a href="https://github.com/Mikhailink/FGAero-Land-2000" target="_blank" rel="noopener">repositório no GitHub</a>.</li>
              <li>Use <em>Code → Download ZIP</em> para baixar as 19 pastas.</li>
              <li>Ou clone: <code>git clone https://github.com/Mikhailink/FGAero-Land-2000.git</code></li>
              <li>Para gerar uma versão leve das imagens, rode <code>python3 tools/baixar_imagens.py</code> (requer Pillow).</li>
              <li>Depois é só publicar: GitHub + Vercel, sem build.</li>
            </ol>
            <p class="dica-uso">
              As imagens originais têm resolução de arquivo (algumas passam de 30 MB). Nesta
              versão web, um subconjunto foi redimensionado para carregar rápido.
            </p>
          </aside>
        </div>
      </section>
"""

# ==========================================================================
# JOGOS
# ==========================================================================
JOGOS = """
      <section class="hero">
        <div class="container">
          <span class="sobretitulo">arcade aero</span>
          <h1 class="hero__titulo">
            Minigames do FGAero Land
            <span>cinco formas de brincar com vidro, bolhas e nuvens</span>
          </h1>
          <p class="hero__texto">
            Todos os jogos foram feitos em JavaScript puro com Canvas 2D e DOM, usam imagens do
            acervo, salvam recordes no seu navegador e pausam automaticamente quando você sai da
            página. Escolha um e boa sorte.
          </p>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container">
          <div id="jogosGrade"></div>
        </div>
      </section>

      <section class="secao">
        <div class="container duas-colunas">
          <div class="surgir">
            <span class="sobretitulo">seus recordes</span>
            <h2>Ranking local</h2>
            <p>
              Os recordes ficam guardados no seu navegador (localStorage) — nada vai para servidor
              nenhum. Zere uma rodada para entrar no quadro.
            </p>
            <ul class="recordes" id="recordesPainel"></ul>
            <div class="empilhado espaco-topo">
              <button class="botao botao--pequeno botao--fantasma" id="botaoLimparRecordes" type="button">
                %%ico:erro:ico--botao%%<span>Limpar recordes salvos</span>
              </button>
            </div>
          </div>
          <aside class="painel surgir">
            <h3>Como os jogos foram construídos</h3>
            <ul class="lista-bolha">
              <li><strong>Engine única</strong> (<code>js/jogos.js</code>): laço com delta-time, HUD, contagem 3-2-1, pausa automática, pontuação flutuante e recordes.</li>
              <li><strong>Canvas 2D</strong> com ajuste de densidade de tela (nitidez em retina).</li>
              <li><strong>Entradas</strong>: teclado, ponteiro, toque e botões de controle exibidos no celular.</li>
              <li><strong>Som</strong>: efeitos sintetizados por osciladores e ruído filtrado.</li>
              <li><strong>Acessibilidade</strong>: foco visível, rótulos ARIA, respeito a <em>prefers-reduced-motion</em>.</li>
            </ul>
          </aside>
        </div>
      </section>
"""

# ==========================================================================
# CURIOSIDADES
# ==========================================================================
CURIOSIDADES = """
      <section class="hero">
        <div class="container">
          <span class="sobretitulo">memória da internet</span>
          <h1 class="hero__titulo">
            Curiosidades dos anos 2000
            <span>modem gritando, apelido com estrelinhas e CD de 50 horas grátis</span>
          </h1>
          <p class="hero__texto">
            Tudo que moldou o gosto visual da era Aero veio da vida online daqueles anos: as redes
            que o Brasil adotou, os jogos que vinham no sistema, os arquivos que demoravam uma noite
            para chegar. Converse com o <strong>AeroBot</strong>, sorteie curiosidades e brinque com
            os widgets.
          </p>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container duas-colunas">
          <div class="surgir">
            <span class="sobretitulo">assistente retrô</span>
            <h2>AeroBot 2000</h2>
            <p>
              Um bot inspirado nas janelas de conversa de 2006. Pergunte sobre a estética, o acervo,
              os jogos, o Orkut, o MSN ou peça uma curiosidade. Ele responde com <em>nudge</em>,
              emoticons e tudo.
            </p>
            <div id="chatBot"></div>
          </div>
          <aside class="surgir">
            <div class="secao__cabecalho">
              <span class="sobretitulo">sorteio do dia</span>
              <h3>Curiosidade aleatória</h3>
            </div>
            <div id="curiosidadeDestaque"></div>
            <div class="acoes-curiosidade">
              <button class="botao botao--pequeno botao--verde" id="botaoCuriosidade" type="button">%%ico:curiosidades:ico--botao%%<span>Sortear outra</span></button>
              <a class="botao botao--pequeno botao--fantasma" href="jogo-trivia.html">%%ico:curiosidades:ico--botao%%<span>Testar na trivia</span></a>
            </div>
            <div class="espaco-topo">
              <h3>Gerador de apelido MSN</h3>
              <div id="geradorApelido"></div>
            </div>
          </aside>
        </div>
      </section>

      <section class="secao">
        <div class="container">
          <div class="secao__cabecalho secao__cabecalho--centro surgir">
            <span class="sobretitulo">lista completa</span>
            <h2>16 fatos da era do vidro</h2>
            <p>Do som do modem ao peixe tropical que estava em todo monitor do planeta.</p>
          </div>
          <div id="curiosidadesGrade"></div>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container duas-colunas">
          <div class="surgir">
            <span class="sobretitulo">tendências</span>
            <h2>O que estava em alta na época</h2>
            <p>
              Um retrato rápido do comportamento online entre 2003 e 2010 — aquilo que dava forma ao
              gosto visual e à linguagem da internet brasileira.
            </p>
            <div class="empilhado">
              <span class="selo">Orkut · scraps</span><span class="selo">MSN · nudge</span>
              <span class="selo">Fotolog · 1 foto por dia</span><span class="selo">ICQ · "uh-oh"</span>
              <span class="selo">Habbo Hotel</span><span class="selo">Neopets</span>
              <span class="selo">Club Penguin</span><span class="selo">RuneScape</span>
              <span class="selo">Counter-Strike 1.6</span><span class="selo">GTA San Andreas</span>
              <span class="selo">The Sims 2</span><span class="selo">LimeWire / eMule / Kazaa</span>
              <span class="selo">CD gravado à mão</span><span class="selo">Glitter graphics</span>
              <span class="selo">Tela de LCD azul</span><span class="selo">Toque polifônico</span>
              <span class="selo">Fórum de assinatura animada</span><span class="selo">"Passei o dia no PC"</span>
              <span class="selo">Wallpaper de golfinho</span><span class="selo">Protetor de tela de aquário</span>
            </div>
            <div class="espaco-topo">
              <h3>Glossário Aero</h3>
              <table class="tabela">
                <thead><tr><th>Termo</th><th>O que é</th></tr></thead>
                <tbody>
                  <tr><td><strong>Aero Glass</strong></td><td>Transparência com desfoque nas janelas do Windows Vista/7.</td></tr>
                  <tr><td><strong>Skeuomorphism</strong></td><td>Elementos digitais imitando objetos reais (agenda com costura, botão de vidro).</td></tr>
                  <tr><td><strong>Lens flare</strong></td><td>Reflexo de lente aplicado de propósito, para dar sensação de luz natural.</td></tr>
                  <tr><td><strong>Bokeh</strong></td><td>Desfoque circular das luzes ao fundo — usado em excesso na época, com carinho.</td></tr>
                  <tr><td><strong>Web 2.0 Gloss</strong></td><td>Botões e logos com brilho diagonal e reflexo; o jeito de dizer "moderno" em 2006.</td></tr>
                  <tr><td><strong>Frutiger Metro</strong></td><td>Vertente gráfica e urbana (2005–2010) com silhuetas e cores fortes.</td></tr>
                  <tr><td><strong>Neo-Aero</strong></td><td>O renascimento da estética a partir de 2022, movido por nostalgia nas redes.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <aside class="surgir">
            <div class="secao__cabecalho">
              <span class="sobretitulo">papel de parede</span>
              <h3>Sorteie um céu do acervo</h3>
            </div>
            <div id="sorteioWallpaper"></div>
            <div class="espaco-topo">
              <div class="secao__cabecalho">
                <span class="sobretitulo">trilha</span>
                <h3>Ouça enquanto navega</h3>
              </div>
              <div id="areaPlayer"></div>
            </div>
            <div class="caixa-dialogo espaco-topo">
              <p class="caixa-dialogo__topo">Aviso do sistema</p>
              <div class="caixa-dialogo__corpo">
                <p style="margin:0;font-size:.92rem">
                  Este site não coleta dados. Preferências (recordes, cenário, volume) ficam só no
                  seu navegador. Nada de cookies de terceiros — só bolhas.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
"""

# ==========================================================================
# CRÉDITOS
# ==========================================================================
CREDITOS = """
      <section class="hero">
        <div class="container">
          <span class="sobretitulo">transparência</span>
          <h1 class="hero__titulo">
            Créditos e fontes
            <span>de onde vem cada imagem, número e afirmação deste arquivo</span>
          </h1>
          <p class="hero__texto">
            Este é um projeto editorial sem fins comerciais sobre uma estética que pertence a todo
            mundo. As imagens vêm de um arquivo comunitário; as afirmações históricas estão
            referenciadas abaixo.
          </p>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container">
          <div class="secao__cabecalho surgir">
            <span class="sobretitulo">referências</span>
            <h2>Fontes consultadas</h2>
          </div>
          <div id="creditosFontes"></div>
        </div>
      </section>

      <section class="secao">
        <div class="container duas-colunas">
          <div class="surgir">
            <span class="sobretitulo">acervo</span>
            <h2>Sobre as imagens</h2>
            <p>
              O acervo reúne <strong>1.284 arquivos</strong> em 19 pastas, com o padrão de nome
              <code>pasta_numero.png</code>, versionados no repositório
              <a href="https://github.com/Mikhailink/FGAero-Land-2000" target="_blank" rel="noopener">Mikhailink/FGAero-Land-2000</a>
              e coletados principalmente do
              <a href="https://frutigeraeroarchive.org" target="_blank" rel="noopener">Frutiger Aero Archive</a>.
            </p>
            <p>
              Os créditos de fotografia, ilustração e renderização pertencem aos autores originais.
              Se você é autor de alguma imagem e quer correção ou remoção, abra uma
              <em>issue</em> no repositório — resolvemos rapidinho.
            </p>
            <h3>Licença e uso</h3>
            <ul class="lista-bolha">
              <li><strong>Código</strong> (HTML, CSS, JS): livre para estudar, adaptar e reutilizar com atribuição.</li>
              <li><strong>Imagens</strong>: uso editorial, sem fins comerciais, com crédito às fontes.</li>
              <li><strong>Textos</strong> deste site: podem ser citados com link para o projeto.</li>
              <li><strong>Marcas</strong> citadas (Windows, MSN, Orkut, iPhone) pertencem a seus donos; aqui aparecem apenas como referência histórica.</li>
            </ul>
          </div>
          <aside class="painel surgir">
            <h3>Ficha técnica</h3>
            <table class="tabela">
              <tbody>
                <tr><th>Front-end</th><td>HTML5, CSS3 (grid, flex, <code>backdrop-filter</code>, variáveis), JavaScript ES2020 sem framework</td></tr>
                <tr><th>Jogos</th><td>Canvas 2D + DOM, engine própria em <code>js/jogos.js</code></td></tr>
                <tr><th>Áudio</th><td>4 trilhas pelo player do YouTube + MP3 da pasta <code>music/</code> como reserva offline + 3 faixas e 9 efeitos sintetizados em tempo real (Web Audio API)</td></tr>
                <tr><th>Cursor</th><td><code>css/cur771.cur</code> — seta do Windows Vista</td></tr>
                <tr><th>Imagens</th><td>1.284 no repositório · 171 otimizadas no site</td></tr>
                <tr><th>Publicação</th><td>GitHub (código) + Vercel (site estático)</td></tr>
                <tr><th>Acessibilidade</th><td>Contraste, foco visível, ARIA, <em>prefers-reduced-motion</em>, navegação por teclado</td></tr>
              </tbody>
            </table>
            <h3 class="espaco-topo">Como publicar</h3>
            <ol class="lista-bolha" style="list-style:decimal;padding-left:1.4rem">
              <li><code>git clone https://github.com/Mikhailink/FGAero-Land-2000.git</code></li>
              <li>Copie os arquivos deste site para a raiz do repositório.</li>
              <li><code>git commit -am "site FGAero Land 2000" &amp;&amp; git push</code></li>
              <li>Na Vercel: <em>Add New → Project → Import</em> o repositório (não precisa de build).</li>
              <li>Pronto: <code>seu-projeto.vercel.app</code></li>
            </ol>
          </aside>
        </div>
      </section>

      <section class="secao secao--vidro">
        <div class="container">
          <div class="secao__cabecalho secao__cabecalho--centro surgir">
            <span class="sobretitulo">tecnologias</span>
            <h2>Como este site foi feito</h2>
          </div>
          <div class="grade grade--2">
            <article class="cartao surgir"><h3>%%ico:cenario:ico--titulo%%Interatividade</h3><p>Dock estilo barra de tarefas, janelas flutuantes arrastáveis, toasts, troca de cenário em 10 céus do acervo, modo retrô e modo calmo. Atalhos de teclado em todas as páginas.</p></article>
            <article class="cartao surgir"><h3>%%ico:galeria:ico--titulo%%Galeria</h3><p>Filtros por categoria, paginação, visualização ampliada com navegação por teclado, link para o original no repositório e exportação de cenas em PNG no Aquário.</p></article>
            <article class="cartao surgir"><h3>%%ico:jogos:ico--titulo%%Minigames</h3><p>Cinco jogos com engine compartilhada: contagem regressiva, pausa automática, recordes locais e ranking dos melhores resultados.</p></article>
            <article class="cartao surgir"><h3>%%ico:acessivel:ico--titulo%%Cuidados</h3><p>Estrutura semântica, texto alternativo, foco visível, contraste alto, suporte a movimento reduzido e funcionamento sem JavaScript nas partes essenciais.</p></article>
          </div>
        </div>
      </section>
"""

# ==========================================================================
# 404
# ==========================================================================
PAGINA404 = """
      <section class="hero">
        <div class="container hero__grade">
          <div>
            <span class="sobretitulo">erro 404</span>
            <h1 class="hero__titulo">
              Esta bolha estourou…
              <span>a página que você procurou não existe (ou evaporou em 2013)</span>
            </h1>
            <p class="hero__texto">
              Nada de pânico: no FGAero Land tem céu de sobra. Use o menu, volte para a página
              inicial ou vá jogar um minigame enquanto isso.
            </p>
            <div class="empilhado espaco-topo">
              <a class="botao botao--grande botao--verde" href="index.html">%%ico:inicio:ico--botao%%<span>Voltar ao início</span></a>
              <a class="botao botao--grande" href="galeria.html">%%ico:galeria:ico--botao%%<span>Ver a galeria</span></a>
              <a class="botao botao--grande botao--fantasma" href="jogos.html">%%ico:jogos:ico--botao%%<span>Jogar</span></a>
            </div>
          </div>
          <div class="hero__palco">
            <img class="hero__globo" data-sprite="bubbles" alt="">
            <span class="hero__enfeite hero__enfeite--2" data-sprite="sealife"></span>
            <span class="hero__enfeite hero__enfeite--1" data-sprite="balloons"></span>
          </div>
        </div>
      </section>
"""

# ==========================================================================
# PÁGINAS DE JOGO
# ==========================================================================
def pagina_jogo(nome, titulo, subtitulo, sprite_alt, controles_html, canvas_id, extras="", icone="jogos"):
    return f"""
      <section class="hero" style="padding-bottom:1.2rem">
        <div class="container">
          <span class="sobretitulo">minigame · FGAero Land 2000</span>
          <h1 class="hero__titulo" style="font-size:clamp(2rem,5vw,3rem)">
            {ico(icone, "ico--gg")} {titulo}
            <span>{subtitulo}</span>
          </h1>
        </div>
      </section>

      <section class="secao" style="padding-top:0">
        <div class="container">
          <div class="area-jogo">
            <div class="hud">
              <div class="hud__grupo">
                <span class="hud__item">pontos <strong data-hud="pontos">0</strong></span>
                <span class="hud__item hud__item--destaque">%%ico:sucesso:ico--chip%% <strong data-hud="recorde">0</strong></span>
                {controles_html}
              </div>
              <div class="hud__grupo">
                <span class="hud__barra"><span data-hud="barra"></span></span>
                <button class="botao botao--pequeno" id="botaoPausa" type="button">%%ico:aviso:ico--botao%%<span>Pausar</span></button>
                <button class="botao botao--pequeno botao--fantasma" id="botaoReiniciar" type="button">%%ico:jogos:ico--botao%%<span>Reiniciar</span></button>
                <a class="botao botao--pequeno botao--fantasma" href="jogos.html">%%ico:jogos:ico--botao%%<span>Outros jogos</span></a>
              </div>
            </div>
            <div class="palco-jogo {'palco-jogo--alto' if canvas_id == 'palcoVoo' else ''}">
              <canvas id="{canvas_id}" width="1280" height="800" aria-label="{titulo} — área do jogo"></canvas>
              <div class="pontos-flutuantes" aria-hidden="true"></div>
              <div class="contagem" hidden aria-hidden="true"></div>
              <div class="sobreposicao" id="sobreposicaoJogo"></div>
            </div>
            {extras}
            <p class="dica-uso" style="text-align:center">
              {sprite_alt}
            </p>
          </div>
        </div>
      </section>
"""

JOGO_BOLHAS = pagina_jogo(
    "bolhas",
    "Estoura-Bolhas Aero",
    "60 segundos, combos até x4 e bolhas douradas que dão tempo extra",
    "Dica: a bolha azul-escura tira 15 pontos — deixe-a subir em paz. Você também pode tocar na tela.",
    '<span class="hud__item">tempo <strong data-hud="tempo">60s</strong></span>',
    "palcoBolhas",
    icone="inicio",
    extras="""
            <div class="controles-toque">
              <span class="dica-uso">Toque nas bolhas diretamente no palco — o botão abaixo pausa:</span>
            </div>""",
)

JOGO_VOO = pagina_jogo(
    "voo",
    "Voo Aero",
    "planador infinito entre nuvens, balões e brilhos perigosos",
    "Use ↑ ↓ (ou W S) no teclado; no celular, arraste o dedo pelo palco ou use os botões abaixo.",
    """<span class="hud__item">vidas <strong data-hud="vidas">3</strong></span>
                <span class="hud__item">nível <strong data-hud="nivel">1</strong></span>""",
    "palcoVoo",
    icone="mundo",
    extras="""
            <div class="controles-toque">
              <button class="controles-toque__botao" type="button" data-controle="subir" aria-label="Subir"><span class="seta seta--cima" aria-hidden="true"></span> Subir</button>
              <button class="controles-toque__botao" type="button" data-controle="descer" aria-label="Descer"><span class="seta seta--baixo" aria-hidden="true"></span> Descer</button>
            </div>""",
)

JOGO_MEMORIA = """
      <section class="hero" style="padding-bottom:1.2rem">
        <div class="container">
          <span class="sobretitulo">minigame · FGAero Land 2000</span>
          <h1 class="hero__titulo" style="font-size:clamp(2rem,5vw,3rem)">
            %%ico:jogos:ico--gg%% Memória Gloss
            <span>encontre os pares escondidos no acervo</span>
          </h1>
        </div>
      </section>

      <section class="secao" style="padding-top:0">
        <div class="container">
          <div class="area-jogo">
            <div class="hud">
              <div class="hud__grupo">
                <span class="hud__item">pontos <strong data-hud="pontos">0</strong></span>
                <span class="hud__item">pares <strong data-hud="pares">0/6</strong></span>
                <span class="hud__item">jogadas <strong data-hud="jogadas">0</strong></span>
                <span class="hud__item">tempo <strong data-hud="tempo">0s</strong></span>
                <span class="hud__item hud__item--destaque">nível <strong data-hud="nivel">Fácil</strong></span>
              </div>
              <div class="hud__grupo">
                <span class="hud__barra"><span data-hud="barra"></span></span>
                <button class="botao botao--pequeno" id="botaoNivel" type="button">%%ico:desempenho:ico--botao%%<span>Trocar nível</span></button>
                <button class="botao botao--pequeno" id="botaoPausa" type="button">%%ico:aviso:ico--botao%%<span>Pausar</span></button>
                <button class="botao botao--pequeno botao--fantasma" id="botaoReiniciar" type="button">%%ico:jogos:ico--botao%%<span>Reiniciar</span></button>
                <a class="botao botao--pequeno botao--fantasma" href="jogos.html">%%ico:jogos:ico--botao%%<span>Outros jogos</span></a>
              </div>
            </div>
            <div class="palco-jogo palco-jogo--dom" style="background:linear-gradient(180deg,#8fd4ff,#dff4ff 60%,#bdea9a)">
              <div style="padding:1rem">
                <div class="tabuleiro" id="tabuleiroMemoria"></div>
              </div>
              <div class="pontos-flutuantes" aria-hidden="true"></div>
              <div class="sobreposicao" id="sobreposicaoMemoria"></div>
            </div>
            <p class="dica-uso" style="text-align:center">
              Clique em duas cartas para virar. Par encontrado fica verde; erro custa 12 pontos e o
              par volta a esconder. Cada imagem pertence a uma categoria do acervo.
            </p>
          </div>
        </div>
      </section>
"""

JOGO_TRIVIA = """
      <section class="hero" style="padding-bottom:1.2rem">
        <div class="container">
          <span class="sobretitulo">minigame · FGAero Land 2000</span>
          <h1 class="hero__titulo" style="font-size:clamp(2rem,5vw,3rem)">
            %%ico:curiosidades:ico--gg%% Trivia Aero
            <span>10 perguntas sobre a estética, o Windows Aero e a internet brasileira</span>
          </h1>
        </div>
      </section>

      <section class="secao" style="padding-top:0">
        <div class="container">
          <div class="area-jogo">
            <div class="hud">
              <div class="hud__grupo">
                <span class="hud__item">pontos <strong data-hud="pontos">0</strong></span>
                <span class="hud__item">pergunta <strong data-hud="pergunta">1/10</strong></span>
                <span class="hud__item">sequência <strong data-hud="sequencia">x1</strong></span>
                <span class="hud__item hud__item--destaque">tempo <strong data-hud="tempo">25s</strong></span>
              </div>
              <div class="hud__grupo">
                <span class="hud__barra"><span data-hud="barra"></span></span>
                <button class="botao botao--pequeno" id="botaoPausa" type="button">%%ico:aviso:ico--botao%%<span>Pausar</span></button>
                <a class="botao botao--pequeno botao--fantasma" href="jogos.html">%%ico:jogos:ico--botao%%<span>Outros jogos</span></a>
              </div>
            </div>
            <div class="palco-jogo palco-jogo--dom" style="background:linear-gradient(180deg,#7fc9f2,#d8f0ff 60%,#c7ecac); padding:1rem">
              <div id="palcoTrivia"></div>
              <div class="pontos-flutuantes" aria-hidden="true"></div>
              <div class="sobreposicao" id="sobreposicaoTrivia"></div>
            </div>
            <p class="dica-uso" style="text-align:center">
              Acerto base 100 pontos + bônus por rapidez (até +100) + 25 por acerto em sequência.
              As explicações citam as fontes listadas na <a href="creditos.html">página de créditos</a>.
            </p>
          </div>
        </div>
      </section>
"""

JOGO_AQUARIO = """
      <section class="hero" style="padding-bottom:1.2rem">
        <div class="container">
          <span class="sobretitulo">minigame · FGAero Land 2000</span>
          <h1 class="hero__titulo" style="font-size:clamp(2rem,5vw,3rem)">
            %%ico:cenario:ico--gg%% Aquário 2000
            <span>monte sua própria imagem Frutiger Aero e exporte em PNG</span>
          </h1>
        </div>
      </section>

      <section class="secao" style="padding-top:0">
        <div class="container">
          <div class="area-jogo">
            <div class="hud">
              <div class="hud__grupo">
                <button class="botao botao--pequeno" id="botaoSortear" type="button">%%ico:cenario:ico--botao%%<span>Sortear cena</span></button>
                <button class="botao botao--pequeno botao--fantasma" id="botaoTrocarCeu" type="button">%%ico:cenario:ico--botao%%<span>Trocar céu</span></button>
                <button class="botao botao--pequeno botao--fantasma" id="botaoAgua" type="button" aria-pressed="true">%%ico:calmo:ico--botao%%<span>Água</span></button>
                <button class="botao botao--pequeno botao--fantasma" id="botaoDesfazer" type="button">%%ico:retro:ico--botao%%<span>Desfazer</span></button>
                <button class="botao botao--pequeno botao--fantasma" id="botaoLimpar" type="button">%%ico:erro:ico--botao%%<span>Limpar</span></button>
              </div>
              <div class="hud__grupo">
                <button class="botao botao--pequeno botao--verde" id="botaoSalvar" type="button">%%ico:galeria:ico--botao%%<span>Salvar PNG</span></button>
                <a class="botao botao--pequeno botao--ciano" id="linkNovaAba" target="_blank" rel="noopener" hidden>%%ico:busca:ico--botao%%<span>Abrir quadro em nova aba</a>
                <button class="botao botao--pequeno botao--fantasma" id="botaoTelaCheia" type="button">%%ico:cenario:ico--botao%%<span>Tela cheia</span></button>
                <a class="botao botao--pequeno botao--fantasma" href="jogos.html">%%ico:jogos:ico--botao%%<span>Outros jogos</span></a>
              </div>
            </div>
            <div class="palco-jogo">
              <canvas id="palcoAquario" width="1280" height="800" aria-label="Palco do Aquário 2000"></canvas>
              <div class="pontos-flutuantes" aria-hidden="true"></div>
            </div>
            <div>
              <h2 style="margin-bottom:.2rem">Escolha os itens do acervo</h2>
              <p class="dica-uso">
                Clique numa miniatura e depois clique no palco para posicionar. Arraste para mover,
                use a <strong>roda do mouse</strong> para redimensionar, <strong>R</strong> gira,
                <strong>F</strong> espelha, <strong>Delete</strong> remove, setas ajustam fino e
                <strong>Shift + setas</strong> movem rápido.
              </p>
              <div id="seletorItens"></div>
            </div>
          </div>
        </div>
      </section>
"""


def main():
    print("Gerando páginas...")
    escrever("index.html", pagina("index", f"{SITE} — arquivo vivo do Frutiger Aero",
        "Arquivo interativo da estética Frutiger Aero: história, galeria com 1.284 imagens, cinco minigames, a trilha sonora oficial de 2007 e curiosidades da internet dos anos 2000.", INDEX))
    escrever("historia.html", pagina("historia", f"História do Frutiger Aero — {SITE}",
        "Linha do tempo de 1996 a hoje: Bliss, Windows XP, Vista e Aero, Orkut, o declínio com o flat design e o renascimento Neo-Aero.", HISTORIA))
    escrever("galeria.html", pagina("galeria", f"Galeria do acervo — {SITE}",
        "Galeria com filtros por categoria, visualização ampliada e download das imagens do acervo Frutiger Aero. Padrão de nomes pasta_numero.png.", GALERIA))
    escrever("jogos.html", pagina("jogos", f"Minigames Aero — {SITE}",
        "Cinco minigames em JavaScript: estoura-bolhas, aquário criativo, voo infinito, memória com imagens e trivia sobre os anos 2000.", JOGOS))
    escrever("curiosidades.html", pagina("curiosidades", f"Curiosidades dos anos 2000 — {SITE}",
        "16 curiosidades da internet dos anos 2000, bot de conversa AeroBot, gerador de apelido MSN, glossário Aero e sorteio de wallpapers.", CURIOSIDADES))
    escrever("creditos.html", pagina("creditos", f"Créditos e fontes — {SITE}",
        "Fontes históricas (Aesthetics Wiki, CARI, imprensa brasileira), créditos do acervo de imagens, licença e ficha técnica do site.", CREDITOS))
    escrever("404.html", pagina("404", f"Página não encontrada — {SITE}",
        "A página procurada não existe neste arquivo do Frutiger Aero.", PAGINA404))

    escrever("jogo-bolhas.html", pagina("bolhas", f"Estoura-Bolhas Aero — {SITE}",
        "Minigame Estoura-Bolhas Aero: 60 segundos, combos até x4, bolhas douradas e bolhas pesadas.", JOGO_BOLHAS,
        css=["css/jogos.css"], js=["js/jogos.js", "js/jogo-bolhas.js"]))
    escrever("jogo-aquario.html", pagina("aquario", f"Aquário 2000 — {SITE}",
        "Monte sua própria cena Frutiger Aero com imagens do acervo e exporte em PNG.", JOGO_AQUARIO,
        css=["css/jogos.css"], js=["js/jogos.js", "js/jogo-aquario.js"]))
    escrever("jogo-voo.html", pagina("voo", f"Voo Aero — {SITE}",
        "Minigame Voo Aero: planador infinito entre nuvens, colete balões e desvie dos brilhos escuros.", JOGO_VOO,
        css=["css/jogos.css"], js=["js/jogos.js", "js/jogo-voo.js"]))
    escrever("jogo-memoria.html", pagina("memoria", f"Memória Gloss — {SITE}",
        "Minigame de memória com imagens do acervo Frutiger Aero, em três níveis de dificuldade.", JOGO_MEMORIA,
        css=["css/jogos.css"], js=["js/jogo-memoria.js"]))
    escrever("jogo-trivia.html", pagina("trivia", f"Trivia Aero — {SITE}",
        "Trivia com 10 perguntas sorteadas sobre Frutiger Aero, Windows Aero e a internet brasileira dos anos 2000.", JOGO_TRIVIA,
        css=["css/jogos.css"], js=["js/jogo-trivia.js"]))
    print("Pronto.")


if __name__ == "__main__":
    main()
