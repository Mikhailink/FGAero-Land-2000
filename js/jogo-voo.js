/* ==========================================================================
   FGAero Land 2000 — jogo-voo.js
   Voo Aero: planador infinito. Colete balões, desvie dos brilhos de lente,
   não encoste nas bordas. Três vidas, dificuldade crescente.
   ========================================================================== */
(function () {
  "use strict";
  const FGA = window.FGA || {};
  const { inteiro, aleatorio, limitar, carregarImagens, carregarImagem, pronta, fonte } = FGA.jogoUtil;

  const sprites = {
    avioes: [],
    baloes: [],
    perigos: [],
    bonus: [],
    nuvens: [],
  };

  function carregarSprites() {
    /* o planador é SEMPRE a imagem airplanes_2 (avião de carreira branco):
       as outras da pasta são jatos em ângulos que não combinam com o voo */
    sprites.avioes = [carregarImagem("imagens/airplanes/airplanes_2.png", 320)];
    sprites.baloes = carregarImagens("balloons", 8, 120);
    sprites.perigos = carregarImagens("flares", 6, 140);
    sprites.bonus = carregarImagens("objects", 6, 120);
    sprites.nuvens = carregarImagens("clouds", 6, 340);
  }
  carregarSprites();

  const jogo = FGA.criarJogo({
    nome: "voo",
    canvas: "#palcoVoo",
    largura: 1280,
    altura: 800,
    duracao: 0,
    icone: "cenario",
    tituloTela: "Voo Aero",
    texto: "Pilote o planador por um corredor de nuvens. Sobreviva o máximo que conseguir.",
    dicas: [
      "<strong>↑ / ↓</strong> (ou <strong>W / S</strong>) sobem e descem. No celular, arraste o dedo.",
      "Colete os <strong>balões</strong>: <strong>+10</strong> cada.",
      "Pegue os <strong>objetos brilhantes</strong> para <strong>+25</strong> e um escudo de 3 segundos.",
      "Desvie dos <strong>brilhos escuros</strong>: só dói se encostar de verdade. Você tem 3 vidas.",
      "A velocidade aumenta conforme você pontua.",
    ],
    teclas: ["ArrowUp", "ArrowDown", " ", "w", "s", "W", "S"],
    iniciar(j) {
      estado.x = 260;
      estado.y = j.altura / 2;
      estado.vy = 0;
      estado.vidas = 3;
      estado.invencivel = 0;
      estado.escudo = 0;
      estado.distancia = 0;
      estado.velocidade = 270;
      entidades.length = 0;
      tempoSpawn = 0;
      j.pontos = 0;
      j.displayVidas();
    },
    atualizar(j, dt) {
      const A = j.altura;
      const subindo = j.tecla("ArrowUp", "w", "W") || j.entradas["subir"];
      const descendo = j.tecla("ArrowDown", "s", "S") || j.entradas["descer"];

      // toque/arraste define o alvo vertical
      if (j.ponteiro.ativo) {
        estado.y += (j.ponteiro.y - estado.y) * Math.min(1, dt * 9);
        estado.vy = 0;
      } else {
        const alvo = (subindo ? -1 : 0) + (descendo ? 1 : 0);
        estado.vy += alvo * 900 * dt;
        if (!alvo) estado.vy *= Math.pow(0.0025, dt); // atrito
        estado.vy = limitar(estado.vy, -420, 420);
        estado.y += estado.vy * dt;
      }
      estado.y = limitar(estado.y, 70, A - 90);

      estado.distancia += estado.velocidade * dt;
      estado.velocidade = Math.min(560, 270 + estado.distancia / 42);
      j.pontos = Math.floor(estado.distancia / 12) + estado.coletados;
      j.nivel = 1 + Math.floor((estado.velocidade - 270) / 70);

      if (estado.invencivel > 0) estado.invencivel -= dt;
      if (estado.escudo > 0) estado.escudo -= dt;

      // spawn
      tempoSpawn -= dt;
      const intervalo = Math.max(0.4, 1.05 - estado.distancia / 16000);
      if (tempoSpawn <= 0) {
        tempoSpawn = aleatorio(intervalo * 0.6, intervalo * 1.4);
        entidades.push(criarEntidade(j));
      }

      // move entidades
      entidades.forEach((e) => {
        e.x -= estado.velocidade * e.escalaVel * dt;
        e.giro += dt * e.giroVel;
        if (e.tipo === "nuvem") e.y += Math.sin(e.x / 220) * 12 * dt;
      });

      // colisões
      const caixaJogador = { x: estado.x, y: estado.y, r: 46 };
      for (let i = entidades.length - 1; i >= 0; i--) {
        const e = entidades[i];
        const d = Math.hypot(e.x - caixaJogador.x, e.y - caixaJogador.y);
        if (d < e.r + caixaJogador.r * 0.42) { /* antes 0.62: pegava sem encostar */
          if (e.tipo === "balao") {
            j.pontos += 10;
            estado.coletados += 10;
            j.pontoFlutuante(e.x, e.y, "+10");
            j.som("bolha");
            entidades.splice(i, 1);
            continue;
          }
          if (e.tipo === "bonus") {
            estado.coletados += 25;
            j.pontoFlutuante(e.x, e.y, "+25 com escudo", true);
            j.som("estrela");
            estado.escudo = 3;
            entidades.splice(i, 1);
            continue;
          }
          if (e.tipo === "perigo" && estado.invencivel <= 0) {
            if (estado.escudo > 0) {
              estado.escudo = 0;
              j.pontoFlutuante(e.x, e.y, "escudo absorveu!", true);
              j.som("vidro");
            } else {
              estado.vidas -= 1;
              estado.invencivel = 1.6;
              j.som("erro");
              j.pontoFlutuante(e.x, e.y, "−1 vida");
              j.displayVidas();
              if (estado.vidas <= 0) {
                j.somar(0);
                j.terminar("O planador perdeu altitude… mas o céu continua lá!");
                return;
              }
            }
            entidades.splice(i, 1);
          }
        }
        if (e.x < -260) entidades.splice(i, 1);
      }

      nuvensFundo.forEach((n) => {
        n.x -= estado.velocidade * n.vel * dt;
        if (n.x < -400) {
          n.x = 1400 + aleatorio(0, 400);
          n.y = aleatorio(40, A - 120);
        }
      });

      // aviões de fundo: passam mais devagar que as nuvens (parallax)
      avioesFundo.forEach((a) => {
        a.x -= estado.velocidade * a.vel * 0.5 * dt;
        const larg = a.altura * 2.34;
        if (a.x < -larg - 60) {
          a.x = j.largura + aleatorio(60, 700);
          a.y = aleatorio(70, 640);
          a.altura = aleatorio(26, 46);
          a.vel = aleatorio(0.22, 0.5);
          a.alfa = aleatorio(0.16, 0.34);
        }
      });
    },
    desenhar(j, ctx) {
      const L = j.largura;
      const A = j.altura;

      const ceu = ctx.createLinearGradient(0, 0, 0, A);
      ceu.addColorStop(0, "#3f9fe0");
      ceu.addColorStop(0.45, "#9ed9ff");
      ceu.addColorStop(0.8, "#e8f9ff");
      ceu.addColorStop(1, "#bfe9ff");
      ctx.fillStyle = ceu;
      ctx.fillRect(0, 0, L, A);

      const sol = ctx.createRadialGradient(L * 0.16, A * 0.2, 10, L * 0.16, A * 0.2, 320);
      sol.addColorStop(0, "rgba(255,255,255,0.9)");
      sol.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sol;
      ctx.fillRect(0, 0, L, A);

      // nuvens do fundo (parallax)
      ctx.save();
      ctx.globalAlpha = 0.85;
      nuvensFundo.forEach((n) => {
        const img = n.img;
        if (pronta(img)) {
          const f = fonte(img);
          const alt = (n.tamanho * (img.naturalHeight || f.height)) / (img.naturalWidth || f.width);
          ctx.drawImage(f, n.x, n.y, n.tamanho, alt);
        } else {
          j.bolha(ctx, n.x + n.tamanho / 2, n.y + n.tamanho / 2, n.tamanho / 2.4, 0.5, 200);
        }
      });
      ctx.restore();

      // água no rodapé
      const agua = ctx.createLinearGradient(0, A - 90, 0, A);
      agua.addColorStop(0, "rgba(150,225,255,0.75)");
      agua.addColorStop(1, "rgba(52,150,215,0.9)");
      ctx.fillStyle = agua;
      ctx.fillRect(0, A - 70, L, 70);
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 8; i++) {
        const x = ((i * 170 + estado.distancia * 0.5) % (L + 200)) - 100;
        ctx.beginPath();
        ctx.ellipse(x, A - 40, 60, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fill();
      }
      ctx.restore();

      // aviões de fundo
      avioesFundo.forEach((a) => {
        if (!pronta(a.img)) return;
        const f = fonte(a.img);
        const larg = a.altura * (a.img.naturalWidth / a.img.naturalHeight);
        ctx.save();
        ctx.globalAlpha = a.alfa;
        ctx.drawImage(f, a.x, a.y, larg, a.altura);
        ctx.restore();
      });

      // entidades
      entidades.forEach((e) => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.giro * 0.2);
        const img = e.img;
        if (pronta(img)) {
          const proporcao = img.naturalWidth / img.naturalHeight;
          const alt = e.r * 2;
          ctx.drawImage(fonte(img), (-alt * proporcao) / 2, -alt / 2, alt * proporcao, alt);
        } else {
          ctx.fillStyle = e.tipo === "perigo" ? "rgba(20,60,110,0.6)" : "rgba(255,255,255,0.8)";
          ctx.beginPath();
          ctx.arc(0, 0, e.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        if (e.tipo === "balao") {
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r * 1.06, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.55)";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        if (e.tipo === "perigo") {
          const g = ctx.createRadialGradient(e.x, e.y, e.r * 0.2, e.x, e.y, e.r * 1.5);
          g.addColorStop(0, "rgba(20,50,90,0.35)");
          g.addColorStop(1, "rgba(20,50,90,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // rastro do planador
      ctx.save();
      ctx.globalAlpha = 0.7;
      const rastro = ctx.createLinearGradient(estado.x - 180, estado.y, estado.x, estado.y);
      rastro.addColorStop(0, "rgba(255,255,255,0)");
      rastro.addColorStop(1, "rgba(255,255,255,0.85)");
      ctx.strokeStyle = rastro;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(estado.x - 190, estado.y + 6);
      ctx.quadraticCurveTo(estado.x - 90, estado.y + 16, estado.x - 24, estado.y + 2);
      ctx.stroke();
      ctx.restore();

      // planador
      const piscando = estado.invencivel > 0 && Math.floor(estado.invencivel * 9) % 2 === 0;
      const aviao = sprites.avioes.length ? sprites.avioes[0] : null;
      const fonteAviao = fonte(aviao);
      ctx.save();
      ctx.globalAlpha = piscando ? 0.35 : 1;
      ctx.translate(estado.x, estado.y);
      ctx.rotate(limitar(estado.vy / 1200, -0.24, 0.24));
      if (pronta(aviao)) {
        const alt = 86;
        const larg = alt * (aviao.naturalWidth / aviao.naturalHeight);
        ctx.drawImage(fonteAviao, -larg / 2, -alt / 2, larg, alt);
      } else {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(60, 0);
        ctx.lineTo(-42, -30);
        ctx.lineTo(-22, 0);
        ctx.lineTo(-42, 30);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // escudo
      if (estado.escudo > 0) {
        ctx.beginPath();
        ctx.arc(estado.x, estado.y, 74, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(140,255,180,${0.5 + 0.3 * Math.sin(performance.now() / 120)})`;
        ctx.lineWidth = 6;
        ctx.stroke();
      }

      // vidas
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(L - 44 - i * 40, 44, 13, 0, Math.PI * 2);
        ctx.fillStyle = i < estado.vidas ? "rgba(255,110,130,0.95)" : "rgba(255,255,255,0.35)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.stroke();
      }
      j.texto(ctx, "distância " + Math.round(estado.distancia / 10) + " m", 24, A - 26, {
        tamanho: 26,
        alinhamento: "left",
      });
    },
    aoTerminar(j) {
      j.guardarRecorde("Piloto");
    },
  });

  /* ---------- estado ---------- */
  const estado = { x: 260, y: 400, vy: 0, vidas: 3, invencivel: 0, escudo: 0, distancia: 0, velocidade: 270, coletados: 0 };
  const entidades = [];
  const nuvensFundo = [];
  let tempoSpawn = 0;

  function criarEntidade(j) {
    const r = Math.random();
    const tipo = r < 0.58 ? "balao" : r < 0.78 ? "bonus" : "perigo";
    const lista = tipo === "balao" ? sprites.baloes : tipo === "bonus" ? sprites.bonus : sprites.perigos;
    const img = lista.length ? lista[inteiro(0, lista.length - 1)] : null;
    const A = j.altura;
    return {
      tipo,
      img,
      x: j.largura + aleatorio(40, 220),
      y: aleatorio(110, A - 150),
      r: tipo === "perigo" ? aleatorio(38, 62) : aleatorio(30, 48),
      giro: 0,
      giroVel: aleatorio(-0.4, 0.4),
      escalaVel: tipo === "perigo" ? aleatorio(1, 1.3) : aleatorio(0.85, 1.15),
    };
  }

  const avioesFundo = [];

  /* três aviões ao fundo, sempre a mesma imagem (airplanes_2) em escalas
     diferentes: sugere o corredor aéreo sem custo de desenho */
  function prepararAvioesFundo() {
    avioesFundo.length = 0;
    for (let i = 0; i < 3; i++) {
      avioesFundo.push({
        img: sprites.avioes[0] || null,
        x: aleatorio(200, 1400),
        y: aleatorio(90, 620),
        altura: aleatorio(26, 46),
        vel: aleatorio(0.22, 0.5),
        alfa: aleatorio(0.16, 0.34),
      });
    }
  }

  function prepararNuvens() {
    nuvensFundo.length = 0;
    for (let i = 0; i < 9; i++) {
      const img = sprites.nuvens.length ? sprites.nuvens[i % sprites.nuvens.length] : null;
      nuvensFundo.push({
        img,
        x: aleatorio(-200, 1400),
        y: aleatorio(30, 700),
        tamanho: aleatorio(120, 300),
        vel: aleatorio(0.12, 0.4),
      });
    }
  }

  if (jogo) {
    jogo.displayVidas = function () {
      const alvo = document.querySelector("[data-hud='vidas']");
      if (alvo) alvo.textContent = String(Math.max(0, estado.vidas));
    };
    const comecarOriginal = jogo.comecar.bind(jogo);
    jogo.comecar = function () {
      prepararNuvens();
      prepararAvioesFundo();
      comecarOriginal();
      // recarrega sprites que possam ter falhado
      if (!sprites.avioes.length) carregarSprites();
    };
    prepararNuvens();
    jogo.displayVidas();
  }
})();
