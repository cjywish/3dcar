import * as THREE from 'three';
import './style.css';

const canvas = document.querySelector('#game');
const speedEl = document.querySelector('#speed');
const scoreEl = document.querySelector('#score');
const distanceEl = document.querySelector('#distance');
const bestEl = document.querySelector('#best');
const difficultyLabelEl = document.querySelector('#difficulty-label');
const obstacleSpeedValueEl = document.querySelector('#obstacle-speed-value');
const obstacleSpeedDeltaEl = document.querySelector('#obstacle-speed-delta');
const obstacleSpeedDownBtn = document.querySelector('#obstacle-speed-down');
const obstacleSpeedUpBtn = document.querySelector('#obstacle-speed-up');
const difficultyButtons = document.querySelectorAll('[data-difficulty]');
const carPhotoInput = document.querySelector('#car-photo-input');
const carPhotoUploadBtn = document.querySelector('#car-photo-upload');
const carPhotoClearBtn = document.querySelector('#car-photo-clear');
const mobileLeftBtn = document.querySelector('#mobile-left');
const mobileRightBtn = document.querySelector('#mobile-right');
const musicToggleBtn = document.querySelector('#music-toggle');
const startScreen = document.querySelector('#start-screen');
const crashScreen = document.querySelector('#crash-screen');
const startGameBtn = document.querySelector('#start-game');
const crashRestartBtn = document.querySelector('#crash-restart');
const miniGamePanel = document.querySelector('#mini-game');
const miniGameForm = document.querySelector('#mini-game-form');
const miniGameQuestionEl = document.querySelector('#mini-game-question');
const miniGameAnswerEl = document.querySelector('#mini-game-answer');
const miniGameSubmitBtn = document.querySelector('#mini-game-submit');
const miniGameTimerEl = document.querySelector('#mini-game-timer');
const miniGameFeedbackEl = document.querySelector('#mini-game-feedback');
const miniGamePopupEl = document.querySelector('#mini-game-popup');
const bannerEl = document.querySelector('#banner');
const restartBtn = document.querySelector('#restart');

// Tweak these values to tune game feel without touching the update logic.
const SCROLL_SPEED = {
  road: 28,
  markers: 28,
  scenery: 24,
  obstacles: 22,
};

const DIFFICULTIES = {
  beginner: {
    label: 'Beginner',
    obstacleSpeed: 18,
    scoreMultiplier: 1.0,
    straightSeconds: 20,
    curveSeconds: 5,
    miniGameSeconds: 5,
  },
  intermediate: {
    label: 'Intermediate',
    obstacleSpeed: 26,
    scoreMultiplier: 1.22,
    straightSeconds: 20,
    curveSeconds: 10,
    miniGameSeconds: 10,
  },
  advanced: {
    label: 'Advanced',
    obstacleSpeed: 34,
    scoreMultiplier: 1.48,
    straightSeconds: 10,
    curveSeconds: 10,
    miniGameSeconds: 10,
  },
  pro: {
    label: 'Pro',
    obstacleSpeed: 44,
    scoreMultiplier: 1.82,
    straightSeconds: 5,
    curveSeconds: 20,
    miniGameSeconds: 5,
  },
};

const OBSTACLE_SPEED_STEP = 2;
const OBSTACLE_SPEED_MIN = 8;
const OBSTACLE_SPEED_MAX = 80;
const ROAD_WIDTH = 12;
const ROAD_SEGMENT_LENGTH = 8;
const ROAD_SEGMENT_COUNT = 42;
const LANE_OFFSETS = [-2.55, 0, 2.55];
const ROAD_MODE_TRANSITION = 1.2;
const ROAD_CURVE_AMPLITUDE = 3.1;
const ROAD_CURVE_WAVE = 0.14;
const MINI_GAME_ANSWER_MS = 3000;
let trackProgress = 0;
let roadModeElapsed = 0;
let roadModeTransition = 1;
let roadModeCurrent = 'straight';
let roadModePrevious = 'straight';
let defaultCarPhotoTexture = null;
let activeCarPhotoTexture = null;
let mobileSteer = 0;
let selectedDifficultyKey = 'beginner';
let miniGameNextQuestionAt = 0;
let miniGameQuestionStartedAt = 0;
let miniGameEndsAt = 0;
let miniGameQuestionResolved = false;
let miniGameActive = false;
let miniGameQuestion = null;
const textureLoader = new THREE.TextureLoader();
const musicState = {
  enabled: true,
  context: null,
  timer: null,
  step: 0,
  playing: false,
};
const MUSIC_BPM = 144;
const MUSIC_STEP_SECONDS = 60 / MUSIC_BPM / 2;
const MUSIC_PATTERN = [
  { bass: 146.83, lead: 392.0 },
  { bass: 164.81, lead: 440.0 },
  { bass: 174.61, lead: 523.25 },
  { bass: 196.0, lead: 493.88 },
  { bass: 174.61, lead: 440.0 },
  { bass: 164.81, lead: 466.16 },
  { bass: 146.83, lead: 392.0 },
  { bass: 130.81, lead: 349.23 },
];

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b1626, 12, 92);
scene.background = new THREE.Color(0x0b1626);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 6.5, 12);
camera.lookAt(0, 1.2, -6);

const ambient = new THREE.AmbientLight(0xbfd8ff, 1.8);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(-10, 18, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
scene.add(sun);

const hemi = new THREE.HemisphereLight(0x7cc7ff, 0x102030, 1.7);
scene.add(hemi);

const world = new THREE.Group();
scene.add(world);

const roadMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a2230,
  roughness: 0.9,
  metalness: 0.03,
  emissive: 0x05070b,
  emissiveIntensity: 0.25,
});
const roadEdgeMaterial = new THREE.MeshStandardMaterial({
  color: 0xd9f2ff,
  roughness: 0.5,
  metalness: 0.14,
  emissive: 0x0a4d73,
  emissiveIntensity: 0.4,
});
const laneMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd166,
  roughness: 0.55,
  metalness: 0.08,
  emissive: 0xffa800,
  emissiveIntensity: 0.35,
});
const roadSegments = [];
const roadEdgeSegments = [];
const laneMarkers = [];

function modulo(value, base) {
  return ((value % base) + base) % base;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function randomRoadMode(exclude = '') {
  const modes = ['straight', 'curve'].filter((mode) => mode !== exclude);
  return modes[Math.floor(Math.random() * modes.length)];
}

function roadOffsetForMode(mode, z) {
  if (mode === 'straight') {
    return 0;
  }
  return Math.sin((z + trackProgress) * ROAD_CURVE_WAVE) * ROAD_CURVE_AMPLITUDE;
}

function roadCenterAt(z) {
  const previousOffset = roadOffsetForMode(roadModePrevious, z);
  const currentOffset = roadOffsetForMode(roadModeCurrent, z);
  return THREE.MathUtils.lerp(previousOffset, currentOffset, smoothstep(roadModeTransition));
}

function roadHeadingAt(z) {
  const delta = 0.35;
  return Math.atan2(roadCenterAt(z + delta) - roadCenterAt(z - delta), delta * 2);
}

function placeRoadPiece(piece, z, offsetX = 0) {
  const centerX = roadCenterAt(z);
  piece.position.set(centerX + offsetX, 0.03, z);
  piece.rotation.set(0, roadHeadingAt(z), 0);
}

for (let i = 0; i < ROAD_SEGMENT_COUNT; i += 1) {
  const z = -i * ROAD_SEGMENT_LENGTH;
  const roadPiece = new THREE.Mesh(
    new THREE.BoxGeometry(ROAD_WIDTH, 0.08, ROAD_SEGMENT_LENGTH + 0.15),
    roadMaterial,
  );
  roadPiece.castShadow = false;
  roadPiece.receiveShadow = true;
  placeRoadPiece(roadPiece, z);
  world.add(roadPiece);
  roadSegments.push(roadPiece);

  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.18, ROAD_SEGMENT_LENGTH + 0.1),
      roadEdgeMaterial,
    );
    edge.castShadow = true;
    edge.receiveShadow = true;
    edge.userData.side = side;
    placeRoadPiece(edge, z, side * (ROAD_WIDTH / 2 - 0.12));
    world.add(edge);
    roadEdgeSegments.push(edge);
  }

  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 2.2), laneMaterial);
  marker.castShadow = true;
  marker.receiveShadow = true;
  marker.position.set(roadCenterAt(z), 0.04, z - 4);
  marker.rotation.y = roadHeadingAt(z);
  world.add(marker);
  laneMarkers.push(marker);
}

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(160, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0x07111f,
    side: THREE.BackSide,
  })
);
scene.add(sky);

function createPalm(x, z, scale = 1) {
  const palm = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, 3.8, 10),
    new THREE.MeshStandardMaterial({ color: 0x8c5a33, roughness: 1 })
  );
  trunk.castShadow = true;
  trunk.position.y = 1.9;
  palm.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.3, 2.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x2cde7a, roughness: 0.85 })
  );
  leaves.position.y = 4.2;
  leaves.rotation.y = Math.PI / 6;
  leaves.castShadow = true;
  palm.add(leaves);

  palm.position.set(x, 0, z);
  palm.scale.setScalar(scale);
  world.add(palm);
  return palm;
}

const scenery = [];
for (let i = 0; i < 18; i += 1) {
  scenery.push(createPalm(-11 - Math.random() * 5, -i * 14 - 8, 0.8 + Math.random() * 0.7));
  scenery.push(createPalm(11 + Math.random() * 5, -i * 14 - 14, 0.8 + Math.random() * 0.7));
}

function makeCar(color) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.65, 3.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.25 })
  );
  body.castShadow = true;
  body.position.y = 0.55;
  car.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.55, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x1d2433, roughness: 0.2, metalness: 0.05 })
  );
  cabin.position.set(0, 0.95, -0.2);
  cabin.castShadow = true;
  car.add(cabin);

  const roofPhotoBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.04, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.6, metalness: 0.1 })
  );
  roofPhotoBase.position.set(0, 1.32, -0.2);
  roofPhotoBase.castShadow = true;
  car.add(roofPhotoBase);

  const roofPhoto = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45, 0.85),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
      map: getDefaultCarPhotoTexture(),
    })
  );
  roofPhoto.rotation.x = -Math.PI / 2;
  roofPhoto.position.set(0, 1.351, -0.2);
  roofPhoto.renderOrder = 2;
  car.add(roofPhoto);

  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.08, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x0f1218, roughness: 0.5 })
  );
  spoiler.position.set(0, 0.95, 1.38);
  spoiler.castShadow = true;
  car.add(spoiler);

  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });
  const wheelPositions = [
    [-0.95, 0.18, 1.1],
    [0.95, 0.18, 1.1],
    [-0.95, 0.18, -1.1],
    [0.95, 0.18, -1.1],
  ];
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.24, 14), wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    car.add(wheel);
  }

  car.userData.roofPhoto = roofPhoto;
  return car;
}

const player = makeCar(0x2dd4ff);
player.position.set(0, 0, 2);
world.add(player);

const obstacleColors = [0xff4d6d, 0xffb703, 0x8b5cf6, 0x22c55e];
const obstacles = [];

function spawnObstacle(z = -80 - Math.random() * 120) {
  const types = ['car', 'cone', 'barrier'];
  const type = types[Math.floor(Math.random() * types.length)];
  const laneIndex = Math.floor(Math.random() * LANE_OFFSETS.length);
  let object;

  if (type === 'car') {
    object = makeCar(obstacleColors[Math.floor(Math.random() * obstacleColors.length)]);
    object.scale.setScalar(0.95 + Math.random() * 0.15);
    object.position.y = 0;
  } else if (type === 'cone') {
    object = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.4, 10),
      new THREE.MeshStandardMaterial({ color: 0xff8c42, roughness: 0.95 })
    );
    object.castShadow = true;
    object.position.y = 0.7;
  } else {
    object = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xffe66d, roughness: 0.8, metalness: 0.05 })
    );
    object.castShadow = true;
    object.position.y = 0.4;
  }

  object.userData = {
    type,
    speedBoost: 0.02 + Math.random() * 0.02,
    radius: type === 'car' ? 1.2 : type === 'cone' ? 0.7 : 0.95,
    laneIndex,
  };
  object.position.set(roadCenterAt(z) + LANE_OFFSETS[laneIndex], object.position.y ?? 0, z);
  object.rotation.y = roadHeadingAt(z);
  world.add(object);
  obstacles.push(object);
  return object;
}

for (let i = 0; i < 12; i += 1) {
  spawnObstacle(-35 - i * 18);
}

const state = {
  running: false,
  speed: 0.35,
  targetSpeed: 0.35,
  maxSpeed: 1.55,
  obstacleSpeed: DIFFICULTIES.beginner.obstacleSpeed,
  distance: 0,
  score: 0,
  best: Number(localStorage.getItem('neon-ridge-best-score') || localStorage.getItem('neon-ridge-best') || 0),
  lane: 0,
  laneTarget: 0,
  shake: 0,
  collisionGraceUntil: 0,
  scoreMultiplier: DIFFICULTIES.beginner.scoreMultiplier,
};

bestEl.textContent = state.best.toFixed(0);

const keys = new Set();
window.addEventListener('keydown', (event) => {
  if (event.key === 'r' || event.key === 'R') {
    resetRace();
    return;
  }
  keys.add(event.key.toLowerCase());
});
window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

restartBtn.addEventListener('click', resetRace);
crashRestartBtn.addEventListener('click', resetRace);
obstacleSpeedDownBtn.addEventListener('click', () => adjustObstacleSpeed(-OBSTACLE_SPEED_STEP));
obstacleSpeedUpBtn.addEventListener('click', () => adjustObstacleSpeed(OBSTACLE_SPEED_STEP));
difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyDifficultySelection(button.dataset.difficulty || 'beginner');
  });
});
carPhotoUploadBtn.addEventListener('click', () => carPhotoInput.click());
carPhotoClearBtn.addEventListener('click', clearUploadedCarPhoto);
bindSteeringButton(mobileLeftBtn, -1);
bindSteeringButton(mobileRightBtn, 1);
musicToggleBtn.addEventListener('click', toggleBackgroundMusic);
startGameBtn.addEventListener('click', startGame);
startGameBtn.onclick = startGame;
miniGameForm.addEventListener('submit', submitMiniGameAnswer);
startScreen.addEventListener('click', (event) => {
  if (event.target === startScreen) {
    startGame();
  }
});
carPhotoInput.addEventListener('change', () => {
  const file = carPhotoInput.files?.[0];
  uploadCarPhoto(file);
  carPhotoInput.value = '';
});

function laneToX(lane) {
  return lane * 3.2;
}

function getSelectedDifficulty() {
  return DIFFICULTIES[selectedDifficultyKey] || DIFFICULTIES.beginner;
}

function getRoadModeDuration() {
  const config = getSelectedDifficulty();
  return roadModeCurrent === 'curve' ? config.curveSeconds : config.straightSeconds;
}

function getMiniGameAnswerMs() {
  return MINI_GAME_ANSWER_MS;
}

function getMiniGameVisibleMs() {
  return getSelectedDifficulty().miniGameSeconds * 1000;
}

function applyDifficultySelection(key, syncObstacleSpeed = true) {
  const nextKey = DIFFICULTIES[key] ? key : 'beginner';
  const config = DIFFICULTIES[nextKey];

  selectedDifficultyKey = nextKey;
  state.scoreMultiplier = config.scoreMultiplier;
  if (difficultyLabelEl) {
    difficultyLabelEl.textContent = config.label;
  }

  if (syncObstacleSpeed) {
    setObstacleSpeed(config.obstacleSpeed);
  }

  for (const button of difficultyButtons) {
    const isActive = button.dataset.difficulty === nextKey;
    button.classList.toggle('difficulty-btn--active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  }
}

function bindSteeringButton(button, direction) {
  const press = (event) => {
    event.preventDefault();
    mobileSteer = direction;
    state.laneTarget = THREE.MathUtils.clamp(state.laneTarget + direction * 0.25, -1, 1);
  };
  const release = () => {
    if (mobileSteer === direction) {
      mobileSteer = 0;
    }
  };

  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('lostpointercapture', release);
}

function showBanner(title, message) {
  bannerEl.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
  bannerEl.classList.add('banner--visible');
  clearTimeout(showBanner.timer);
  showBanner.timer = window.setTimeout(() => {
    bannerEl.classList.remove('banner--visible');
  }, 1800);
}

function updateMusicButton() {
  musicToggleBtn.textContent = musicState.enabled ? 'BGM On' : 'BGM Off';
  musicToggleBtn.setAttribute('aria-pressed', String(musicState.enabled));
}

function stopBackgroundMusic() {
  musicState.playing = false;
  if (musicState.timer) {
    clearInterval(musicState.timer);
    musicState.timer = null;
  }
  if (musicState.context && musicState.context.state !== 'closed') {
    musicState.context.suspend().catch(() => {});
  }
}

function playStep(stepIndex) {
  if (!musicState.context || !musicState.enabled) {
    return;
  }

  const ctx = musicState.context;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);

  const pattern = MUSIC_PATTERN[stepIndex % MUSIC_PATTERN.length];
  const now = ctx.currentTime;
  const stepDuration = MUSIC_STEP_SECONDS;
  const attack = 0.01;
  const release = Math.max(0.02, stepDuration - 0.06);

  const bassOsc = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bassOsc.type = 'triangle';
  bassOsc.frequency.value = pattern.bass;
  bassGain.gain.setValueAtTime(0.0001, now);
  bassGain.gain.exponentialRampToValueAtTime(0.11, now + attack);
  bassGain.gain.exponentialRampToValueAtTime(0.0001, now + release);
  bassOsc.connect(bassGain);
  bassGain.connect(master);
  bassOsc.start(now);
  bassOsc.stop(now + stepDuration);

  const leadOsc = ctx.createOscillator();
  const leadGain = ctx.createGain();
  leadOsc.type = 'square';
  leadOsc.frequency.value = pattern.lead;
  leadGain.gain.setValueAtTime(0.0001, now);
  leadGain.gain.exponentialRampToValueAtTime(0.045, now + attack);
  leadGain.gain.exponentialRampToValueAtTime(0.0001, now + release * 0.82);
  leadOsc.connect(leadGain);
  leadGain.connect(master);
  leadOsc.start(now + 0.02);
  leadOsc.stop(now + stepDuration);

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(1, now + 0.02);
}

function playCrashSound() {
  if (!musicState.context || !musicState.enabled) {
    return;
  }

  const ctx = musicState.context;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'sawtooth';
  thump.frequency.setValueAtTime(220, now);
  thump.frequency.exponentialRampToValueAtTime(55, now + 0.18);
  thumpGain.gain.setValueAtTime(0.0001, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  thump.connect(thumpGain);
  thumpGain.connect(master);
  thump.start(now);
  thump.stop(now + 0.3);

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i += 1) {
    noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
  }
  const noise = ctx.createBufferSource();
  const noiseFilter = ctx.createBiquadFilter();
  const noiseGain = ctx.createGain();
  noise.buffer = noiseBuffer;
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1200;
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(now);
  noise.stop(now + 0.24);
}

function ensureMusicContext() {
  if (!musicState.context) {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    musicState.context = context;
  }
  return musicState.context;
}

function playMiniGameCorrectSound() {
  const ctx = ensureMusicContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.42, now + 0.015);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
  master.connect(ctx.destination);

  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startAt = now + index * 0.075;
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.12);
    osc.connect(gain);
    gain.connect(master);
    osc.start(startAt);
    osc.stop(startAt + 0.14);
  });
}

function playMiniGameWrongSound() {
  const ctx = ensureMusicContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.36, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  master.connect(ctx.destination);

  const buzz = ctx.createOscillator();
  const buzzGain = ctx.createGain();
  buzz.type = 'sawtooth';
  buzz.frequency.setValueAtTime(120, now);
  buzz.frequency.exponentialRampToValueAtTime(52, now + 0.34);
  buzzGain.gain.setValueAtTime(0.0001, now);
  buzzGain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
  buzzGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  buzz.connect(buzzGain);
  buzzGain.connect(master);
  buzz.start(now);
  buzz.stop(now + 0.4);
}

async function startBackgroundMusic() {
  if (!musicState.enabled) {
    return;
  }

  const context = ensureMusicContext();
  if (context.state === 'suspended') {
    await context.resume();
  }

  if (musicState.playing) {
    return;
  }

  musicState.playing = true;
  musicState.step = 0;
  playStep(musicState.step);
  musicState.timer = window.setInterval(() => {
    if (!musicState.playing || !musicState.enabled) {
      return;
    }
    musicState.step += 1;
    playStep(musicState.step);
  }, Math.round(MUSIC_STEP_SECONDS * 1000));
}

function toggleBackgroundMusic() {
  musicState.enabled = !musicState.enabled;
  updateMusicButton();
  if (musicState.enabled) {
    if (state.running) {
      startBackgroundMusic();
    }
    showBanner('Music on', 'Background music enabled.');
  } else {
    stopBackgroundMusic();
    showBanner('Music off', 'Background music muted.');
  }
}

function createDefaultCarPhotoTexture() {
  const size = 512;
  const canvasEl = document.createElement('canvas');
  canvasEl.width = size;
  canvasEl.height = size;
  const context = canvasEl.getContext('2d');

  if (!context) {
    const fallback = new THREE.Texture();
    fallback.needsUpdate = true;
    return fallback;
  }

  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#111827');
  gradient.addColorStop(0.5, '#0ea5e9');
  gradient.addColorStop(1, '#f97316');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  context.fillStyle = 'rgba(255, 255, 255, 0.08)';
  context.fillRect(28, 28, size - 56, size - 56);

  context.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  context.lineWidth = 18;
  context.strokeRect(28, 28, size - 56, size - 56);

  context.fillStyle = '#ffffff';
  context.font = 'bold 58px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('UPLOAD', size / 2, size / 2 - 32);
  context.fillText('PHOTO', size / 2, size / 2 + 32);

  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function getDefaultCarPhotoTexture() {
  if (!defaultCarPhotoTexture) {
    defaultCarPhotoTexture = createDefaultCarPhotoTexture();
  }
  return defaultCarPhotoTexture;
}

function setCarRoofPhoto(texture) {
  const roofPhoto = player.userData.roofPhoto;
  if (!roofPhoto) {
    return;
  }
  roofPhoto.material.map = texture;
  roofPhoto.material.needsUpdate = true;
}

function clearUploadedCarPhoto() {
  if (activeCarPhotoTexture) {
    activeCarPhotoTexture.dispose();
    activeCarPhotoTexture = null;
  }
  setCarRoofPhoto(getDefaultCarPhotoTexture());
  showBanner('Car photo', 'Reset to the default placeholder.');
}

function uploadCarPhoto(file) {
  if (!file) {
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  textureLoader.load(
    objectUrl,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      if (activeCarPhotoTexture) {
        activeCarPhotoTexture.dispose();
      }
      activeCarPhotoTexture = texture;
      setCarRoofPhoto(texture);
      showBanner('Car photo', 'Uploaded to the roof.');
      URL.revokeObjectURL(objectUrl);
    },
    undefined,
    () => {
      URL.revokeObjectURL(objectUrl);
      showBanner('Upload failed', 'Please choose a valid image file.');
    },
  );
}

function updateObstacleSpeedUI() {
  obstacleSpeedValueEl.textContent = state.obstacleSpeed.toFixed(0);
  if (obstacleSpeedDeltaEl) {
    const liveDelta = Math.round((state.targetSpeed - 0.35) * 100);
    const prefix = liveDelta > 0 ? '+' : '';
    obstacleSpeedDeltaEl.textContent = `(${prefix}${liveDelta})`;
  }
}

function setObstacleSpeed(value, announce = false) {
  state.obstacleSpeed = THREE.MathUtils.clamp(value, OBSTACLE_SPEED_MIN, OBSTACLE_SPEED_MAX);
  updateObstacleSpeedUI();
  if (announce) {
    showBanner('Obstacle speed', `Set to ${state.obstacleSpeed.toFixed(0)}.`);
  }
}

function setMiniGameVisible(visible) {
  if (!miniGamePanel) {
    return;
  }
  miniGamePanel.hidden = !visible;
  miniGamePanel.classList.toggle('mini-game--visible', visible);
}

function setMiniGameFeedback(message, tone = 'neutral') {
  if (!miniGameFeedbackEl) {
    return;
  }
  miniGameFeedbackEl.textContent = message;
  miniGameFeedbackEl.dataset.tone = tone;
}

function showMiniGamePopup(message, tone) {
  if (!miniGamePopupEl) {
    return;
  }
  miniGamePopupEl.textContent = message;
  miniGamePopupEl.dataset.tone = tone;
  miniGamePopupEl.hidden = false;
  miniGamePopupEl.classList.remove('mini-game-popup--visible');
  window.requestAnimationFrame(() => {
    miniGamePopupEl.classList.add('mini-game-popup--visible');
  });
  clearTimeout(showMiniGamePopup.timer);
  showMiniGamePopup.timer = window.setTimeout(() => {
    miniGamePopupEl.classList.remove('mini-game-popup--visible');
    miniGamePopupEl.hidden = true;
  }, 950);
}

function createMiniGameQuestion() {
  const left = 2 + Math.floor(Math.random() * 8);
  const right = 2 + Math.floor(Math.random() * 8);
  return {
    left,
    right,
    answer: left * right,
  };
}

function renderMiniGameQuestion() {
  if (!miniGameQuestion) {
    return;
  }
  const answerMs = getMiniGameAnswerMs();
  miniGameQuestionEl.textContent = `${miniGameQuestion.left} x ${miniGameQuestion.right} = ?`;
  miniGameAnswerEl.value = '';
  miniGameAnswerEl.disabled = false;
  miniGameSubmitBtn.disabled = false;
  miniGameQuestionStartedAt = performance.now();
  miniGameQuestionResolved = false;
  miniGameNextQuestionAt = miniGameQuestionStartedAt + answerMs;
  if (miniGameTimerEl) {
    miniGameTimerEl.textContent = `${(answerMs / 1000).toFixed(1)}s`;
  }
  miniGameAnswerEl.focus({ preventScroll: true });
  setMiniGameFeedback('정답을 입력하세요.', 'neutral');
}

function startMiniGame() {
  if (!state.running) {
    return;
  }
  miniGameActive = true;
  miniGameEndsAt = performance.now() + getMiniGameVisibleMs();
  setMiniGameVisible(true);
  if (!miniGameQuestion || miniGameQuestionResolved) {
    miniGameQuestion = createMiniGameQuestion();
    renderMiniGameQuestion();
  }
}

function stopMiniGame() {
  miniGameActive = false;
  miniGameQuestion = null;
  miniGameQuestionResolved = false;
  miniGameNextQuestionAt = 0;
  miniGameQuestionStartedAt = 0;
  miniGameEndsAt = 0;
  setMiniGameVisible(false);
}

function applyMiniGameScore(delta, message, tone) {
  state.score = Math.max(0, state.score + delta);
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('neon-ridge-best-score', Math.floor(state.best).toString());
    localStorage.setItem('neon-ridge-best', Math.floor(state.best).toString());
  }
  setMiniGameFeedback(message, tone);
}

function submitMiniGameAnswer(event) {
  event.preventDefault();
  if (!miniGameActive || !miniGameQuestion || miniGameQuestionResolved || !state.running) {
    return;
  }

  const elapsed = performance.now() - miniGameQuestionStartedAt;
  if (elapsed > getMiniGameAnswerMs()) {
    return;
  }

  const answer = Number.parseInt(miniGameAnswerEl.value, 10);
  if (!Number.isFinite(answer)) {
    setMiniGameFeedback('숫자를 입력하세요.', 'warn');
    return;
  }

  miniGameQuestionResolved = true;
  miniGameAnswerEl.disabled = true;
  miniGameSubmitBtn.disabled = true;

  if (answer === miniGameQuestion.answer) {
    applyMiniGameScore(300, '정답! +300점', 'correct');
    showMiniGamePopup('좋아!', 'correct');
    playMiniGameCorrectSound();
  } else {
    applyMiniGameScore(-300, `오답! 정답은 ${miniGameQuestion.answer}입니다. -300점`, 'wrong');
    showMiniGamePopup('안좋아!', 'wrong');
    playMiniGameWrongSound();
  }
}

function setRoadMode(mode, announce = false) {
  roadModePrevious = roadModeCurrent;
  roadModeCurrent = mode;
  roadModeTransition = 0;
  if (mode === 'straight' && state.running) {
    startMiniGame();
  } else if (mode === 'curve') {
    stopMiniGame();
  }
  if (announce) {
    showBanner('Road mode', mode === 'straight' ? 'Straight stretch ahead.' : 'Curved section ahead.');
  }
}

function advanceRoadMode(delta) {
  roadModeElapsed += delta;
  roadModeTransition = Math.min(1, roadModeTransition + delta / ROAD_MODE_TRANSITION);
  if (roadModeElapsed < getRoadModeDuration()) {
    return;
  }
  roadModeElapsed = 0;
  const nextMode = randomRoadMode(roadModeCurrent);
  setRoadMode(nextMode, true);
}

function adjustObstacleSpeed(delta) {
  setObstacleSpeed(state.obstacleSpeed + delta, true);
}

function hideStartScreen() {
  startScreen.classList.add('start-screen--hidden');
  startScreen.hidden = true;
  startScreen.style.display = 'none';
  document.body.classList.add('game-started');
}

function showCrashScreen() {
  if (!crashScreen) {
    return;
  }
  crashScreen.hidden = false;
  crashScreen.classList.add('crash-screen--visible');
}

function hideCrashScreen() {
  if (!crashScreen) {
    return;
  }
  crashScreen.classList.remove('crash-screen--visible');
  crashScreen.hidden = true;
}

function startGame() {
  applyDifficultySelection(selectedDifficultyKey, true);
  state.running = true;
  state.speed = 0.95;
  state.targetSpeed = 1.15;
  state.score = 0;
  state.distance = 0;
  state.collisionGraceUntil = performance.now() + 1000;
  hideStartScreen();
  hideCrashScreen();
  roadModeElapsed = 0;
  roadModeTransition = 1;
  startMiniGame();
  startBackgroundMusic();
  showBanner('Race on', `Difficulty: ${DIFFICULTIES[selectedDifficultyKey].label}. Steer with WASD or arrow keys.`);
}

window.startGame = startGame;
window.resetRace = resetRace;

function resetRace() {
  applyDifficultySelection(selectedDifficultyKey, true);
  state.running = true;
  hideCrashScreen();
  hideStartScreen();
  state.speed = 0.35;
  state.targetSpeed = 0.35;
  state.distance = 0;
  state.score = 0;
  state.collisionGraceUntil = performance.now() + 1000;
  mobileSteer = 0;
  trackProgress = 0;
  roadModeElapsed = 0;
  roadModeTransition = 1;
  roadModeCurrent = 'straight';
  roadModePrevious = 'straight';
  roadModeNext = randomRoadMode('straight');
  startMiniGame();
  state.lane = 0;
  state.laneTarget = 0;
  state.shake = 0;
  player.position.set(0, 0, 2);
  player.rotation.set(0, 0, 0);
  for (let i = 0; i < obstacles.length; i += 1) {
    const obstacle = obstacles[i];
    obstacle.position.z = -80 - i * 15 - Math.random() * 30;
    obstacle.userData.laneIndex = Math.floor(Math.random() * LANE_OFFSETS.length);
    obstacle.position.x = roadCenterAt(obstacle.position.z) + LANE_OFFSETS[obstacle.userData.laneIndex];
    obstacle.rotation.y = roadHeadingAt(obstacle.position.z);
  }
  showBanner('Race reset', 'Stay centered and push for a new best score.');
}

function updateMiniGame() {
  if (!state.running || roadModeCurrent !== 'straight') {
    stopMiniGame();
    return;
  }

  if (!miniGameActive) {
    return;
  }

  if (!miniGameQuestion) {
    miniGameQuestion = createMiniGameQuestion();
    renderMiniGameQuestion();
  }

  const now = performance.now();
  if (miniGameEndsAt > 0 && now >= miniGameEndsAt) {
    stopMiniGame();
    return;
  }

  const elapsed = now - miniGameQuestionStartedAt;
  const answerMs = getMiniGameAnswerMs();
  const remaining = Math.max(0, answerMs - elapsed);

  if (miniGameTimerEl) {
    miniGameTimerEl.textContent = `${(remaining / 1000).toFixed(1)}s`;
  }

  if (!miniGameQuestionResolved && elapsed >= answerMs) {
    miniGameQuestionResolved = true;
    miniGameAnswerEl.disabled = true;
    miniGameSubmitBtn.disabled = true;
    applyMiniGameScore(-300, `시간 초과! 정답은 ${miniGameQuestion.answer}입니다. -300점`, 'wrong');
    showMiniGamePopup('안좋아!', 'wrong');
    playMiniGameWrongSound();
  }

  if (miniGameQuestionResolved && now >= miniGameNextQuestionAt) {
    miniGameQuestion = createMiniGameQuestion();
    renderMiniGameQuestion();
  }
}

function updateControls(delta) {
  if (!state.running) {
    return;
  }

  if (keys.has('arrowleft') || keys.has('a')) {
    state.laneTarget = Math.max(-1, state.laneTarget - delta * 4);
  }
  if (keys.has('arrowright') || keys.has('d')) {
    state.laneTarget = Math.min(1, state.laneTarget + delta * 4);
  }
  if (keys.has('arrowup') || keys.has('w')) {
    state.targetSpeed = Math.min(state.maxSpeed, state.targetSpeed + delta * 0.9);
  }
  if (keys.has('arrowdown') || keys.has('s')) {
    state.targetSpeed = Math.max(0.2, state.targetSpeed - delta * 1.1);
  }
  if (mobileSteer < 0) {
    state.laneTarget = Math.max(-1, state.laneTarget - delta * 4);
  } else if (mobileSteer > 0) {
    state.laneTarget = Math.min(1, state.laneTarget + delta * 4);
  }

  state.targetSpeed = THREE.MathUtils.clamp(state.targetSpeed, 0.22, state.maxSpeed);
  state.laneTarget = THREE.MathUtils.clamp(state.laneTarget, -1, 1);
}

function updatePlayer(delta) {
  state.lane += (state.laneTarget - state.lane) * (1 - Math.pow(0.001, delta));
  const roadX = roadCenterAt(player.position.z);
  const desiredX = roadX + laneToX(state.lane);
  const previousX = player.position.x;
  player.position.x += (desiredX - player.position.x) * (1 - Math.pow(0.001, delta));
  player.rotation.y = roadHeadingAt(player.position.z) * 0.75;
  player.rotation.z = (desiredX - previousX) * -0.06;
  player.rotation.x = Math.sin(performance.now() * 0.004) * 0.01;
}

function updateWorld(delta) {
  state.speed += (state.targetSpeed - state.speed) * (1 - Math.pow(0.001, delta));
  state.distance += state.speed * delta * 48;
  const speedRatio = THREE.MathUtils.clamp(state.speed / state.maxSpeed, 0.2, 1.25);
  const speedWeight = THREE.MathUtils.lerp(0.7, 1.45, speedRatio);
  state.score = Math.max(0, state.score + delta * state.speed * 110 * state.scoreMultiplier * speedWeight);
  advanceRoadMode(delta);
  const roadAdvance = state.speed * delta * SCROLL_SPEED.road;
  trackProgress += roadAdvance;

  for (const piece of roadSegments) {
    piece.position.z += roadAdvance;
    if (piece.position.z > 26) {
      piece.position.z -= ROAD_SEGMENT_LENGTH * ROAD_SEGMENT_COUNT;
    }
    placeRoadPiece(piece, piece.position.z);
  }

  for (const edge of roadEdgeSegments) {
    edge.position.z += roadAdvance;
    if (edge.position.z > 26) {
      edge.position.z -= ROAD_SEGMENT_LENGTH * ROAD_SEGMENT_COUNT;
    }
    placeRoadPiece(edge, edge.position.z, (edge.userData.side ?? 1) * (ROAD_WIDTH / 2 - 0.12));
  }

  for (const marker of laneMarkers) {
    marker.position.z += roadAdvance;
    if (marker.position.z > 18) {
      marker.position.z -= ROAD_SEGMENT_LENGTH * ROAD_SEGMENT_COUNT;
    }
    marker.position.x = roadCenterAt(marker.position.z);
    marker.rotation.y = roadHeadingAt(marker.position.z);
  }

  for (const prop of scenery) {
    prop.position.z += state.speed * delta * SCROLL_SPEED.scenery;
    if (prop.position.z > 12) {
      prop.position.z -= 280;
    }
    prop.rotation.y += delta * 0.2;
  }

  for (const obstacle of obstacles) {
    obstacle.position.z += state.speed * delta * state.obstacleSpeed;
    if (obstacle.position.z > 12) {
      obstacle.position.z = -120 - Math.random() * 120;
      obstacle.userData.laneIndex = Math.floor(Math.random() * LANE_OFFSETS.length);
    }
    obstacle.position.x = roadCenterAt(obstacle.position.z) + LANE_OFFSETS[obstacle.userData.laneIndex];
    obstacle.rotation.y = roadHeadingAt(obstacle.position.z);
  }
}

function intersects(a, b) {
  const ax = a.position.x;
  const az = a.position.z;
  const bx = b.position.x;
  const bz = b.position.z;
  const ar = a.userData.radius ?? 1;
  const br = b.userData.radius ?? 1;
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz < (ar + br) * (ar + br);
}

function updateCollisions() {
  if (!state.running) {
    return;
  }
  if (performance.now() < state.collisionGraceUntil) {
    return;
  }
  for (const obstacle of obstacles) {
    if (obstacle.position.z > 5.2 || obstacle.position.z < -6) {
      continue;
    }
    if (Math.abs(obstacle.position.x - player.position.x) < 1.4 && intersects(player, obstacle)) {
      state.running = false;
      state.targetSpeed = 0;
      state.shake = 1.5;
      playCrashSound();
      const bestScore = Math.max(state.best, state.score);
      state.best = bestScore;
      bestEl.textContent = bestScore.toFixed(0);
      localStorage.setItem('neon-ridge-best-score', bestScore.toFixed(0));
      localStorage.setItem('neon-ridge-best', bestScore.toFixed(0));
      showBanner('Crash!', 'Press Restart Race or R to try again.');
      showCrashScreen();
      return;
    }
  }
}

function updateHUD() {
  speedEl.textContent = Math.round(state.speed * 100);
  scoreEl.textContent = Math.floor(state.score).toString();
  distanceEl.textContent = Math.floor(state.distance).toString();
  const best = Math.max(state.best, state.score);
  if (best > state.best) {
    state.best = best;
    localStorage.setItem('neon-ridge-best-score', Math.floor(best).toString());
    localStorage.setItem('neon-ridge-best', Math.floor(best).toString());
  }
  bestEl.textContent = Math.floor(best).toString();
  updateObstacleSpeedUI();
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.033);

  if (state.running) {
    updateControls(delta);
    updatePlayer(delta);
    updateWorld(delta);
    updateCollisions();
  }
  updateMiniGame();
  updateHUD();

  camera.position.x += (player.position.x * 0.28 - camera.position.x) * 0.08;
  camera.position.y += ((state.running ? 6.5 : 7.4) - camera.position.y) * 0.04;
  camera.position.z += ((state.running ? 12 : 13.2) - camera.position.z) * 0.03;
  camera.lookAt(roadCenterAt(player.position.z), 1.1, -6);

  const shake = state.shake;
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * 0.14 * shake;
    camera.position.y += (Math.random() - 0.5) * 0.08 * shake;
    state.shake = Math.max(0, state.shake - delta * 2.2);
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

applyDifficultySelection(selectedDifficultyKey, true);
updateObstacleSpeedUI();
updateMusicButton();
showBanner('Ready', 'Press Start Game to begin racing.');
animate();
