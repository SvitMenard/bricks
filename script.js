/* =========================================================
   The Bricks – script.js
   Breakout igra z 5 unikatnimi nivoji, težavnostjo,
   bonus opekami, shranjevanjem rezultata in pavzo.
   ========================================================= */

"use strict";

// ─── CANVAS & KONTEKST ───────────────────────────────────
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

const W = canvas.width;   // širina platna (700)
const H = canvas.height;  // višina platna (500)

// ─── ZASLONI & ELEMENTI ──────────────────────────────────
const screens = {
  main:         document.getElementById("mainMenu"),
  instructions: document.getElementById("instructionsScreen"),
  game:         document.getElementById("gameScreen"),
};

const overlays = {
  pause:    document.getElementById("pauseOverlay"),
  gameOver: document.getElementById("gameOverOverlay"),
  level:    document.getElementById("levelOverlay"),
};

// HUD elementi
const hudScore = document.getElementById("hudScore");
const hudTime  = document.getElementById("hudTime");
const hudLevel = document.getElementById("hudLevel");
const hudBest  = document.getElementById("hudBest");

// Elementi za konec igre
const finalScore    = document.getElementById("finalScore");
const finalTime     = document.getElementById("finalTime");
const finalLevel    = document.getElementById("finalLevel");
const newBestMsg    = document.getElementById("newBestMsg");
const gameOverTitle = document.getElementById("gameOverTitle");

// Elementi za prehod med nivoji
const levelTitle    = document.getElementById("levelTitle");
const levelScore    = document.getElementById("levelScore");
const levelBonusMsg = document.getElementById("levelBonusMsg");
const nextLevelNum  = document.getElementById("nextLevelNum");

// Meni – prikaz najboljšega
const menuBestScore = document.getElementById("menuBestScore");

// Izbira težavnosti
const difficultySelect = document.getElementById("difficultySelect");

// ─── NASTAVITVE TEŽAVNOSTI ────────────────────────────────
/*
  baseSpeed : začetna hitrost žogice
  speedStep : povečanje hitrosti na vsak nivo
  ballSize  : polmer žogice
  paddleW   : širina plošče
*/
const DIFFICULTY = {
  easy:   { baseSpeed: 3.2, speedStep: 0.25, ballSize: 10, paddleW: 120 },
  medium: { baseSpeed: 4.5, speedStep: 0.45, ballSize: 9,  paddleW: 90  },
  hard:   { baseSpeed: 6.0, speedStep: 0.70, ballSize: 8,  paddleW: 68  },
};

// ─── DEFINICIJA VRST OPEK ────────────────────────────────
/*
  normal – 10 točk, 1 udarec (modra)
  tough  – 20 točk, 2 udarca  (rdeča)
  bonus  – 50 točk, 1 udarec  (zlata ⭐)
  empty  – prazno polje (ni opeke)
*/
const BRICK_TYPES = {
  normal: { points: 10, hits: 1, color: "#4361ee", borderColor: "#3a0ca3" },
  tough:  { points: 20, hits: 2, color: "#f94144", borderColor: "#9d0208" },
  bonus:  { points: 50, hits: 1, color: "#f9c74f", borderColor: "#e07b00" },
};

// ─── DIMENZIJE OPEK ──────────────────────────────────────
const BRICK_W    = 56;   // širina opeke
const BRICK_H    = 22;   // višina opeke
const BRICK_PADX = 8;    // razmak med opekama (x)
const BRICK_PADY = 8;    // razmak med opekama (y)
const OFFSET_X   = 28;   // zamik od leve strani
const OFFSET_Y   = 50;   // zamik od vrha platna

/*
  Skupaj stolpcev pri širini 700:
  28 + 10 * (56 + 8) - 8 = 28 + 640 - 8 = 660 → ustreza
  Uporabimo 10 stolpcev.
*/
const COLS = 10;

// ─── VZORCI NIVOJEV ──────────────────────────────────────
/*
  Vsak nivo je definiran kot 2D polje znakov:
    'N' = normal opeka
    'T' = tough opeka
    'B' = bonus opeka
    '.' = prazno polje
  Polje ima COLS (10) stolpcev.
  Število vrstic je poljubno (vsaj 4, največ 8).
*/
const LEVEL_MAPS = [

  // ── NIVO 1 – Klasična polna mreža ─────────────────────
  [
    ["N","N","N","N","N","N","N","N","N","N"],
    ["N","N","N","N","N","N","N","N","N","N"],
    ["T","N","N","T","N","N","T","N","N","T"],
    ["N","N","N","N","N","N","N","N","N","N"],
    ["B","N","N","B","N","N","B","N","N","B"],
  ],

  // ── NIVO 2 – Piramida ─────────────────────────────────
  [
    [".",".",".",".",".",".",".",".",".","T"],
    [".",".",".",".",".",".",".","T","T","."],
    [".",".",".",".",".",".","T","N","T","."],
    [".",".",".",".",".","T","N","N","N","T"],
    [".",".",".",".","T","N","N","N","N","N"],
    [".",".",".","T","N","N","B","N","N","N"],
    [".",".","T","N","N","N","N","N","N","N"],
    [".","T","N","N","N","N","N","N","B","N"],
  ],

  // ── NIVO 3 – Diamant / romb ───────────────────────────
  [
    [".",".",".",".",".","B",".",".",".","."],
    [".",".",".",".","N","N","N",".",".","."],
    [".",".",".","N","T","N","T","N",".","."],
    [".",".","N","T","N","N","N","T","N","."],
    [".","N","T","N","N","B","N","N","T","N"],
    [".",".","N","T","N","N","N","T","N","."],
    [".",".",".","N","T","N","T","N",".","."],
    [".",".",".",".","N","N","N",".",".","."],
  ],

  // ── NIVO 4 – Šahovnica z bonus pasovi ────────────────
  [
    ["N",".","N",".","N",".","N",".","N","."],
    [".","T",".","T",".","T",".","T",".","T"],
    ["N",".","B",".","N",".","B",".","N","."],
    [".","T",".","T",".","T",".","T",".","T"],
    ["N",".","N",".","B",".","N",".","N","."],
    [".","T",".","T",".","T",".","T",".","T"],
    ["B",".","N",".","N",".","N",".","B","."],
  ],

  // ── NIVO 5 – Trdnjava (bonus v sredini) ───────────────
  [
    ["T","T","T","T","T","T","T","T","T","T"],
    ["T",".",".",".",".",".",".",".",".","T"],
    ["T",".","N","N","N","N","N","N",".","T"],
    ["T",".","N","B","T","T","B","N",".","T"],
    ["T",".","N","T","B","B","T","N",".","T"],
    ["T",".","N","B","T","T","B","N",".","T"],
    ["T",".","N","N","N","N","N","N",".","T"],
    ["T",".",".",".",".",".",".",".",".","T"],
    ["T","T","T","T","T","T","T","T","T","T"],
  ],
];

const MAX_LEVELS = LEVEL_MAPS.length; // = 5

// ─── STANJE IGRE ─────────────────────────────────────────
let state = {
  score:         0,
  level:         1,      // 1-osnovan (1 = prvi nivo)
  lives:         3,
  startTime:     null,   // Date.now() ob zadnjem zagonu/nadaljevanju
  elapsed:       0,      // skupen čas v ms (brez pavze)
  paused:        false,
  running:       false,
  difficulty:    "medium",
  animFrame:     null,
  timerInterval: null,
};

// Najboljši rezultat – trajno v localStorage
let bestScore = parseInt(localStorage.getItem("bricksBest") || "0");

// ─── OBJEKTI IGRE ─────────────────────────────────────────
let ball   = {};
let paddle = {};
let bricks = [];

// Vhod
let mouse = { x: W / 2 };
let keys  = { left: false, right: false };

// ─── POMOŽNE FUNKCIJE ─────────────────────────────────────

/** Formatira milisekunde v obliko m:ss */
function formatTime(ms) {
  const s   = Math.floor(ms / 1000);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/** Pokaže določen zaslon, skrije ostale */
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/** Pokaže overlay */
function showOverlay(name) {
  overlays[name].classList.remove("hidden");
}

/** Skrije overlay */
function hideOverlay(name) {
  overlays[name].classList.add("hidden");
}

/** Posodobi prikaz najboljšega rezultata */
function updateBestDisplay() {
  hudBest.textContent       = bestScore;
  menuBestScore.textContent = bestScore;
}

// ─── GRADNJA OPEK IZ VZORCA ───────────────────────────────
/**
 * Prebere vzorec nivoja iz LEVEL_MAPS in ustvari seznam opek.
 * Nivo je 1-osnovan (level 1 = LEVEL_MAPS[0]).
 */
function buildBricks() {
  bricks = [];

  // Vzorec za trenutni nivo (modulo, da ne gre čez meje)
  const mapIndex = (state.level - 1) % MAX_LEVELS;
  const map      = LEVEL_MAPS[mapIndex];

  map.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === ".") return; // prazno polje

      const typeName = cell === "N" ? "normal"
                     : cell === "T" ? "tough"
                     :                "bonus";

      bricks.push({
        x:        OFFSET_X + c * (BRICK_W + BRICK_PADX),
        y:        OFFSET_Y + r * (BRICK_H + BRICK_PADY),
        w:        BRICK_W,
        h:        BRICK_H,
        type:     typeName,
        hitsLeft: BRICK_TYPES[typeName].hits,
        alive:    true,
      });
    });
  });
}

// ─── INICIALIZACIJA ŽOGICE IN PLOŠČE ──────────────────────
function initBallPaddle() {
  const cfg = DIFFICULTY[state.difficulty];
  // Hitrost narašča z nivojem
  const spd = cfg.baseSpeed + (state.level - 1) * cfg.speedStep;

  paddle = {
    w:     cfg.paddleW,
    h:     14,
    x:     W / 2 - cfg.paddleW / 2,
    y:     H - 36,
    speed: 7,
  };

  ball = {
    r:     cfg.ballSize,
    x:     W / 2,
    y:     H - 60,
    dx:    spd * (Math.random() < 0.5 ? 1 : -1),
    dy:    -spd,
    speed: spd,
  };
}

// ─── RISANJE ─────────────────────────────────────────────

/** Nariše zaobljeni pravokotnik */
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y,         x + r, y);
  ctx.closePath();
}

/** Nariše vse žive opeke */
function drawBricks() {
  bricks.forEach(b => {
    if (!b.alive) return;

    const def = BRICK_TYPES[b.type];
    let fillColor = def.color;

    // Tough opeka po prvem udarcu postane svetlejša
    if (b.type === "tough" && b.hitsLeft === 1) {
      fillColor = "#ff7b7b";
    }

    ctx.shadowColor = def.borderColor;
    ctx.shadowBlur  = 8;

    ctx.fillStyle = fillColor;
    roundRect(b.x, b.y, b.w, b.h, 7);
    ctx.fill();

    ctx.strokeStyle = def.borderColor;
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Ikona na posebnih opekah
    if (b.type === "bonus") {
      ctx.fillStyle    = "#fff";
      ctx.font         = `${b.h * 0.62}px sans-serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⭐", b.x + b.w / 2, b.y + b.h / 2);
    } else if (b.type === "tough" && b.hitsLeft === 2) {
      ctx.fillStyle    = "rgba(255,255,255,0.22)";
      ctx.font         = `bold ${b.h * 0.55}px sans-serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("❤️", b.x + b.w / 2, b.y + b.h / 2);
    }
  });
}

/** Nariše ploščo */
function drawPaddle() {
  const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
  grad.addColorStop(0, "#7209b7");
  grad.addColorStop(1, "#3a0ca3");

  ctx.shadowColor = "#7209b7";
  ctx.shadowBlur  = 14;
  ctx.fillStyle   = grad;
  roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 8);
  ctx.fill();

  ctx.strokeStyle = "#b5179e";
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.shadowBlur  = 0;
}

/** Nariše žogico */
function drawBall() {
  const grad = ctx.createRadialGradient(
    ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.1,
    ball.x, ball.y, ball.r
  );
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#43b4f9");

  ctx.shadowColor = "#43b4f9";
  ctx.shadowBlur  = 18;
  ctx.fillStyle   = grad;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur  = 0;
}

/** Nariše življenja */
function drawLives() {
  ctx.fillStyle    = "#f94144";
  ctx.font         = "18px sans-serif";
  ctx.textAlign    = "right";
  ctx.textBaseline = "top";
  ctx.fillText("❤️".repeat(state.lives), W - 10, 8);
}

/** Nariše številko nivoja v spodnjem levem kotu platna */
function drawLevelBadge() {
  ctx.fillStyle    = "rgba(255,255,255,0.08)";
  ctx.font         = "bold 13px Segoe UI";
  ctx.textAlign    = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(`NIVO ${state.level} / ${MAX_LEVELS}`, 10, H - 8);
}

/** Počisti platno */
function clearCanvas() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#11112a";
  ctx.fillRect(0, 0, W, H);
}

// ─── FIZIKA & TRKI ────────────────────────────────────────

/** Premakne žogico in preverja trke */
function moveBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Stranski steni
  if (ball.x - ball.r <= 0) {
    ball.x  = ball.r;
    ball.dx = Math.abs(ball.dx);
  }
  if (ball.x + ball.r >= W) {
    ball.x  = W - ball.r;
    ball.dx = -Math.abs(ball.dx);
  }

  // Zgornja stena
  if (ball.y - ball.r <= 0) {
    ball.y  = ball.r;
    ball.dy = Math.abs(ball.dy);
  }

  // Spodnji rob → izguba življenja
  if (ball.y + ball.r > H) {
    loseLife();
    return;
  }

  // Trk s ploščo
  if (
    ball.dy > 0 &&
    ball.y + ball.r >= paddle.y &&
    ball.y + ball.r <= paddle.y + paddle.h + Math.abs(ball.dy) &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w
  ) {
    const hitPos   = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const maxAngle = Math.PI / 3;
    const angle    = hitPos * maxAngle;
    const spd      = Math.hypot(ball.dx, ball.dy);

    ball.dx = spd * Math.sin(angle);
    ball.dy = -Math.abs(spd * Math.cos(angle));
    ball.y  = paddle.y - ball.r;
  }

  // Trki z opekmi
  checkBrickCollisions();
}

/** Preverja trke žogice z opekmi (AABB) */
function checkBrickCollisions() {
  for (const b of bricks) {
    if (!b.alive) continue;

    if (
      ball.x + ball.r > b.x &&
      ball.x - ball.r < b.x + b.w &&
      ball.y + ball.r > b.y &&
      ball.y - ball.r < b.y + b.h
    ) {
      // Smer odboja glede na minimalni overlay
      const overlapLeft   = ball.x + ball.r - b.x;
      const overlapRight  = b.x + b.w - (ball.x - ball.r);
      const overlapTop    = ball.y + ball.r - b.y;
      const overlapBottom = b.y + b.h - (ball.y - ball.r);

      if (Math.min(overlapLeft, overlapRight) < Math.min(overlapTop, overlapBottom)) {
        ball.dx = -ball.dx;
      } else {
        ball.dy = -ball.dy;
      }

      b.hitsLeft--;
      if (b.hitsLeft <= 0) {
        b.alive = false;
        state.score += BRICK_TYPES[b.type].points;
        hudScore.textContent = state.score;
      }

      break; // en trk na sličico
    }
  }

  // Vse opeke uničene → prehod na naslednji nivo
  if (bricks.every(b => !b.alive)) {
    levelComplete();
  }
}

/** Premakne ploščo */
function movePaddle() {
  // Če pritisneš tipke → ignoriraj miško
  if (keys.left || keys.right) {
    if (keys.left)  paddle.x -= paddle.speed;
    if (keys.right) paddle.x += paddle.speed;
  } else if (mouse.x !== null) {
    // Miška samo če ni tipk
    paddle.x = mouse.x - paddle.w / 2;
  }

  // Omejitev na robove
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
}

// ─── ŽIVLJENJA, NIVOJI, KONEC ─────────────────────────────

/** Klic ob padcu žogice čez spodnji rob */
function loseLife() {
  state.lives--;

  if (state.lives <= 0) {
    endGame(false);
    return;
  }

  initBallPaddle();
}

/**
 * Klic ob uničenju vseh opek.
 * Prikaže overlay za prehod ali zaključi igro, če smo na zadnjem nivoju.
 */
function levelComplete() {
  // Ustavimo zanko
  cancelAnimationFrame(state.animFrame);
  state.running = false;

  // Posodobimo skupni čas
  if (state.startTime) {
    state.elapsed  += Date.now() - state.startTime;
    state.startTime = null;
  }

  // Bonus točke za zaključen nivo
  const bonus = state.level * 50;
  state.score += bonus;
  hudScore.textContent = state.score;

  if (state.level >= MAX_LEVELS) {
    // Zadnji nivo – zmaga!
    endGame(true);
    return;
  }

  // Prikažemo overlay za prehod med nivoji
  levelTitle.textContent    = `🌟 Nivo ${state.level} končan!`;
  levelScore.textContent    = state.score;
  levelBonusMsg.textContent = `+${bonus} bonus točk za zaključen nivo!`;
  nextLevelNum.textContent  = state.level + 1;
  showOverlay("level");
}

/** Začne naslednji nivo (klic iz gumba "Naslednji nivo") */
function goNextLevel() {
  hideOverlay("level");

  state.level++;
  hudLevel.textContent = state.level;
  state.running = true;

  buildBricks();
  initBallPaddle();

  // Znova zaženemo timer in zanko
  state.startTime = Date.now();
  gameLoop();
}

/** Konec igre – won = true (zmaga) / false (poraz) */
function endGame(won) {
  state.running = false;
  cancelAnimationFrame(state.animFrame);
  stopTimer();

  // Zaključimo merjenje časa
  if (state.startTime) {
    state.elapsed  += Date.now() - state.startTime;
    state.startTime = null;
  }

  // Preverimo in shranimo najboljši rezultat
  const isNew = state.score > bestScore;
  if (isNew) {
    bestScore = state.score;
    localStorage.setItem("bricksBest", bestScore);
    updateBestDisplay();
  }

  // Napolnimo overlay za konec igre
  gameOverTitle.textContent = won ? "🎉 Zmaga! Vse opeke uničene!" : "💀 Konec igre";
  finalScore.textContent    = state.score;
  finalTime.textContent     = formatTime(state.elapsed);
  finalLevel.textContent    = state.level;
  newBestMsg.classList.toggle("hidden", !isNew);

  showOverlay("gameOver");
}

/** Vrne v glavni meni */
function goToMenu() {
  state.running = false;
  cancelAnimationFrame(state.animFrame);
  stopTimer();
  hideOverlay("pause");
  hideOverlay("gameOver");
  hideOverlay("level");
  updateBestDisplay();
  showScreen("main");
}

// ─── PAVZA ────────────────────────────────────────────────

function togglePause() {
  if (!state.running && !state.paused) return;

  if (state.paused) {
    // Nadaljevanje
    state.paused    = false;
    state.startTime = Date.now();
    hideOverlay("pause");
    state.running   = true;
    gameLoop();
  } else {
    // Pavza
    if (state.startTime) {
      state.elapsed  += Date.now() - state.startTime;
      state.startTime = null;
    }
    state.paused  = true;
    state.running = false;
    cancelAnimationFrame(state.animFrame);
    showOverlay("pause");
  }
}

// ─── MERJENJE ČASA ────────────────────────────────────────

/** Zažene interval, ki vsako pol sekunde posodobi HUD */
function startTimer() {
  state.startTime    = Date.now();
  state.timerInterval = setInterval(() => {
    if (state.running && !state.paused && state.startTime) {
      const now       = Date.now();
      const delta     = now - state.startTime;
      state.startTime = now;
      state.elapsed  += delta;
      hudTime.textContent = formatTime(state.elapsed);
    }
  }, 500);
}

/** Ustavi interval */
function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

// ─── GLAVNA ZANKA ─────────────────────────────────────────

function gameLoop() {
  if (!state.running || state.paused) return;

  clearCanvas();

  movePaddle();
  moveBall();

  drawBricks();
  drawPaddle();
  drawBall();
  drawLives();
  drawLevelBadge();

  state.animFrame = requestAnimationFrame(gameLoop);
}

// ─── ZAGON IGRE ───────────────────────────────────────────

/** Začne novo igro od nivoja 1 */
function startGame() {
  cancelAnimationFrame(state.animFrame);
  stopTimer();
  hideOverlay("pause");
  hideOverlay("gameOver");
  hideOverlay("level");

  state.score      = 0;
  state.level      = 1;
  state.lives      = 3;
  state.elapsed    = 0;
  state.paused     = false;
  state.running    = true;
  state.startTime  = null;
  state.difficulty = difficultySelect.value;

  hudScore.textContent = 0;
  hudLevel.textContent = 1;
  hudTime.textContent  = "0:00";
  updateBestDisplay();

  buildBricks();
  initBallPaddle();

  showScreen("game");
  startTimer();
  gameLoop();
}

// ─── DOGODKI – MENI ───────────────────────────────────────

document.getElementById("btnStart")
  .addEventListener("click", startGame);

document.getElementById("btnInstructions")
  .addEventListener("click", () => showScreen("instructions"));

document.getElementById("btnBackMenu")
  .addEventListener("click", () => showScreen("main"));

// ─── DOGODKI – MED IGRO ───────────────────────────────────

document.getElementById("btnPause")
  .addEventListener("click", togglePause);

document.getElementById("btnRestart")
  .addEventListener("click", startGame);

document.getElementById("btnMenu")
  .addEventListener("click", goToMenu);

// ─── DOGODKI – PAVZA ──────────────────────────────────────

document.getElementById("btnResume")
  .addEventListener("click", togglePause);

document.getElementById("btnRestartPause")
  .addEventListener("click", startGame);

document.getElementById("btnMenuPause")
  .addEventListener("click", goToMenu);

// ─── DOGODKI – PREHOD MED NIVOJI ──────────────────────────

document.getElementById("btnNextLevel")
  .addEventListener("click", goNextLevel);

// ─── DOGODKI – KONEC IGRE ─────────────────────────────────

document.getElementById("btnPlayAgain")
  .addEventListener("click", startGame);

document.getElementById("btnMenuOver")
  .addEventListener("click", goToMenu);

// ─── TIPKOVNICA ───────────────────────────────────────────

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft"  || e.key === "a") keys.left  = true;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
  if (e.key === "p" || e.key === "P" || e.key === "Escape") togglePause();
});

document.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft"  || e.key === "a") keys.left  = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
});

// ─── MIŠKA & DOTIK ────────────────────────────────────────

canvas.addEventListener("mousemove", e => {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  mouse.x = (e.clientX - rect.left) * scaleX;
});

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const rect   = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  mouse.x = (e.touches[0].clientX - rect.left) * scaleX;
}, { passive: false });

// ─── INICIALIZACIJA ───────────────────────────────────────
updateBestDisplay();
showScreen("main");
