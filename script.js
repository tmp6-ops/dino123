// --- Audio Synthesizer via Web Audio API ---
// Self-contained sound effects without needing external audio assets!
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn(e);
    }
  }

  playScore() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(880.00, now + 0.08); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn(e);
    }
  }

  playHit() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      
      // Noise burst for impact
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.15);
    } catch (e) {
      console.warn(e);
    }
  }
}

// --- Game Engine ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreText = document.getElementById('scoreText');
const highScoreText = document.getElementById('highScoreText');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const restartBtn = document.getElementById('restartBtn');
const soundToggle = document.getElementById('soundToggle');

const sound = new SoundManager();

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const GROUND_Y = CANVAS_HEIGHT - 30;

let gameState = 'START'; // 'START' | 'PLAYING' | 'GAMEOVER'
let score = 0;
let highScore = localStorage.getItem('dino_highscore') || 0;
highScoreText.textContent = String(Math.floor(highScore)).padStart(5, '0');

let gameSpeed = 5.5;
let spawnTimer = 0;
let nextSpawnDelay = 80;
let frameCount = 0;

// Dino player
const dino = {
  x: 50,
  y: GROUND_Y - 44,
  width: 44,
  height: 44,
  vy: 0,
  gravity: 0.75,
  jumpStrength: -12.5,
  isGrounded: true,
  legFrame: 0,
  ducking: false,

  reset() {
    this.x = 50;
    this.y = GROUND_Y - 44;
    this.vy = 0;
    this.isGrounded = true;
    this.legFrame = 0;
    this.ducking = false;
  },

  jump() {
    if (this.isGrounded) {
      this.vy = this.jumpStrength;
      this.isGrounded = false;
      sound.playJump();
    }
  },

  update() {
    this.vy += this.gravity;
    this.y += this.vy;

    if (this.y >= GROUND_Y - this.height) {
      this.y = GROUND_Y - this.height;
      this.vy = 0;
      this.isGrounded = true;
    }

    if (this.isGrounded && frameCount % 6 === 0) {
      this.legFrame = (this.legFrame + 1) % 2;
    }
  },

  draw() {
    ctx.fillStyle = '#535353';
    const x = this.x;
    const y = this.y;

    // Pixel-art representation of Dino
    // Body & Head
    ctx.fillRect(x + 22, y, 18, 16);          // Head top
    ctx.fillRect(x + 22, y + 16, 22, 10);      // Snout / mouth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 26, y + 4, 3, 3);        // Eye
    ctx.fillStyle = '#535353';
    ctx.fillRect(x + 14, y + 16, 12, 18);      // Torso
    ctx.fillRect(x + 8, y + 22, 8, 12);        // Back
    ctx.fillRect(x + 2, y + 26, 8, 8);         // Tail end
    ctx.fillRect(x + 28, y + 22, 4, 4);        // Tiny arm

    // Legs
    if (!this.isGrounded) {
      // In air legs
      ctx.fillRect(x + 14, y + 34, 4, 8);
      ctx.fillRect(x + 22, y + 34, 4, 8);
    } else if (this.legFrame === 0) {
      ctx.fillRect(x + 14, y + 34, 4, 10);
      ctx.fillRect(x + 22, y + 34, 4, 6);
    } else {
      ctx.fillRect(x + 14, y + 34, 4, 6);
      ctx.fillRect(x + 22, y + 34, 4, 10);
    }
  }
};

// Ground lines & particles
let groundOffset = 0;

// Obstacles (Cacti)
let obstacles = [];

function spawnObstacle() {
  const type = Math.random() < 0.4 ? 'double' : (Math.random() < 0.2 ? 'large' : 'small');
  let obs = {
    x: CANVAS_WIDTH + 20,
    type: type,
    scored: false
  };

  if (type === 'small') {
    obs.width = 16;
    obs.height = 34;
    obs.y = GROUND_Y - 34;
  } else if (type === 'large') {
    obs.width = 24;
    obs.height = 46;
    obs.y = GROUND_Y - 46;
  } else {
    // double small
    obs.width = 34;
    obs.height = 34;
    obs.y = GROUND_Y - 34;
  }

  obstacles.push(obs);
}

// Clouds for background ambiance
let clouds = [
  { x: 200, y: 40, speed: 0.6 },
  { x: 500, y: 70, speed: 0.4 },
  { x: 750, y: 30, speed: 0.5 }
];

function updateClouds() {
  clouds.forEach(c => {
    c.x -= c.speed;
    if (c.x < -60) {
      c.x = CANVAS_WIDTH + Math.random() * 80;
      c.y = 30 + Math.random() * 60;
    }
  });
}

function drawCloud(c) {
  ctx.fillStyle = '#d3d3d3';
  ctx.fillRect(c.x, c.y, 46, 12);
  ctx.fillRect(c.x + 8, c.y - 8, 28, 8);
  ctx.fillRect(c.x + 14, c.y - 12, 16, 4);
}

function drawCactus(obs) {
  ctx.fillStyle = '#535353';
  const x = obs.x;
  const y = obs.y;
  const w = obs.width;
  const h = obs.height;

  if (obs.type === 'double') {
    // Draw two small cacti adjacent
    drawSingleCactus(x, y, 14, h);
    drawSingleCactus(x + 18, y + 4, 14, h - 4);
  } else {
    drawSingleCactus(x, y, w, h);
  }
}

function drawSingleCactus(x, y, w, h) {
  // Main trunk
  const trunkWidth = Math.max(6, Math.floor(w * 0.4));
  const trunkX = x + Math.floor((w - trunkWidth) / 2);
  ctx.fillRect(trunkX, y, trunkWidth, h);

  // Left arm
  const armHeight = Math.floor(h * 0.4);
  ctx.fillRect(x, y + armHeight * 0.5, 4, armHeight);
  ctx.fillRect(x, y + armHeight, trunkX - x, 4);

  // Right arm
  ctx.fillRect(x + w - 4, y + armHeight * 0.2, 4, armHeight);
  ctx.fillRect(trunkX + trunkWidth, y + armHeight * 0.7, x + w - (trunkX + trunkWidth), 4);
}

function checkCollision(r1, r2) {
  // Hitbox padding for forgiving gameplay
  const padding = 5;
  return (
    r1.x + padding < r2.x + r2.width - padding &&
    r1.x + r1.width - padding > r2.x + padding &&
    r1.y + padding < r2.y + r2.height - padding &&
    r1.y + r1.height - padding > r2.y + padding
  );
}

function gameOver() {
  gameState = 'GAMEOVER';
  sound.playHit();
  gameOverOverlay.classList.remove('hidden');

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('dino_highscore', highScore);
    highScoreText.textContent = String(Math.floor(highScore)).padStart(5, '0');
  }
}

function resetGame() {
  gameState = 'PLAYING';
  score = 0;
  gameSpeed = 5.5;
  spawnTimer = 0;
  nextSpawnDelay = 70;
  obstacles = [];
  dino.reset();
  scoreText.textContent = '00000';
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
}

function handleInput() {
  sound.init(); // enable web audio context on user interaction
  if (gameState === 'START' || gameState === 'GAMEOVER') {
    resetGame();
  } else if (gameState === 'PLAYING') {
    dino.jump();
  }
}

// Input event listeners
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    handleInput();
  }
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleInput();
}, { passive: false });

canvas.addEventListener('mousedown', () => {
  handleInput();
});

restartBtn.addEventListener('click', () => {
  resetGame();
});

soundToggle.addEventListener('click', () => {
  sound.enabled = !sound.enabled;
  soundToggle.textContent = sound.enabled ? '🔊 Sound: ON' : '🔈 Sound: OFF';
});

// --- Main Game Loop ---
function loop() {
  frameCount++;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background clouds
  updateClouds();
  clouds.forEach(drawCloud);

  // Ground line
  ctx.strokeStyle = '#535353';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
  ctx.stroke();

  // Ground texture dots
  if (gameState === 'PLAYING') {
    groundOffset = (groundOffset + gameSpeed) % 24;
  }
  ctx.fillStyle = '#888888';
  for (let x = -groundOffset; x < CANVAS_WIDTH; x += 24) {
    ctx.fillRect(x, GROUND_Y + 4, 6, 2);
    ctx.fillRect(x + 10, GROUND_Y + 12, 10, 2);
  }

  if (gameState === 'PLAYING') {
    dino.update();

    // Gradual score increment
    score += 0.15;
    const currentScore = Math.floor(score);
    scoreText.textContent = String(currentScore).padStart(5, '0');

    // Beep sound on milestone every 100 points
    if (currentScore > 0 && currentScore % 100 === 0 && Math.floor(score - 0.15) !== currentScore) {
      sound.playScore();
    }

    // Gradual difficulty increase
    gameSpeed = 5.5 + Math.min(7, Math.floor(score / 80) * 0.4);

    // Obstacle Spawning
    spawnTimer++;
    if (spawnTimer >= nextSpawnDelay) {
      spawnObstacle();
      spawnTimer = 0;
      // Random gap between obstacles
      nextSpawnDelay = Math.floor(55 + Math.random() * 65 - Math.min(25, gameSpeed * 1.5));
    }

    // Update & draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= gameSpeed;
      drawCactus(obs);

      // Collision detection
      if (checkCollision(dino, obs)) {
        gameOver();
        break;
      }

      // Remove off-screen obstacles
      if (obs.x + obs.width < 0) {
        obstacles.splice(i, 1);
      }
    }
  } else {
    // When paused or game over, keep obstacles drawn
    obstacles.forEach(drawCactus);
  }

  // Draw Dino
  dino.draw();

  requestAnimationFrame(loop);
}

// Start loop
requestAnimationFrame(loop);

