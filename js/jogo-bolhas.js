/* ==========================================================================
   FGAero Land 2000 — jogo-bolhas.js
   Estoura-Bolhas Aero: 60 segundos, combos, bolhas douradas e bolhas
   "pesadas" que custam pontos. Sumiu da tela, perdeu a chance.
   ========================================================================== */
(function () {
  "use strict";
  const FGA = window.FGA || {};
  const { inteiro, aleatorio, limitar, escolher } = FGA.util;

  const jogo = FGA.criarJogo({
    nome: "bolhas",
    canvas: "#palcoBolhas",
    largura: 1280,
    altura: 800,
    duracao: 60,
    tituloTela: "🫧 Estoura-Bolhas Aero",
    texto: "São <strong>60 segundos</strong> para estourar o máximo de bolhas de sabão.",
    dicas: [
      "Clique/toque numa <strong>bolha clara</strong> para ganhar <strong>+10</strong>.",
      "A <strong>bolha dourada</strong> vale <strong>+50</strong> e dá <strong>+2 segundos</strong>.",
      "A <strong>bolha azul-escura</strong> custa <strong>−15</strong>. Não estoure!",
      "Estourar em sequência rápida acumula <strong>combo até x4</strong>.",
      "Tecla <strong>P</strong> pausa; a página pausa sozinha se você sair dele.",
    ],
    teclas: [" "],
    iniciar(j) {
      j.atualizarHUD();
    },
    atualizar(j, dt) {
      bolhas.forEach((b) => {
        b.y -= b.vel * dt;
        b.x += Math.sin(b.fase) * b.balanco * dt;
        b.fase += dt * 1.4;
        if (b.y + b.r < -20) {
          if (b.tipo === "dourada") j.pontoFlutuante(b.x, 40, "escapou!", true);
          Object.assign(b, novaBolha(false));
        }
      });
      // combo decai
      if (combo.tempo > 0) {
        combo.tempo -= dt;
        if (combo.tempo <= 0 && combo.n > 1) {
          combo.n = 1;
        }
      }
      particulas.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 620 * dt;
        p.vida -= dt;
      });
      particulas = particulas.filter((p) => p.vida > 0);
      tremor = Math.max(0, tremor - dt * 26);
      fundo.t += dt;
    },
    desenhar(j, ctx) {
      const L = j.largura;
      const A = j.altura;

      // céu com gradiente
      const ceu = ctx.createLinearGradient(0, 0, 0, A);
      ceu.addColorStop(0, "#4aa8e8");
      ceu.addColorStop(0.42, "#a3dcff");
      ceu.addColorStop(0.78, "#e6f8ff");
      ceu.addColorStop(1, "#c8eb9e");
      ctx.fillStyle = ceu;
      ctx.fillRect(0, 0, L, A);

      // sol com brilho
      const sol = ctx.createRadialGradient(L * 0.82, A * 0.14, 10, L * 0.82, A * 0.14, 260);
      sol.addColorStop(0, "rgba(255,255,255,0.95)");
      sol.addColorStop(0.35, "rgba(255,247,205,0.55)");
      sol.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sol;
      ctx.beginPath();
      ctx.arc(L * 0.82, A * 0.14, 260, 0, Math.PI * 2);
      ctx.fill();

      // montanhas de vidro
      ctx.save();
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = "#2f7fc4";
      for (let i = 0; i < 3; i++) {
        const base = A * (0.72 + i * 0.06);
        const desloc = ((fundo.t * (10 + i * 6)) % (L + 400)) - 200;
        ctx.beginPath();
        ctx.moveTo(-100 + desloc, base);
        ctx.quadraticCurveTo(L * 0.25 + desloc, base - 150 - i * 24, L * 0.5 + desloc, base);
        ctx.quadraticCurveTo(L * 0.72 + desloc, base - 110 - i * 18, L + 100 + desloc, base);
        ctx.lineTo(L + 100, A);
        ctx.lineTo(-100, A);
        ctx.fill();
      }
      ctx.restore();

      // grama
      const grama = ctx.createLinearGradient(0, A * 0.84, 0, A);
      grama.addColorStop(0, "rgba(180,235,140,0.85)");
      grama.addColorStop(1, "rgba(96,175,70,0.95)");
      ctx.fillStyle = grama;
      ctx.fillRect(0, A * 0.87, L, A * 0.13);

      ctx.save();
      ctx.translate(tremor ? aleatorio(-tremor, tremor) : 0, tremor ? aleatorio(-tremor, tremor) : 0);

      // bolhas
      bolhas.forEach((b) => {
        if (b.tipo === "dourada") {
          const g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r);
          g.addColorStop(0, "rgba(255,255,255,0.98)");
          g.addColorStop(0.42, "rgba(255,236,150,0.75)");
          g.addColorStop(0.88, "rgba(240,190,60,0.5)");
          g.addColorStop(1, "rgba(255,255,255,0.05)");
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = "rgba(255,236,150,0.95)";
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.34, Math.max(2, b.r * 0.2), 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fill();
        } else if (b.tipo === "pesada") {
          j.bolha(ctx, b.x, b.y, b.r, 0.95, 222);
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 0.98, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(12,50,110,0.75)";
          ctx.lineWidth = 3;
          ctx.setLineDash([7, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          j.bolha(ctx, b.x, b.y, b.r, 0.9, 196);
        }
      });

      // partículas
      particulas.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230,248,255,${limitar(p.vida / p.vidaMax, 0, 1) * 0.9})`;
        ctx.fill();
      });
      ctx.restore();

      // combo
      if (combo.n > 1) {
        j.texto(ctx, "COMBO x" + combo.n, L / 2, 74, { tamanho: 54, cor: "#fff8cf" });
      }
      if (j.estado === "jogando") {
        j.texto(ctx, "Pontos: " + Math.round(j.pontos), 24, 34, { tamanho: 30, alinhamento: "left" });
      }
      if (!jogo.pontos && j.estado === "parado") {
        j.texto(ctx, "clique nas bolhas!", L / 2, A / 2 + 180, { tamanho: 32 });
      }
    },
    aoClicar(j, x, y) {
      if (j.estado !== "jogando") {
        if (j.estado === "parado" || j.estado === "fim") j.comecar();
        return;
      }
      // procura a bolha mais próxima do clique (de cima para baixo)
      let alvo = null;
      for (let i = bolhas.length - 1; i >= 0; i--) {
        const b = bolhas[i];
        const d = Math.hypot(b.x - x, b.y - y);
        if (d <= b.r * 1.12) {
          alvo = b;
          break;
        }
      }
      if (!alvo) {
        j.som("clique");
        return;
      }
      estourar(j, alvo);
    },
  });

  /* ---------- estado ---------- */
  let bolhas = [];
  let particulas = [];
  const combo = { n: 1, tempo: 0 };
  let tremor = 0;
  const fundo = { t: 0 };
  const MAX = 26;

  function novaBolha(espalhar) {
    const r = aleatorio(26, 58);
    const sorte = Math.random();
    const tipo = sorte < 0.09 ? "dourada" : sorte < 0.26 ? "pesada" : "normal";
    const largura = 1280;
    const altura = 800;
    return {
      x: aleatorio(r + 10, largura - r - 10),
      y: espalhar ? aleatorio(0, altura) : altura + r * 1.4,
      r,
      tipo,
      vel: aleatorio(90, 190) * (tipo === "pesada" ? 0.75 : 1) * (1 + Math.min(0.7, jogo.pontos / 900)),
      balanco: aleatorio(16, 62),
      fase: aleatorio(0, Math.PI * 2),
    };
  }

  function estourar(j, b) {
    if (b.tipo === "pesada") {
      j.pontos = Math.max(0, j.pontos - 15);
      j.pontoFlutuante(b.x, b.y, "−15", false);
      j.som("erro");
      tremor = 12;
      combo.n = 1;
      combo.tempo = 0;
    } else {
      const ouro = b.tipo === "dourada";
      const ganho = (ouro ? 50 : 10) * combo.n;
      j.somar(ganho);
      j.pontoFlutuante(b.x, b.y, "+" + ganho, ouro);
      j.som(ouro ? "estrela" : "bolha");
      if (ouro) {
        j.tempo = Math.max(0, j.tempo - 2);
        j.pontoFlutuante(b.x, b.y - 34, "+2s", true);
      }
      combo.n = Math.min(4, combo.n + 1);
      combo.tempo = 1.25;
    }
    // respingos
    for (let i = 0; i < 12; i++) {
      particulas.push({
        x: b.x,
        y: b.y,
        r: aleatorio(1.6, 5),
        vx: aleatorio(-190, 190),
        vy: aleatorio(-260, -40),
        vida: aleatorio(0.35, 0.8),
        vidaMax: 0.8,
      });
    }
    // repõe a bolha
    const i = bolhas.indexOf(b);
    if (i >= 0) bolhas[i] = novaBolha(false);
  }

  function prepararBolhas() {
    bolhas = Array.from({ length: MAX }, (_, i) => {
      const b = novaBolha(i < 8);
      b.y = aleatorio(0, 800);
      return b;
    });
    particulas = [];
    combo.n = 1;
    combo.tempo = 0;
    tremor = 0;
  }

  if (jogo) {
    const comecarOriginal = jogo.comecar.bind(jogo);
    jogo.comecar = function () {
      prepararBolhas();
      comecarOriginal();
    };
    prepararBolhas();
  }
})();
