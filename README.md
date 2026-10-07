# FGAero Land 2000

> **Arquivo vivo do Frutiger Aero** — história, galeria com **1.284 imagens**, cinco minigames,
> a trilha oficial de 2007 incorporada do YouTube (mais uma trilha sintetizada de reserva) e
> curiosidades da internet brasileira dos anos 2000. Interface com os **ícones originais do
> Windows Vista** (`.ico` → PNG). Feito só com HTML, CSS e JavaScript puro. Sem build, sem
> framework, sem dependências.

🔗 **Site:** _(coloque aqui a URL da Vercel após o deploy)_
🎮 **Minigames:** `jogos.html` — Estoura-Bolhas, Aquário 2000, Voo Aero, Memória Gloss e Trivia Aero
🖼️ **Galeria:** `galeria.html` — filtros por categoria, visualização ampliada e download do original
🕰️ **História:** `historia.html` — linha do tempo de 1996 (Bliss) ao Neo-Aero (2022–hoje)

---

## 1. O que é Frutiger Aero?

Frutiger Aero é o nome dado (em **2017**, por Sofi Xian do *Consumer Aesthetics Research
Institute*) ao visual que dominou o design entre **2004 e 2013**: vidro translúcido, brilhos de
lente, nuvens recortadas, bolhas de sabão, peixes tropicais, grama com orvalho e a promessa
publicitária de uma tecnologia limpa e otimista.

O nome junta a família tipográfica de **Adrian Frutiger** ao **Windows Aero** — o tema translúcido
do Windows Vista e do Windows 7, cujo nome é um backronym: *Authentic, Energetic, Reflective, Open*.

---

## 2. Estrutura do projeto

```
/
├── index.html               # página inicial (visão geral, amostra do acervo, player)
├── historia.html            # linha do tempo + anatomia da estética
├── galeria.html             # acervo com filtros, lightbox e tabela de categorias
├── jogos.html               # hub dos 5 minigames + ranking local
├── curiosidades.html        # AeroBot, 16 curiosidades, widgets e glossário
├── creditos.html            # fontes, licença e ficha técnica
├── 404.html                 # página de erro
├── jogo-bolhas.html         # 1) Estoura-Bolhas Aero      (60s, combos, +tempo)
├── jogo-aquario.html        # 2) Aquário 2000             (criativo, exporta PNG)
├── jogo-voo.html            # 3) Voo Aero                 (endless, 3 vidas)
├── jogo-memoria.html        # 4) Memória Gloss            (3 níveis, cronômetro)
├── jogo-trivia.html         # 5) Trivia Aero              (10 perguntas + fontes)
│
├── css/
│   ├── estilo.css           # tokens, layout, tipografia, responsivo
│   ├── aero.css             # componentes: vidro, janelas Vista, dock, chat, player
│   ├── jogos.css            # HUD, palco, sobreposições, cartas, trivia
│   └── cur771.cur           # CURSOR personalizado (seta do Windows Vista)
│
├── js/
│   ├── acervo.js            # GERADO: manifesto de imagens (local + totais do repositório)
│   ├── conteudo.js          # editorial: linha do tempo, curiosidades, trivia, bot, créditos
│   ├── aero.js              # núcleo: áudio, cenário, bolhas, dock, janelas, chat, toasts
│   ├── paginas.js           # lógica por página: galeria, lightbox, widgets, tabelas
│   ├── jogos.js             # engine compartilhada dos minigames (Canvas 2D)
│   ├── jogo-bolhas.js
│   ├── jogo-aquario.js
│   ├── jogo-voo.js
│   ├── jogo-memoria.js
│   └── jogo-trivia.js
│
├── imagens/                 # 171 imagens usadas no site (19 categorias)
│   ├── airplanes/ … water/  # padrão: pasta/pasta_numero.png
│   └── winVista/            # 32 ícones .ico do Windows Vista + png/ convertidos
│
├── tools/                   # scripts Python do projeto (não vão para o site)
│   ├── scan.py              # lê cabeçalhos para descobrir dimensões das 1.284 imagens
│   ├── baixar_imagens.py    # curadoria + download + otimização
│   ├── gerar_acervo.py      # gera js/acervo.js
│   ├── gerar_paginas.py     # gera todos os HTML a partir de um modelo único
│   ├── gerar_icones.py      # converte os 32 .ico do Vista em imagens/winVista/png
│   └── gerar_marca.py       # gera ícones e og-image.jpg
│
├── manifest.json            # PWA: ícones, atalhos, cores
├── vercel.json              # cache, segurança e cleanUrls
├── LICENSE                  # MIT (código) + nota sobre as imagens
└── README.md
```

---

## 3. Rodando localmente

Não há build. Qualquer servidor estático funciona:

```bash
# opção 1 (recomendada) — servidor do projeto, já com o MIME correto para .cur
python3 tools/servidor.py 8080

# opção 2 — Python puro
python3 -m http.server 8080

# opção 3 — Node
npx serve .

# opção 4 — PHP
php -S localhost:8080
```

Depois abra <http://localhost:8080>.

> **Dica:** abrir o `index.html` direto pelo `file://` funciona quase tudo, mas o CURSOR
> personalizado (`.cur`) e o `manifest.json` exigem um servidor HTTP — alguns navegadores só
> reconhecem o formato `image/x-icon` via rede.

---

## 4. Publicando no GitHub + Vercel

```bash
git clone https://github.com/Mikhailink/FGAero-Land-2000.git
cd FGAero-Land-2000
# copie os arquivos deste projeto para a raiz do repositório
git add .
git commit -m "FGAero Land 2000: site completo (galeria, 5 minigames, história)"
git push origin main
```

Na **Vercel**: `Add New… → Project → Import Git Repository` → escolha o repositório →
*Framework Preset: **Other*** → **Build Command vazio** / *Output Directory* vazio → **Deploy**.
O site é 100% estático e o `vercel.json` já configura cache e cabeçalhos.

---

## 5. O acervo de imagens

| | |
|---|---|
| **Total no repositório** | **1.284 arquivos** em 19 categorias (`imagens/`) |
| **Disponíveis no site** | **171** imagens otimizadas (~37 MB) |
| **Nomeação** | `pasta_numero.ext` — ex.: `imagens/sealife/sealife_37.png` |
| **Fonte** | [Frutiger Aero Archive](https://frutigeraeroarchive.org) |
| **Formato real** | mistura de PNG, JPEG e WebP (alguns com extensão `.png` "emprestada") |

Categorias: `airplanes`, `animals`, `balloons`, `bubbles`, `buildings`, `clouds`, `flares`,
`foregrounds`, `furniture`, `globes`, `insects`, `metro`, `miscellaneous`, `objects`, `people`,
`sealife`, `skyboxes`, `trees`, `water`.

**Por que não baixei as 1.284?** O acervo completo passa de **1,2 GB** (há PNGs de 50 MB). O site
usa um subconjunto leve e otimizado para carregar rápido; o restante continua disponível no
repositório, e a galeria tem links diretos para cada original.

**Para publicar o acervo completo** (Vercel aceita, mas o deploy fica pesado):

```bash
git clone --depth 1 https://github.com/Mikhailink/FGAero-Land-2000.git /tmp/acervo
cp -r /tmp/acervo/imagens/* imagens/
python3 tools/gerar_acervo.py         # regenera js/acervo.js com todas as imagens
```

Para voltar a usar apenas o subconjunto otimizado:

```bash
python3 tools/baixar_imagens.py      # re-baixa e re-otimiza a seleção curada
python3 tools/gerar_acervo.py
```

---

## 6. Recursos do site

### Interatividade da era Aero
- **Cursor personalizado** `css/cur771.cur` (seta do Windows Vista) aplicado via CSS em todo o site.
- **Dock** inferior estilo barra de tarefas com os ícones do Vista: música, curiosidade, trocar cenário, modo 2000, modo calmo, topo.
- **Janelas flutuantes** arrastáveis (minimizar/fechar) com barra de título.
- **Toasts** de vidro, **cenário de céu trocável** (10 céus do acervo) e **bolhas animadas em canvas**.
- **Modo 2000**: janelas sólidas com bordas duras, textura de 2002. **Modo calmo**: reduz animações.
- Atalhos de teclado: `M` música · `C` cenário · `K` curiosidade · `←/→` galeria · `P` pausa nos jogos.

### Música e som
- **Trilha oficial do site:** *HOME: 2007 Aero Ambience | Windows Vista Center*, do canal
  [Focusyn Audio](https://www.youtube.com/@FocusynAudio) — reproduzida pelo **player incorporado do
  YouTube** (`https://www.youtube.com/watch?v=RAADp1YxjGc`), por meio da *IFrame Player API*. Nada é
  baixado nem redistribuído; os direitos são do canal.
- **Trilha sintetizada de reserva** (Web Audio API): três faixas geradas em tempo real —
  *Céu de 2006*, *Aquário MIDI* e *Neo-Aero 2022* — escolhidas na aba *Sintetizado* do player.
- **9 efeitos** sintetizados: clique, vidro, bolha, acerto, erro, respingo, estrela, aviso, mensagem.
- A **capa do player** usa a miniatura oficial do vídeo (`i.ytimg.com`); se essa imagem estiver
  bloqueada (sandbox, rede restrita), entra no lugar um céu do próprio acervo
  (`FGA.musica.posterLocal` → `imagens/skyboxes/`).
- Se o embed do YouTube estiver bloqueado (sandbox, rede restrita), o player avisa e oferece o link
  direto do vídeo — e a trilha sintetizada assume o lugar.
- A home tem **dois players independentes** (o da seção *trilha sonora* e o da janela
  *Aero Player 2000*): ao tocar num deles, o iframe muda de lugar e o outro vira fachada de novo,
  então nunca tocam dois vídeos ao mesmo tempo.

### Ícones — Windows Vista (.ico)
- Os 32 arquivos `.ico` de `imagens/winVista/` (do próprio acervo) são convertidos para PNG por
  `tools/gerar_icones.py` e usados em **toda a interface**: menu, dock, botões, filtros, HUD dos
  jogos, janelas flutuantes e toasts.
- O mapa chave → arquivo fica em `js/icones.js` (`FGA.icones.mapa`) e o carregamento é feito por
  `FGA.icones.el()`, com queda para texto caso algum PNG falte.
- **Não há emoji na interface**: menu, botões, selos, HUD, janelas, chat do AeroBot, toasts e
  tabelas usam os `.ico` do Vista. As páginas são geradas por `tools/gerar_paginas.py`, que troca
  os marcadores `%%ico:chave:classe%%` pelo `<img>` correspondente (`aplicar_icones()`).

### Minigames
| Jogo | Gênero | Destaques |
|---|---|---|
| Estoura-Bolhas Aero | Clique, 60s | combos até x4, bolha dourada (+50 e +2s), bolha pesada (−15) |
| Aquário 2000 | Criativo | posiciona/arrasta/rotaciona sprites do acervo e exporta **PNG** |
| Voo Aero | Endless | 3 vidas, escudo, dificuldade crescente, controle por toque |
| Memória Gloss | Memória | 3 níveis, cronômetro, bônus por rapidez, pares com imagens reais |
| Trivia Aero | Quiz | 10 perguntas sorteadas, explicação em cada resposta, sequência de acertos |

Todos salvam **recorde local**, têm **contagem 3‑2‑1**, **pausa automática** fora da tela e
respeitam `prefers-reduced-motion`.

### Acessibilidade e responsividade
Estrutura semântica, rótulos ARIA, foco visível, contraste alto, navegação por teclado,
`aria-live` nos painéis dinâmicos, layout fluido de 320 px a telas ultrawide.

---

## 7. Ferramentas (`tools/`)

Os scripts em Python documentam como o acervo foi preparado. Precisa de `Pillow`:

```bash
pip install pillow
python3 tools/scan.py              # mede as 1.284 imagens pelos cabeçalhos (rápido)
python3 tools/baixar_imagens.py    # baixa e otimiza a seleção curada
python3 tools/gerar_acervo.py      # regenera js/acervo.js
python3 tools/gerar_paginas.py     # regenera os HTML
python3 tools/gerar_marca.py       # regenera ícones e og-image.jpg
```

---

## 8. Conferência automática

O site foi testado num navegador real (Chromium + Playwright) com o servidor local no ar:

| Verificação | Resultado |
|---|---|
| 12 páginas (`index` → `404`) | sem erro de JS, sem 404 e sem imagem quebrada |
| Ícones do Vista | 12 a 44 por página, nenhum quebrado e **nenhum emoji na interface** |
| Galeria | filtro *Todas (171)*, troca de categoria, lightbox e tecla `Esc` |
| Música | trilha oficial carregando no `iframe`, dois players trocando de alvo nas duas direções |
| AeroBot | resposta com ícones, 3 balões, nenhum ícone quebrado |
| Minigames | os 4 jogos de tela começam, contam pontos e a sobreposição não é cortada |
| Celular (390×844) | sem rolagem lateral, menu hambúrguer e dock ativos |

Para repetir: suba o servidor (`python3 tools/servidor.py 8080`) e rode os scripts de
verificação em `/tmp/play` (Playwright + Chromium do sistema) — os pontos medidos são os
mesmos que estão nas tabelas acima.

---

## 9. Créditos e licença

**Fontes:** [Frutiger Aero Archive](https://frutigeraeroarchive.org) ·
[Aesthetics Wiki](https://aesthetics.fandom.com/wiki/Frutiger_Aero) ·
[CARI](https://cari.institute) · [r/FrutigerAero](https://www.reddit.com/r/FrutigerAero/) ·
Estadão, Exame e TecMundo (dados de Orkut, MSN e Fotolog) · Windows Wallpaper Wiki (Bliss).

**Código:** MIT (veja `LICENSE`).
**Imagens:** uso editorial, sem fins comerciais, créditos aos autores originais — o acervo
comunitário pertence à comunidade que o preservou. Marcas citadas pertencem a seus donos.

---

<p align="center">
  <em>Feito com vidro, bolhas e saudade. 🫧</em><br>
  <sub>Frutiger Aero: 2004–2013, e de volta agora.</sub>
</p>
