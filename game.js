const CANVAS_W = 800;
const CANVAS_H = 600;
const GRID = { cols: 10, rows: 6, w: 64, h: 20, gap: 4, x0: 62, y0: 60 };
const ROW_COLORS = ['red', 'yellow', 'green', 'cyan', 'magenta', 'hotpink']; // de arriba abajo
const PADDLE_KEY_SPEED = 8;          // px por cuadro
const BALL_SPEED = 3;                // px por cuadro
const BALL_ANGLE = Math.PI / 4;      // 45 grados respecto a la vertical, fijo
const RELAUNCH_DELAY_MS = 500;
const POINTS_PER_BRICK = 10;
const LIVES_START = 3;
const HIGH_SCORES_KEY = 'arkanoid:v1';
const HIGH_SCORES_MAX = 5;
const EXPLOSION_FRAME_MS = EXPLOSION_DURATION / 4; // 37.5 ms por frame
const LEVEL_COUNT = 3;
const SOUNDS = {
  bounce: 'assets/sounds/ball-bounce.mp3',
  break: 'assets/sounds/break-sound.mp3',
};
// 'X' = ladrillo, '.' = hueco. Una cadena por fila, de arriba abajo, 10 caracteres por cadena.
const LEVEL_PATTERNS = [
  // Nivel 1: 60 ladrillos. Grilla completa, igual que el MVP.
  ['XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX'],
  // Nivel 2: 45 ladrillos. Filas 0, 2 y 4 completas. Filas 1, 3 y 5 con ladrillos en las columnas 0, 2, 4, 6 y 8.
  ['XXXXXXXXXX', 'X.X.X.X.X.', 'XXXXXXXXXX', 'X.X.X.X.X.', 'XXXXXXXXXX', 'X.X.X.X.X.'],
  // Nivel 3: 48 ladrillos. Filas 0, 1, 4 y 5 completas. Filas 2 y 3 solo en las columnas 0, 1, 8 y 9.
  ['XXXXXXXXXX', 'XXXXXXXXXX', 'XX......XX', 'XX......XX', 'XXXXXXXXXX', 'XXXXXXXXXX'],
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {
  phase: 'esperando',   // 'esperando' | 'jugando' | 'fin'
  outcome: null,        // 'derrota' | 'victoria' | null
  highScores: loadHighScores(), // [{ score, date }], máximo 5, de mayor a menor
  score: 0,
  lives: LIVES_START,
  bricks: [],
  paddle: { x: 350, y: 560, w: 100, h: 14 },
  ball: { x: 0, y: 0, vx: 0, vy: 0, size: 16, attached: true },
  mouseMovedThisFrame: false,
  keys: { left: false, right: false },
  relaunchAt: 0,
  victoryAt: 0,        // timestamp (ms) desde el cual se muestra la victoria; 0 = no programada
  level: 1,            // 1 | 2 | 3, nivel en curso
  muted: false,        // true tras presionar M. Solo en memoria.
};

// Reproduce un sonido de SOUNDS. Crea un Audio nuevo para permitir sonidos superpuestos.
// Errores de carga o play() rechazado se ignoran: el juego sigue sin sonido.
function playSound(name) {
  if (state.muted) return;
  try {
    const audio = new Audio(SOUNDS[name]);
    const playing = audio.play();
    if (playing && typeof playing.catch === 'function') playing.catch(() => {});
  } catch (e) {
    // Audio no disponible: el juego sigue sin sonido.
  }
}

// Construye los ladrillos del nivel n desde LEVEL_PATTERNS y reinicia la pelota.
function loadLevel(n) {
  state.level = n;
  state.bricks = [];
  LEVEL_PATTERNS[n - 1].forEach((pattern, row) => {
    for (let col = 0; col < pattern.length; col++) {
      if (pattern[col] !== 'X') continue;
      state.bricks.push({
        col,
        row,
        x: GRID.x0 + col * (GRID.w + GRID.gap),
        y: GRID.y0 + row * (GRID.h + GRID.gap),
        w: GRID.w,
        h: GRID.h,
        color: ROW_COLORS[row],
        alive: true,
        explodingSince: null,
      });
    }
  });
  state.phase = 'esperando';
  state.ball.attached = true;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.relaunchAt = performance.now() + RELAUNCH_DELAY_MS;
  state.victoryAt = 0;
  placeBallOnPaddle();
}

function clampPaddle() {
  const p = state.paddle;
  p.x = Math.min(Math.max(p.x, 0), CANVAS_W - p.w);
}

function placeBallOnPaddle() {
  const p = state.paddle;
  const b = state.ball;
  b.x = p.x + p.w / 2 - b.size / 2;
  b.y = p.y - b.size;
}

function launchBall() {
  if (state.phase !== 'esperando') return;
  if (performance.now() < state.relaunchAt) return;
  const b = state.ball;
  b.vx = BALL_SPEED * Math.sin(BALL_ANGLE);   // hacia la derecha
  b.vy = -BALL_SPEED * Math.cos(BALL_ANGLE);  // hacia arriba
  b.attached = false;
  state.phase = 'jugando';
}

function update() {
  // Las flechas solo mueven el paddle en cuadros sin movimiento del mouse.
  if (!state.mouseMovedThisFrame) {
    if (state.keys.left) state.paddle.x -= PADDLE_KEY_SPEED;
    if (state.keys.right) state.paddle.x += PADDLE_KEY_SPEED;
    clampPaddle();
  }
  state.mouseMovedThisFrame = false;

  if (state.ball.attached) {
    placeBallOnPaddle();
  } else {
    const b = state.ball;
    b.x += b.vx;
    b.y += b.vy;
    bounceOffWalls();
    bounceOffPaddle();
    bounceOffBricks();
    checkBallFell();
  }
  checkGameOver();
}

function checkGameOver() {
  if (state.phase === 'fin') return;
  if (state.lives <= 0) {
    endGame('derrota');
  } else if (!state.bricks.some((b) => b.alive)) {
    const now = Date.now();
    if (state.victoryAt === 0) state.victoryAt = now + EXPLOSION_DURATION;
    if (now >= state.victoryAt) {
      if (state.level < LEVEL_COUNT) {
        loadLevel(state.level + 1);
      } else {
        endGame('victoria');
      }
    }
  }
}

function endGame(outcome) {
  state.phase = 'fin';
  state.outcome = outcome;
  state.ball.attached = true;
  state.ball.vx = 0;
  state.ball.vy = 0;
  playSound('break');
  saveHighScore(state.score);
}

function loadHighScores() {
  try {
    const raw = localStorage.getItem(HIGH_SCORES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, HIGH_SCORES_MAX) : [];
  } catch (e) {
    return [];
  }
}

function saveHighScore(score) {
  const list = state.highScores.slice();
  const qualifies = list.length < HIGH_SCORES_MAX || score > list[list.length - 1].score;
  if (!qualifies) return;
  list.push({ score, date: new Date().toISOString() });
  list.sort((a, b) => b.score - a.score);
  list.splice(HIGH_SCORES_MAX);
  state.highScores = list;
  try {
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(list));
  } catch (e) {
    // localStorage bloqueado: el juego sigue, sin persistencia.
  }
}

function resetGame() {
  state.outcome = null;
  state.score = 0;
  state.lives = LIVES_START;
  state.paddle.x = 350;
  loadLevel(1); // nivel 1, ladrillos nuevos, pelota sobre el paddle; conserva state.muted
}

const RESTART_BUTTON = { x: 300, y: 440, w: 200, h: 50 };

function drawEndScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '40px monospace';
  ctx.fillText(state.outcome === 'victoria' ? '¡Victoria!' : 'Derrota', CANVAS_W / 2, 150);
  ctx.font = '24px monospace';
  ctx.fillText('Puntaje final: ' + state.score, CANVAS_W / 2, 210);

  ctx.font = '22px monospace';
  ctx.fillText('Top 5', CANVAS_W / 2, 265);
  ctx.font = '18px monospace';
  if (state.highScores.length === 0) {
    ctx.fillText('Sin registros', CANVAS_W / 2, 300);
  }
  state.highScores.forEach((entry, i) => {
    ctx.fillText((i + 1) + '. ' + entry.score, CANVAS_W / 2, 300 + i * 26);
  });

  const btn = RESTART_BUTTON;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
  ctx.font = '20px monospace';
  ctx.fillText('Reiniciar', btn.x + btn.w / 2, btn.y + btn.h / 2);
}

function isInsideRestartButton(x, y) {
  const btn = RESTART_BUTTON;
  return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
}

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
    y: (e.clientY - rect.top) * (CANVAS_H / rect.height),
  };
}

function checkBallFell() {
  const b = state.ball;
  if (b.y <= CANVAS_H) return;
  state.lives -= 1;
  // Si era la última vida, endGame reproduce el mismo sonido: no se duplica.
  if (state.lives > 0) playSound('break');
  b.attached = true;
  b.vx = 0;
  b.vy = 0;
  state.phase = 'esperando';
  state.relaunchAt = performance.now() + RELAUNCH_DELAY_MS;
  placeBallOnPaddle();
}

function bounceOffBricks() {
  const b = state.ball;
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    const overlaps =
      b.x < brick.x + brick.w &&
      b.x + b.size > brick.x &&
      b.y < brick.y + brick.h &&
      b.y + b.size > brick.y;
    if (!overlaps) continue;

    brick.alive = false;
    brick.explodingSince = Date.now();
    state.score += POINTS_PER_BRICK;
    playSound('bounce');
    playSound('break');

    // Rebota en la cara por la que entró: el eje con menor penetración.
    const penX = Math.min(b.x + b.size - brick.x, brick.x + brick.w - b.x);
    const penY = Math.min(b.y + b.size - brick.y, brick.y + brick.h - b.y);
    if (penX < penY) {
      b.vx = -b.vx;
    } else {
      b.vy = -b.vy;
    }
    return; // un solo ladrillo por cuadro
  }
}

function bounceOffPaddle() {
  const b = state.ball;
  const p = state.paddle;
  if (b.vy <= 0) return; // solo si la pelota baja
  const overlaps =
    b.x < p.x + p.w &&
    b.x + b.size > p.x &&
    b.y < p.y + p.h &&
    b.y + b.size > p.y;
  if (!overlaps) return;
  // Ángulo fijo de 45 grados. Se conserva el sentido horizontal que traía la pelota.
  const dirX = Math.sign(b.vx) || 1;
  b.vx = dirX * BALL_SPEED * Math.sin(BALL_ANGLE);
  b.vy = -BALL_SPEED * Math.cos(BALL_ANGLE);
  b.y = p.y - b.size;
  playSound('bounce');
}

function bounceOffWalls() {
  const b = state.ball;
  if (b.x < 0) {
    b.x = 0;
    b.vx = -b.vx;
    playSound('bounce');
  } else if (b.x + b.size > CANVAS_W) {
    b.x = CANVAS_W - b.size;
    b.vx = -b.vx;
    playSound('bounce');
  }
  if (b.y < 0) {
    b.y = 0;
    b.vy = -b.vy;
    playSound('bounce');
  }
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (const b of state.bricks) {
    if (b.alive) {
      drawSprite(ctx, 'block_' + b.color, b.x, b.y, b.w, b.h);
    } else if (b.explodingSince !== null) {
      const elapsed = Date.now() - b.explodingSince;
      if (elapsed < EXPLOSION_DURATION) {
        const frame = Math.min(3, Math.floor(elapsed / EXPLOSION_FRAME_MS));
        drawFrame(ctx, EXPLOSION_FRAMES[b.color][frame], b.x, b.y, b.w, b.h);
      }
    }
  }
  const p = state.paddle;
  drawSprite(ctx, 'paddle', p.x, p.y, p.w, p.h);
  const b = state.ball;
  drawSprite(ctx, 'ball', b.x, b.y, b.size, b.size);
  drawHud();
  if (state.phase === 'fin') drawEndScreen();
}

function drawHud() {
  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('Puntaje: ' + state.score, 24, 20);
  ctx.textAlign = 'center';
  ctx.fillText('Nivel ' + state.level + ' / ' + LEVEL_COUNT, CANVAS_W / 2, 20);
  ctx.textAlign = 'right';
  ctx.fillText('Vidas: ' + state.lives, CANVAS_W - 24, 20);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(state.muted ? 'Sonido: silenciado' : 'Sonido: activado', 24, CANVAS_H - 16);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (CANVAS_W / rect.width);
  const p = state.paddle;
  p.x = mouseX - p.w / 2;
  clampPaddle();
  state.mouseMovedThisFrame = true;
});

canvas.addEventListener('mousedown', (e) => {
  if (state.phase === 'fin') {
    const pt = canvasPoint(e);
    if (isInsideRestartButton(pt.x, pt.y)) resetGame();
    return;
  }
  launchBall();
});

function setKey(e, pressed) {
  if (e.key === 'ArrowLeft') {
    state.keys.left = pressed;
    e.preventDefault();
  } else if (e.key === 'ArrowRight') {
    state.keys.right = pressed;
    e.preventDefault();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'm') {
    state.muted = !state.muted;
    return;
  }
  setKey(e, true);
  if (state.phase === 'fin') {
    if (e.key === 'Enter') resetGame();
    return;
  }
  if (e.key === ' ') {
    e.preventDefault();
    launchBall();
  }
});
window.addEventListener('keyup', (e) => setKey(e, false));

loadLevel(1);
loadSpritesheet(() => {});
requestAnimationFrame(loop);
