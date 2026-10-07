# Pasta `music/` — trilhas para tocar sem o YouTube

O player do site tem **quatro trilhas**. Cada uma pode tocar de dois jeitos:

1. **Pelo player oficial do YouTube** (embed) — é o padrão, e é assim que o site
   funciona publicado na Vercel.
2. **Pelo arquivo local** — o botão **“Ouvir do arquivo (music/)”**. Ele procura
   nesta pasta um MP3 com o **nome do id do vídeo** e toca direto, sem internet e
   sem embed. É a saída quando o preview roda em sandbox (rede restrita) ou quando
   o embed está bloqueado.

## Nome dos arquivos

| Trilha | Vídeo | Arquivo esperado aqui |
|---|---|---|
| HOME: 2007 Aero Ambience — Focusyn Audio | `RAADp1YxjGc` | `RAADp1YxjGc.mp3` ✅ já incluído |
| DREAM 2006 — Focusyn Audio | `hDmC3gc3A0E` | `hDmC3gc3A0E.mp3` |
| Somewhere in 2007 — Velvette Diarry | `kmRVciDPa00` | `kmRVciDPa00.mp3` |
| A Brighter Age — Dreamfibre | `Scw_anb0oig` | `Scw_anb0oig.mp3` |

As três que faltam já podem ser baixadas no repositório do projeto
(`Mikhailink/FGAero-Land-2000`) ou adicionadas aqui com esse nome — o player
encontra sozinho, sem precisar mexer no código:

- `js/conteudo.js` → `FGA.musica.faixas[]` aponta `mp3: "music/<id>.mp3"` para cada trilha;
- se o arquivo não existir, o player cai no mesmo caminho dentro do repositório
  (`FGA.repo.raw + music/<id>.mp3`) e, se nem isso existir, avisa e deixa você usar a
  trilha sintetizada.

> **Direitos:** as músicas continuam sendo dos canais do YouTube. Esta pasta só existe
> como alternativa de reprodução para quem já tem o arquivo — o site não baixa nem
> redistribui nada.
