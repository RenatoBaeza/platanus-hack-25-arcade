// TurboTurbo — 2P side-scrolling battle-racing (Phaser 3)

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#0b0f1a',
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let g, timeText, p1LivesText, p2LivesText, p1ItemText, p2ItemText, endText;
let players = [];
let items = [];
let missiles = [];
let obstacles = [];
let keys = {};
let elapsed = 0;
let running = true;
let menu = null;
let fx = [];
let sceneRef = null;

// Tunable parameters (editable in pause menu)
let MATCH_TIME = 60;
let LIFE_START = 999;
let RATE_OBS = 0.02;
let RATE_SPIKE = 0.008;
let RATE_ITEM = 0.004;
let SPD_SLOW = 0.12;
let SPD_MED = 0.18;
let SPD_FAST = 0.26;
let MOVE_SPEED = 0.02;

function preload() {}

function create() {
  g = this.add.graphics();
  sceneRef = this;
  setupInput(this);
  initMatch(this);
}

function initMatch(scene) {
  elapsed = 0;
  running = true;
  players = [
    makePlayer(1, 240, 300, 0x3cff64),
    makePlayer(2, 200, 340, 0x4ecbff)
  ];
  items = [];
  missiles = [];
  obstacles = [];

  timeText = scene.add.text(400, 20, '60', styleText('#ffffff', 26)).setOrigin(0.5, 0);
  timeText.setShadow(2, 2, '#000000', 2, true, true);
  p1LivesText = scene.add.text(16, 16, '', styleText('#3cff64', 18));
  p2LivesText = scene.add.text(800 - 16, 16, '', styleText('#4ecbff', 18)).setOrigin(1, 0);
  p1ItemText = scene.add.text(16, 42, '', styleText('#aaaaaa', 14));
  p2ItemText = scene.add.text(800 - 16, 42, '', styleText('#aaaaaa', 14)).setOrigin(1, 0);
  p1LivesText.setShadow(1, 1, '#000000', 2, true, true);
  p2LivesText.setShadow(1, 1, '#000000', 2, true, true);
  p1ItemText.setShadow(1, 1, '#000000', 2, true, true);
  p2ItemText.setShadow(1, 1, '#000000', 2, true, true);
  endText = null;
}

function styleText(color, size) {
  return { fontSize: size + 'px', fontFamily: 'Arial, sans-serif', color };
}

function makePlayer(id, x, y, color) {
  return { id, x, y, w: 26, h: 16, vx: 0, vy: 0, lives: LIFE_START, item: null, fireCd: 0, inv: 0, color };
}

function setupInput(scene) {
  keys = scene.input.keyboard.addKeys({
    w: 'W', a: 'A', s: 'S', d: 'D', e: 'E',
    up: 'UP', left: 'LEFT', down: 'DOWN', right: 'RIGHT', enter: 'ENTER', t: 'T'
  });
}

function update(_t, dt) {
  // Toggle menu
  if (Phaser.Input.Keyboard.JustDown(keys.t)) {
    if (!menu) openMenu(this); else closeMenu(this);
  }
  if (!running || menu) { if (menu) drawMenu(); return; }
  const dts = Math.min(50, dt);
  elapsed += dts / 1000;
  const sp = scrollSpeed(elapsed);

  spawnLogic(elapsed);

  players.forEach(p => tickPlayer(p, dts, sp));
  missiles.forEach(m => { m.x += m.dx * m.sp * dts; m.y += m.dy * m.sp * dts; });
  obstacles.forEach(o => { o.x -= sp * dts; });
  items.forEach(i => { i.x -= sp * dts; });
  // fx particles
  fx.forEach(p => { p.vx *= 0.99; p.vy += 0.0002 * dts; p.x += p.vx * dts; p.y += p.vy * dts; p.life -= dts; });

  handleCollisions();
  cleanupOffscreen();
  render();
  updateUI();

  checkWinCondition(this);
}

function scrollSpeed(t) {
  if (t < 20) return SPD_SLOW;
  if (t < 40) return SPD_MED;
  return SPD_FAST;
}

function spawnLogic(t) {
  if ((Math.random() < RATE_OBS)) spawnObstacle();
  if (Math.random() < RATE_SPIKE) spawnSpike();
  if (Math.random() < RATE_ITEM) spawnItemBox();
}

function spawnObstacle() {
  const y = 120 + Math.random() * 360;
  const destructible = Math.random() < 0.5;
  const w = 24 + Math.floor(Math.random() * 3) * 16;
  const h = 24 + Math.floor(Math.random() * 3) * 16;
  obstacles.push({ type: destructible ? 'wall' : 'rock', x: 840, y, w, h, hp: destructible ? 2 : 999 });
}

function spawnSpike() {
  const y = 520;
  obstacles.push({ type: 'spike', x: 840, y, w: 20, h: 60, hp: 999 });
}

function spawnItemBox() {
  const y = 120 + Math.random() * 360;
  const kind = Math.random();
  let reward = 'life';
  if (kind < 0.33) reward = 'front'; else if (kind < 0.66) reward = 'back'; else reward = 'sides';
  items.push({ x: 840, y, w: 20, h: 20, reward });
}

function tickPlayer(p, dt, sp) {
  const ax = (p.id === 1) ? (keys.a.isDown ? -0.35 : keys.d.isDown ? 0.35 : 0) : (keys.left.isDown ? -0.35 : keys.right.isDown ? 0.35 : 0);
  const ay = (p.id === 1) ? (keys.w.isDown ? -0.35 : keys.s.isDown ? 0.35 : 0) : (keys.up.isDown ? -0.35 : keys.down.isDown ? 0.35 : 0);
  p.vx += ax * MOVE_SPEED * dt; p.vy += ay * MOVE_SPEED * dt;
  p.vx *= 0.9; p.vy *= 0.9;
  p.x += p.vx * dt + sp * dt * 40 * 0.02; // tiny forward drift
  p.y += p.vy * dt;
  p.x = Math.max(40, Math.min(760, p.x));
  p.y = Math.max(60, Math.min(540, p.y));
  if (p.fireCd > 0) p.fireCd -= dt;
  if (p.inv > 0) p.inv -= dt;

  const firePressed = (p.id === 1) ? Phaser.Input.Keyboard.JustDown(keys.e) : Phaser.Input.Keyboard.JustDown(keys.enter);
  if (firePressed) useItem(p);
}

function useItem(p) {
  if (!p.item || p.fireCd > 0) return;
  if (p.item === 'life') { p.lives = Math.min(9, p.lives + 1); p.item = null; tone(660, 0.08); return; }
  const shots = [];
  if (p.item === 'front') shots.push({ dx: 1, dy: 0 });
  if (p.item === 'back') shots.push({ dx: -1, dy: 0 });
  if (p.item === 'sides') { shots.push({ dx: 1, dy: 0 }, { dx: -1, dy: 0 }); }
  shots.forEach(v => missiles.push(makeMissile(p, v.dx, v.dy)));
  p.item = null; p.fireCd = 300; tone(520, 0.06);
}

function makeMissile(p, dx, dy) {
  return { owner: p.id, x: p.x + dx * 20, y: p.y + dy * 20, dx, dy, sp: 0.6, r: 6 };
}

function handleCollisions() {
  // players with items
  players.forEach(p => {
    items.forEach(it => {
      if (rectsOverlap(p, it)) { if (!p.item) p.item = it.reward; it.dead = true; tone(800, 0.05); burst(it.x, it.y, 0xffe066, 10); }
    });
  });

  // players with obstacles
  players.forEach(p => {
    obstacles.forEach(o => {
      if (rectsOverlap(p, o)) {
        if (o.type === 'wall' || o.type === 'rock') { damage(p, 1); bounceFrom(p, o); }
        if (o.type === 'spike') { damage(p, 1); }
      }
    });
  });

  // missiles with obstacles and players
  missiles.forEach(m => {
    // hit obstacles
    obstacles.forEach(o => {
      if (!o.dead && rectsOverlap({ x: m.x - m.r, y: m.y - m.r, w: m.r * 2, h: m.r * 2 }, o)) {
        o.hp -= 1; if (o.hp <= 0 && o.type === 'wall') { o.dead = true; burst(o.x, o.y, 0xff6b6b, 10); }
        m.dead = true; tone(180, 0.06); burst(m.x, m.y, 0xffff66, 8);
      }
    });
    // hit players (enemy only)
    players.forEach(p => {
      if (p.id !== m.owner && rectsOverlap({ x: m.x - m.r, y: m.y - m.r, w: m.r * 2, h: m.r * 2 }, p)) {
        damage(p, 1); m.dead = true; tone(200, 0.06); burst(p.x, p.y, 0xff4444, 12);
      }
    });
  });
}

function damage(p, amt) {
  if (p.inv > 0) return;
  p.lives -= amt; p.inv = 600;
  burst(p.x, p.y, 0xff2d55, 14);
  if (sceneRef) sceneRef.cameras.main.shake(100, 0.0025);
}

function bounceFrom(p, o) {
  if (p.x < o.x) p.x -= 12; else p.x += 12;
  if (p.y < o.y) p.y -= 8; else p.y += 8;
}

function cleanupOffscreen() {
  const offL = a => a.filter(x => !x.dead && x.x + (x.w || x.r || 0) > -40 && x.y > -80 && x.y < 680);
  missiles = missiles.filter(m => !m.dead && m.x > -20 && m.x < 820 && m.y > -20 && m.y < 620);
  obstacles = offL(obstacles);
  items = offL(items);
  fx = fx.filter(p => p.life > 0 && p.x > -40 && p.x < 840 && p.y > -40 && p.y < 640);
}

function rectsOverlap(a, b) {
  return a.x - a.w / 2 < b.x + b.w / 2 && a.x + a.w / 2 > b.x - b.w / 2 && a.y - a.h / 2 < b.y + b.h / 2 && a.y + a.h / 2 > b.y - b.h / 2;
}

function render() {
  g.clear();
  drawBackground();
  drawScanlinesAndVignette();
  // items
  items.forEach(it => { g.setBlendMode(Phaser.BlendModes.ADD); g.fillStyle(0xffe066, 0.25); g.fillRoundedRect(it.x - it.w / 2 - 3, it.y - it.h / 2 - 3, it.w + 6, it.h + 6, 4); g.setBlendMode(Phaser.BlendModes.NORMAL); g.fillStyle(0xffe066, 1); g.fillRoundedRect(it.x - it.w / 2, it.y - it.h / 2, it.w, it.h, 4); g.lineStyle(2, 0x8a6d1f, 1); g.strokeRoundedRect(it.x - it.w / 2, it.y - it.h / 2, it.w, it.h, 4); });
  // obstacles
  obstacles.forEach(o => {
    if (o.type === 'wall') { g.fillStyle(0xff6b6b, 1); }
    if (o.type === 'rock') { g.fillStyle(0x666e7a, 1); }
    if (o.type === 'spike') { g.fillStyle(0xbfbfbf, 1); }
    rectCentered(o.x, o.y, o.w, o.h);
    g.lineStyle(2, 0x000000, 0.25); g.strokeRoundedRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 4);
  });
  // missiles
  missiles.forEach(m => { g.setBlendMode(Phaser.BlendModes.ADD); g.fillStyle(0xffff66, 0.15); g.fillCircle(m.x, m.y, m.r * 2.4); g.fillStyle(0xffcc00, 0.25); g.fillCircle(m.x, m.y, m.r * 1.6); g.setBlendMode(Phaser.BlendModes.NORMAL); g.fillStyle(0xffff99, 1); g.fillCircle(m.x, m.y, m.r); });
  // particles/fx
  g.setBlendMode(Phaser.BlendModes.ADD);
  fx.forEach(p => { g.fillStyle(p.c, Math.max(0, p.life / p.max)); g.fillCircle(p.x, p.y, p.r); });
  g.setBlendMode(Phaser.BlendModes.NORMAL);
  // players
  players.forEach(p => {
    const alpha = p.inv > 0 ? 0.4 + 0.6 * Math.sin(p.inv / 40) : 1;
    g.setBlendMode(Phaser.BlendModes.ADD); g.fillStyle(p.color, 0.2 * alpha); g.fillRoundedRect(p.x - p.w / 2 - 4, p.y - p.h / 2 - 4, p.w + 8, p.h + 8, 6); g.setBlendMode(Phaser.BlendModes.NORMAL);
    g.fillStyle(p.color, alpha);
    g.fillRoundedRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 6);
    g.lineStyle(2, 0x000000, 0.3); g.strokeRoundedRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 6);
  });
}

function drawBackground() {
  // vertical gradient background (banded for performance)
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const c = lerpColor(0x0b0f1a, 0x13203a, t);
    g.fillStyle(c, 1);
    g.fillRect(0, i * 50, 800, 50);
  }
  // ground strip
  g.fillStyle(0x0f1323, 1); g.fillRect(0, 560, 800, 40);
  // parallax stars
  const tt = elapsed;
  drawStars(40, 0.08, 0x1f3b73, tt * 18);
  drawStars(24, 0.14, 0x2f5fb5, tt * 32);
  // moving bands (futuristic)
  const t2 = elapsed * 40;
  g.lineStyle(2, 0x162042, 0.9);
  for (let i = 0; i < 6; i++) {
    const y = 120 + i * 70;
    const x = (800 - ((t2 * (0.4 + i * 0.1)) % 200));
    for (let k = 0; k < 6; k++) g.strokeRect(x - k * 200, y, 120, 8);
  }
}

function rectCentered(x, y, w, h) {
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
}

function drawScanlinesAndVignette() {
  // subtle scanlines
  g.lineStyle(1, 0x000000, 0.04);
  for (let y = 0; y < 600; y += 3) g.strokeLineShape(new Phaser.Geom.Line(0, y, 800, y));
  // vignette using edge rectangles
  g.fillStyle(0x000000, 0.08);
  g.fillRect(0, 0, 800, 24); g.fillRect(0, 576, 800, 24);
  g.fillRect(0, 0, 24, 600); g.fillRect(776, 0, 24, 600);
}

function drawStars(count, speed, color, phase) {
  g.fillStyle(color, 0.9);
  for (let i = 0; i < count; i++) {
    const y = 40 + ((i * 523) % 480);
    const x = (800 - ((phase * speed + i * 73) % 800));
    g.fillRect(x, y, 2, 2);
  }
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const rr = (ar + (br - ar) * t) & 255;
  const rg = (ag + (bg - ag) * t) & 255;
  const rb = (ab + (bb - ab) * t) & 255;
  return (rr << 16) | (rg << 8) | rb;
}

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 0.08 + Math.random() * 0.25;
    fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 2 + Math.random() * 3, c: color, life: 350 + Math.random() * 250, max: 600 });
  }
}

function updateUI() {
  const remain = Math.max(0, Math.ceil(MATCH_TIME - elapsed));
  timeText.setText(remain.toString());
  p1LivesText.setText('P1 ❤ ' + players[0].lives);
  p2LivesText.setText('P2 ❤ ' + players[1].lives);
  p1ItemText.setText('Item: ' + (players[0].item || '-'));
  p2ItemText.setText('Item: ' + (players[1].item || '-'));
}

function checkWinCondition(scene) {
  const p1Alive = players[0].lives > 0;
  const p2Alive = players[1].lives > 0;
  const timeUp = elapsed >= MATCH_TIME;
  let winner = null;
  if (!p1Alive && p2Alive) winner = 'Player 2 Wins!';
  else if (!p2Alive && p1Alive) winner = 'Player 1 Wins!';
  else if (!p1Alive && !p2Alive) winner = 'Draw!';
  else if (timeUp) winner = players[0].lives > players[1].lives ? 'Player 1 Wins!' : (players[0].lives < players[1].lives ? 'Player 2 Wins!' : 'Draw!');
  if (winner) endMatch(scene, winner);
}

function endMatch(scene, msg) {
  running = false;
  tone(240, 0.25);
  const ov = scene.add.graphics();
  ov.fillStyle(0x000000, 0.6); ov.fillRect(0, 0, 800, 600);
  endText = scene.add.text(400, 260, msg, { fontSize: '44px', fontFamily: 'Arial, sans-serif', color: '#ffffff', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5);
  const sub = scene.add.text(400, 330, 'Press R to Rematch', styleText('#ffff66', 22)).setOrigin(0.5);
  scene.input.keyboard.once('keydown-R', () => { scene.scene.restart(); });
}

function tone(f, d) {
  const ctx = game.sound.context; const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination); osc.type = 'square'; osc.frequency.value = f;
  const t = ctx.currentTime; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.01, t + d);
  osc.start(t); osc.stop(t + d);
}

// Pause/config menu
function openMenu(scene) {
  menu = {
    overlay: scene.add.graphics(),
    title: scene.add.text(400, 120, 'Config', { fontSize: '36px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setOrigin(0.5),
    items: [
      { name: 'Match Time', get: () => MATCH_TIME, set: v => { MATCH_TIME = clampInt(v, 10, 300); } },
      { name: 'Start Lives', get: () => LIFE_START, set: v => { LIFE_START = clampInt(v, 1, 9); } },
      { name: 'Obstacle Rate', get: () => RATE_OBS, set: v => { RATE_OBS = clamp(v, 0, 0.1); } },
      { name: 'Spike Rate', get: () => RATE_SPIKE, set: v => { RATE_SPIKE = clamp(v, 0, 0.05); } },
      { name: 'Item Rate', get: () => RATE_ITEM, set: v => { RATE_ITEM = clamp(v, 0, 0.05); } },
      { name: 'Speed Slow', get: () => SPD_SLOW, set: v => { SPD_SLOW = clamp(v, 0.02, 1); } },
      { name: 'Speed Med', get: () => SPD_MED, set: v => { SPD_MED = clamp(v, 0.02, 1.5); } },
      { name: 'Speed Fast', get: () => SPD_FAST, set: v => { SPD_FAST = clamp(v, 0.02, 2); } },
      { name: 'Move Speed', get: () => MOVE_SPEED, set: v => { MOVE_SPEED = clamp(v, 0.1, 3); } },
    ],
    idx: 0,
    rows: [],
    tip: scene.add.text(400, 480, 'Up/Down select • Left/Right change • T to resume', styleText('#ffff66', 16)).setOrigin(0.5)
  };
  menu.overlay.fillStyle(0x000000, 0.7); menu.overlay.fillRect(0, 0, 800, 600);
  for (let i = 0; i < menu.items.length; i++) {
    const y = 180 + i * 34;
    const txt = scene.add.text(400, y, '', styleText('#ffffff', 20)).setOrigin(0.5);
    menu.rows.push(txt);
  }
  running = false;
  drawMenu();
}

function drawMenu() {
  for (let i = 0; i < menu.items.length; i++) {
    const it = menu.items[i];
    const sel = (i === menu.idx);
    const name = it.name;
    const val = it.get();
    const color = sel ? '#00e5ff' : '#ffffff';
    menu.rows[i].setColor(color).setText(name + ': ' + formatVal(val));
  }
  handleMenuInput();
}

function handleMenuInput() {
  if (Phaser.Input.Keyboard.JustDown(keys.up)) menu.idx = (menu.idx + menu.items.length - 1) % menu.items.length;
  if (Phaser.Input.Keyboard.JustDown(keys.down)) menu.idx = (menu.idx + 1) % menu.items.length;
  const step = menu.idx <= 1 ? 1 : (menu.idx <= 4 ? 0.001 : 0.01);
  if (Phaser.Input.Keyboard.JustDown(keys.left)) menu.items[menu.idx].set(menu.items[menu.idx].get() - step);
  if (Phaser.Input.Keyboard.JustDown(keys.right)) menu.items[menu.idx].set(menu.items[menu.idx].get() + step);
}

function closeMenu(scene) {
  if (!menu) return;
  menu.overlay.destroy();
  menu.title.destroy();
  menu.tip.destroy();
  menu.rows.forEach(r => r.destroy());
  menu = null;
  if (!endText) running = true;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function clampInt(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v))); }
function formatVal(v) { return (typeof v === 'number' && Math.abs(v - Math.round(v)) > 0.0001) ? v.toFixed(3) : String(v); }
