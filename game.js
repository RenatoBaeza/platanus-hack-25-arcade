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
let startMenu = null;
let fx = [];
let sceneRef = null;
let music = { on: false, timer: null, step: 0, gain: null, o1: null, o2: null };
let hypeOn = false;

let MATCH_TIME = 60;
let LIFE_START = 999;
let RATE_OBS = 0.02;
let RATE_SPIKE = 0.008;
let RATE_ITEM = 0.004;
let RATE_EMISS = 0.006;
let RATE_TMISS = 0.004;
let SPD_SLOW = 0.12;
let SPD_MED = 0.18;
let SPD_FAST = 0.26;
let MOVE_SPEED = 0.02;
let WALL_HIT_DAMAGE = 1;
let SHOT_DAMAGE_MULT = 10;
let FRONT_MISSILE_SPEED = 0.42;
let TOPDOWN_MISSILE_SPEED = 0.22;

function preload() {}

function create() {
  g = this.add.graphics();
  sceneRef = this;
  setupInput(this);
  initMusic(this);
  openStartMenu(this);
}

function initMatch(scene) {
  elapsed = 0;
  running = false;
  hypeOn = false;
  players = [
    makePlayer(1, 240, 300, 0x3cff64),
    makePlayer(2, 200, 340, 0x4ecbff)
  ];
  items = [];
  missiles = [];
  obstacles = [];

  timeText = scene.add.text(400, 20, '60', styleText('#ffffff', 26)).setOrigin(0.5, 0).setDepth(1000);
  timeText.setScale(1);
  timeText.setColor('#ffffff');
  timeText.setShadow(2, 2, '#000000', 2, true, true);
  p1LivesText = scene.add.text(16, 16, '', styleText('#3cff64', 18)).setDepth(1000);
  p2LivesText = scene.add.text(800 - 16, 16, '', styleText('#4ecbff', 18)).setOrigin(1, 0).setDepth(1000);
  p1ItemText = scene.add.text(16, 42, '', styleText('#aaaaaa', 14)).setDepth(1000);
  p2ItemText = scene.add.text(800 - 16, 42, '', styleText('#aaaaaa', 14)).setOrigin(1, 0).setDepth(1000);
  p1LivesText.setShadow(1, 1, '#000000', 2, true, true);
  p2LivesText.setShadow(1, 1, '#000000', 2, true, true);
  p1ItemText.setShadow(1, 1, '#000000', 2, true, true);
  p2ItemText.setShadow(1, 1, '#000000', 2, true, true);
  endText = null;
  showRoundStartMessage(scene);
}

function styleText(color, size) {
  return { fontSize: size + 'px', fontFamily: 'Arial, sans-serif', color };
}

function showRoundStartMessage(scene) {
  const msg = scene.add.text(400, 280, 'KILL EACH OTHER AND SURVIVE!', { fontSize: '42px', fontFamily: 'Arial, sans-serif', color: '#ff4444', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5).setDepth(2000);
  msg.setAlpha(0);
  msg.setScale(0.5);
  scene.tweens.add({ targets: msg, alpha: 1, scale: 1.1, duration: 400, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: msg, alpha: 1, scale: 1, duration: 200, delay: 400, ease: 'Sine.easeOut' });
  scene.tweens.add({ targets: msg, alpha: 0, scale: 1.2, duration: 500, delay: 2000, ease: 'Cubic.easeIn', onComplete: () => { msg.destroy(); running = true; } });
}

function pickupName(kind) {
  if (kind === 'front') return 'Front';
  if (kind === 'back') return 'Back';
  if (kind === 'sides') return 'Sides';
  if (kind === 'vert') return 'Vert';
  return 'Item';
}

function popupText(x, y, msg, color) {
  if (!sceneRef) return;
  const t = sceneRef.add.text(x, y - 18, msg, { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: color || '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
  sceneRef.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

function makePlayer(id, x, y, color) {
  return { id, x, y, w: 26, h: 16, vx: 0, vy: 0, lives: LIFE_START, item: null, fireCd: 0, inv: 0, color };
}

function setupInput(scene) {
  keys = scene.input.keyboard.addKeys({
    w: 'W', a: 'A', s: 'S', d: 'D', e: 'E',
    up: 'UP', left: 'LEFT', down: 'DOWN', right: 'RIGHT', enter: 'ENTER', t: 'T', m: 'M', r: 'R',
    space: 'SPACE', back: 'BACKSPACE', esc: 'ESC'
  });
}

function update(_t, dt) {
  if (startMenu) { drawStartMenu(); return; }
  if (Phaser.Input.Keyboard.JustDown(keys.t)) {
    if (!menu) openMenu(this); else closeMenu(this);
  }
  if (Phaser.Input.Keyboard.JustDown(keys.m)) toggleMusic(this);
  if (Phaser.Input.Keyboard.JustDown(keys.r)) { this.scene.restart(); return; }
  if (!running || menu) { if (menu) drawMenu(); return; }
  const dts = Math.min(50, dt);
  elapsed += dts / 1000;
  const sp = scrollSpeed(elapsed);

  spawnLogic(elapsed);

  players.forEach(p => tickPlayer(p, dts, sp));
  missiles.forEach(m => { m.x += m.dx * m.sp * dts; m.y += m.dy * m.sp * dts; });
  obstacles.forEach(o => {
    o.x -= sp * dts;
    if (o.type === 'jelly') {
      // vertical oscillation
      o.ph += (o.vph || 0.002) * dts;
      o.y = o.y0 + Math.sin(o.ph) * o.amp;
    }
  });
  items.forEach(i => { i.x -= sp * dts; });
  // fx particles
  fx.forEach(p => { p.vx *= 0.99; p.vy += 0.0002 * dts; p.x += p.vx * dts; p.y += p.vy * dts; p.life -= dts; });

  handleCollisions();
  cleanupOffscreen();
  render();
  updateUI();

  checkWinCondition(this);
  const remainForHype = Math.max(0, Math.ceil(MATCH_TIME - elapsed));
  if (!hypeOn && remainForHype <= 20) {
    hypeOn = true;
    if (sceneRef) {
      timeText.setFontSize(40);
      timeText.setColor('#ffff66');
      sceneRef.tweens.add({ targets: timeText, scale: 1.15, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.easeInOut' });
    }
    if (music && music._inited) {
      music.hype = true;
      const t = music.ctx.currentTime;
      if (music.lp) { music.lp.frequency.setTargetAtTime(2800, t, 0.2); }
      if (music.gain && music.gain.gain) { music.gain.gain.setTargetAtTime(0.16, t, 0.3); }
    }
  }
}

function scrollSpeed(t) {
  if (t < 20) return SPD_SLOW;
  if (t < 40) return SPD_MED;
  return SPD_FAST;
}

function spawnLogic(t) {
  if ((Math.random() < RATE_OBS)) spawnObstacle();
  if (Math.random() < RATE_SPIKE) spawnSpike();
  if (Math.random() < RATE_SPIKE) spawnTopSpike();
  if (Math.random() < RATE_ITEM) spawnItemBox();
  if (Math.random() < RATE_EMISS) spawnEnemyMissile();
  if (Math.random() < RATE_TMISS) spawnTopMissile();
}

function spawnObstacle() {
  const y = 120 + Math.random() * 360;
  if (Math.random() < 0.25) {
    const size = 24 + Math.floor(Math.random() * 2) * 16;
    const amp = 20 + Math.random() * 50;
    const vph = 0.002 + Math.random() * 0.003;
    const o = { type: 'jelly', x: 840, y, y0: y, ph: Math.random() * Math.PI * 2, amp, vph, w: size, h: size, hp: 2, pulse: 0 };
    obstacles.push(o);
    if (sceneRef) sceneRef.tweens.add({ targets: o, pulse: 1, duration: 700 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  } else {
    const destructible = Math.random() < 0.5;
    const w = 24 + Math.floor(Math.random() * 3) * 16;
    const h = 24 + Math.floor(Math.random() * 3) * 16;
    const o = { type: destructible ? 'wall' : 'rock', x: 840, y, w, h, hp: destructible ? 2 : 999, pulse: 0 };
    obstacles.push(o);
    if (sceneRef) sceneRef.tweens.add({ targets: o, pulse: 1, duration: 600 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}

function spawnSpike() {
  const y = 520;
  const o = { type: 'spike', x: 840, y, w: 20, h: 60, hp: 999, pulse: 0 };
  obstacles.push(o);
  if (sceneRef) sceneRef.tweens.add({ targets: o, pulse: 1, duration: 800 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

function spawnTopSpike() {
  const y = 80;
  const o = { type: 'spike', x: 840, y, w: 20, h: 60, hp: 999, pulse: 0 };
  obstacles.push(o);
  if (sceneRef) sceneRef.tweens.add({ targets: o, pulse: 1, duration: 800 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

function canPlaceItemAt(x, y) {
  const M = 48; // minimum clearance around items
  const test = { x, y, w: 34 + M * 2, h: 34 + M * 2 };
  for (let i = 0; i < obstacles.length; i++) {
    if (rectsOverlap(test, obstacles[i])) return false;
  }
  return true;
}

function spawnItemBox() {
  const x = 840;
  let y = 120 + Math.random() * 360;
  for (let i = 0; i < 8 && !canPlaceItemAt(x, y); i++) y = 120 + Math.random() * 360;
  if (!canPlaceItemAt(x, y)) return;
  const kind = Math.random();
  let reward = 'front';
  if (kind < 0.25) reward = 'front';
  else if (kind < 0.5) reward = 'back';
  else if (kind < 0.75) reward = 'sides';
  else reward = 'vert';
  const it = { x, y, w: 34, h: 34, reward, pulse: 0, glow: 0.5 };
  items.push(it);
  if (sceneRef) {
    sceneRef.tweens.add({ targets: it, pulse: 1, duration: 900 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sceneRef.tweens.add({ targets: it, glow: 1, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
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
  const shots = [];
  const ang = 0.25; // radians
  const ca = Math.cos(ang), sa = Math.sin(ang);
  if (p.item === 'front') {
    shots.push({ dx: 1, dy: 0 });
    shots.push({ dx: ca, dy: -sa });
    shots.push({ dx: ca, dy: sa });
  }
  if (p.item === 'back') {
    shots.push({ dx: -1, dy: 0 });
    shots.push({ dx: -ca, dy: -sa });
    shots.push({ dx: -ca, dy: sa });
  }
  if (p.item === 'sides') {
    shots.push({ dx: ca, dy: -sa });
    shots.push({ dx: ca, dy: sa });
    shots.push({ dx: -ca, dy: -sa });
    shots.push({ dx: -ca, dy: sa });
  }
  if (p.item === 'vert') {
    shots.push({ dx: 0, dy: -1 });
    shots.push({ dx: -sa, dy: -ca });
    shots.push({ dx: sa, dy: -ca });
    shots.push({ dx: 0, dy: 1 });
    shots.push({ dx: -sa, dy: ca });
    shots.push({ dx: sa, dy: ca });
  }
  shots.forEach(v => missiles.push(makeMissile(p, v.dx, v.dy)));
  p.item = null; p.fireCd = 300; tone(520, 0.06);
}

function makeMissile(p, dx, dy) {
  return { owner: p.id, x: p.x + dx * 20, y: p.y + dy * 20, dx, dy, sp: 0.6, r: 6 };
}

function spawnEnemyMissile() {
  const x = 840;
  const y = 120 + Math.random() * 360;
  // Aim slightly toward the nearest player with small variance
  let target = players[0];
  if (Math.abs(players[1].y - y) < Math.abs(players[0].y - y)) target = players[1];
  const vx = -1;
  const dy = Phaser.Math.Clamp((target.y - y) / 220, -0.6, 0.6);
  missiles.push({ owner: 0, x, y, dx: vx, dy, sp: FRONT_MISSILE_SPEED, r: 6 });
}

function spawnTopMissile() {
  const y = -20;
  const x = 60 + Math.random() * 680;
  // Aim slightly toward the nearest player's x with small variance
  let target = Math.abs(players[0].x - x) < Math.abs(players[1].x - x) ? players[0] : players[1];
  const vy = 1;
  const dx = Phaser.Math.Clamp((target.x - x) / 260, -0.6, 0.6);
  missiles.push({ owner: 0, x, y, dx, dy: vy, sp: TOPDOWN_MISSILE_SPEED, r: 6 });
}

function handleCollisions() {
  // players with items
  players.forEach(p => {
    items.forEach(it => {
      if (rectsOverlap(p, it)) { if (!p.item) { p.item = it.reward; popupText(it.x, it.y, pickupName(it.reward) + ' collected!'); } it.dead = true; tone(800, 0.05); burst(it.x, it.y, 0xffe066, 10); }
    });
  });

  // players with obstacles
  players.forEach(p => {
    obstacles.forEach(o => {
      if (rectsOverlap(p, o)) {
        if (o.type === 'wall' || o.type === 'rock' || o.type === 'jelly') { damage(p, WALL_HIT_DAMAGE); bounceFrom(p, o); }
        if (o.type === 'spike') { damage(p, 1); }
      }
    });
  });

  // missiles with obstacles and players
  missiles.forEach(m => {
    // hit obstacles
    obstacles.forEach(o => {
      if (!o.dead && rectsOverlap({ x: m.x, y: m.y, w: m.r * 2, h: m.r * 2 }, o)) {
        o.hp -= 1; if (o.hp <= 0 && (o.type === 'wall' || o.type === 'jelly')) { o.dead = true; burst(o.x, o.y, 0xff6b6b, 10); }
        m.dead = true; tone(180, 0.06); burst(m.x, m.y, 0xffff66, 8);
      }
    });
    // hit players (enemy only)
    players.forEach(p => {
      if (p.id !== m.owner && rectsOverlap({ x: m.x, y: m.y, w: m.r * 2, h: m.r * 2 }, p)) {
        damage(p, WALL_HIT_DAMAGE * SHOT_DAMAGE_MULT); m.dead = true; tone(200, 0.06); burst(p.x, p.y, 0xff4444, 12);
      }
    });
  });
}

function damage(p, amt) {
  if (p.inv > 0) return;
  p.lives -= amt; p.inv = 600;
  popupText(p.x, p.y, '-' + amt, '#ff4444');
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
  // gameplay layers first
  // items
  items.forEach(it => drawItemBox(it));
  // obstacles
  obstacles.forEach(o => {
    if (o.type === 'wall') { g.fillStyle(0xff6b6b, 1); }
    if (o.type === 'rock') { g.fillStyle(0x666e7a, 1); }
    if (o.type === 'spike') { g.fillStyle(0xbfbfbf, 1); }
    if (o.type === 'jelly') { g.fillStyle(0xc77dff, 1); }
    const sc = 1 + ((o.pulse || 0) * (o.type === 'jelly' ? 0.08 : 0.05));
    const ww = o.w * sc, hh = o.h * sc;
    g.fillRoundedRect(o.x - ww / 2, o.y - hh / 2, ww, hh, 4);
    g.lineStyle(2, 0x000000, 0.25); g.strokeRoundedRect(o.x - ww / 2, o.y - hh / 2, ww, hh, 4);
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
  // HUD above gameplay
  drawHUD();
  // post-processing on top
  drawScanlinesAndVignette();
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

function drawHUD() {
  // Top center timer pill with progress
  const remain = Math.max(0, Math.ceil(MATCH_TIME - elapsed));
  const pct = Phaser.Math.Clamp((MATCH_TIME - Math.max(0, MATCH_TIME - remain)) / MATCH_TIME, 0, 1);
  const cx = 400, cy = 18, w = 180, h = 28, r = 14;
  // background glass
  g.fillStyle(0x000000, 0.35); g.fillRoundedRect(cx - w / 2, cy, w, h, r);
  g.lineStyle(2, 0x1f2a4a, 0.6); g.strokeRoundedRect(cx - w / 2, cy, w, h, r);
  // progress bar
  const pw = (w - 8) * (1 - elapsed / MATCH_TIME);
  if (pw > 0) {
    const lx = cx - (w - 8) / 2, ly = cy + 4, lh = h - 8;
    const colA = 0x39ffb6, colB = 0x00d4ff;
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const c = lerpColor(colA, colB, t);
      const segX = lx + (pw) * t;
      g.fillStyle(c, 0.85);
      g.fillRect(segX, ly, pw / steps + 1, lh);
    }
  }
  // timer text shadowed
  g.lineStyle();
  const ttxt = remain.toString();
  // draw subtle glow
  g.setBlendMode(Phaser.BlendModes.ADD);
  g.fillStyle(0x00e5ff, 0.15); g.fillCircle(cx, cy + h / 2 + 2, 20);
  g.setBlendMode(Phaser.BlendModes.NORMAL);

  // Side HUD panels behind existing texts
  // Left panel
  g.fillStyle(0x000000, 0.28); g.fillRoundedRect(10, 10, 200, 54, 10);
  g.lineStyle(2, 0x2dd36f, 0.6); g.strokeRoundedRect(10, 10, 200, 54, 10);
  // Right panel
  g.fillStyle(0x000000, 0.28); g.fillRoundedRect(800 - 210, 10, 200, 54, 10);
  g.lineStyle(2, 0x24a4ff, 0.6); g.strokeRoundedRect(800 - 210, 10, 200, 54, 10);

  // Player health bars (high-visibility)
  const drawBar = (x, y, w, h, pct, edge, colA, colB) => {
    const p = Phaser.Math.Clamp(pct, 0, 1);
    // glow
    g.setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(colA, 0.22); g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 8);
    g.setBlendMode(Phaser.BlendModes.NORMAL);
    // background
    g.fillStyle(0x0b0f1a, 0.85); g.fillRoundedRect(x, y, w, h, 6);
    // fill (simple gradient steps for punch)
    const steps = 8; const fw = Math.max(0, Math.floor(w * p));
    for (let i = 0; i < steps; i++) {
      const t = steps <= 1 ? 0 : i / (steps - 1);
      const c = lerpColor(colA, colB, t);
      const sx = x + (fw) * (i / steps);
      const sw = Math.ceil(fw / steps);
      if (sw > 0) { g.fillStyle(c, 0.95); g.fillRect(sx, y, sw, h); }
    }
    // outline and ticks
    g.lineStyle(2, edge, 0.9); g.strokeRoundedRect(x, y, w, h, 6);
    g.lineStyle(1, 0xffffff, 0.15);
    for (let i = 1; i < 10; i++) { const tx = x + (w * i / 10); g.lineBetween(tx, y + 2, tx, y + h - 2); }
  };
  const p1Pct = players.length ? players[0].lives / LIFE_START : 0;
  const p2Pct = players.length > 1 ? players[1].lives / LIFE_START : 0;
  // P1 bar (left panel)
  drawBar(16, 58, 180, 14, p1Pct, 0x2dd36f, 0x39ffb6, 0x00d4ff);
  // P2 bar (right panel)
  drawBar(800 - 16 - 180, 58, 180, 14, p2Pct, 0x24a4ff, 0x4ecbff, 0x39ffb6);

  // Music indicator (top-right)
  if (music.on) {
    const mx = 770, my = 20;
    g.setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0x00e5ff, 0.18); g.fillCircle(mx + 10, my + 10, 12);
    g.setBlendMode(Phaser.BlendModes.NORMAL);
    g.fillStyle(0x00d4ff, 1);
    // simple note icon
    g.fillRect(mx + 6, my + 4, 4, 16);
    g.fillRect(mx + 6, my + 4, 10, 3);
    g.fillCircle(mx + 8, my + 20, 4);
  }
}

function rectCentered(x, y, w, h) {
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
}

function drawItemBox(it) {
  let base = 0xffe066, edge = 0x8a6d1f;
  if (it.reward === 'front') { base = 0xffc107; edge = 0x8b6b00; }
  else if (it.reward === 'back') { base = 0x4ecbff; edge = 0x1a6b87; }
  else if (it.reward === 'sides') { base = 0xc77dff; edge = 0x5b2a8a; }
  else if (it.reward === 'vert') { base = 0xff7ab2; edge = 0x8a2a57; }
  const sc = 1 + (it.pulse || 0) * 0.08;
  const ww = it.w * sc, hh = it.h * sc;
  g.setBlendMode(Phaser.BlendModes.ADD);
  g.fillStyle(base, 0.15 + (it.glow || 0) * 0.25);
  g.fillRoundedRect(it.x - ww / 2 - 3, it.y - hh / 2 - 3, ww + 6, hh + 6, 4);
  g.setBlendMode(Phaser.BlendModes.NORMAL);
  g.fillStyle(base, 1);
  g.fillRoundedRect(it.x - ww / 2, it.y - hh / 2, ww, hh, 4);
  g.lineStyle(2, edge, 1);
  g.strokeRoundedRect(it.x - ww / 2, it.y - hh / 2, ww, hh, 4);
  drawItemIcon(it.reward, it.x, it.y, ww - 10, 0x0b0f1a, edge);
}

function drawItemIcon(kind, cx, cy, size, color, shadow) {
  const s = size;
  const half = s / 2;
  const tri = (x1, y1, x2, y2, x3, y3) => {
    // shadow
    g.lineStyle(2, shadow, 1);
    g.strokeTriangle(x1 + 1, y1 + 1, x2 + 1, y2 + 1, x3 + 1, y3 + 1);
    // fill and outline
    g.fillStyle(color, 1);
    g.fillTriangle(x1, y1, x2, y2, x3, y3);
    g.lineStyle(2, color, 1);
    g.strokeTriangle(x1, y1, x2, y2, x3, y3);
  };
  if (kind === 'front') {
    // right arrow
    const x0 = cx - half * 0.4;
    tri(x0, cy - half * 0.35, cx + half, cy, x0, cy + half * 0.35);
  } else if (kind === 'back') {
    // left arrow
    const x0 = cx + half * 0.4;
    tri(x0, cy - half * 0.35, cx - half, cy, x0, cy + half * 0.35);
  } else if (kind === 'vert') {
    // up and down arrows
    tri(cx - half * 0.25, cy - half, cx + half * 0.25, cy - half, cx, cy - half * 0.25);
    tri(cx - half * 0.25, cy + half, cx + half * 0.25, cy + half, cx, cy + half * 0.25);
  } else if (kind === 'sides') {
    // four diagonal arrows
    const r = half * 0.75;
    const makeDiag = (ang) => {
      const tipX = cx + Math.cos(ang) * r;
      const tipY = cy + Math.sin(ang) * r;
      const left = ang + Math.PI * 0.75;
      const right = ang - Math.PI * 0.75;
      const b = half * 0.35;
      tri(tipX, tipY,
          cx + Math.cos(left) * b, cy + Math.sin(left) * b,
          cx + Math.cos(right) * b, cy + Math.sin(right) * b);
    };
    makeDiag(Math.PI / 4);
    makeDiag(-Math.PI / 4);
    makeDiag((3 * Math.PI) / 4);
    makeDiag((-3 * Math.PI) / 4);
  }
}

function drawLetter(ch, cx, cy, size, color, shadow) {
  const s = size;
  const l = cx - s / 2, r = cx + s / 2, t = cy - s / 2, b = cy + s / 2;
  const m = t + s * 0.5; const q = t + s * 0.25; const tq = t + s * 0.75;
  const stroke = (c) => { g.lineStyle(2, c, 1); };
  const line = (x1, y1, x2, y2) => { g.lineBetween(x1, y1, x2, y2); };
  // tiny shadow for legibility
  stroke(shadow);
  drawLetterStrokes(ch, l + 1, t + 1, r + 1, b + 1, m + 1, q + 1, tq + 1, line);
  stroke(color);
  drawLetterStrokes(ch, l, t, r, b, m, q, tq, line);
}

function drawLetterStrokes(ch, l, t, r, b, m, q, tq, line) {
  if (ch === 'F') {
   line(l, t, l, b);
   line(l, t, r, t);
   line(l, m, l + (r - l) * 0.65, m);
  } else if (ch === 'B') {
   line(l, t, l, b);
   // top loop
   line(l, t, r - 2, t);
   line(r - 2, t, r, q);
   line(r, q, r - 2, m);
   line(r - 2, m, l, m);
   // bottom loop
   line(l, m, r - 2, m);
   line(r - 2, m, r, tq);
   line(r, tq, r - 2, b);
   line(r - 2, b, l, b);
  } else if (ch === 'S') {
   line(r, t, l, t);
   line(l, t, l, q);
   line(l, q, r, q);
   line(r, q, r, tq);
   line(r, tq, l, tq);
   line(l, tq, l, b);
   line(l, b, r, b);
  } else if (ch === 'L') {
   line(l, t, l, b);
   line(l, b, r, b);
  } else if (ch === 'V') {
   line(l, t, (l + r) / 2, b);
   line((l + r) / 2, b, r, t);
  }
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
  p1LivesText.setText('P1 ❤ ' + Math.max(0, Math.floor(players[0].lives)));
  p2LivesText.setText('P2 ❤ ' + Math.max(0, Math.floor(players[1].lives)));
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
  const ov = scene.add.graphics().setDepth(1500);
  ov.fillStyle(0x000000, 0.6); ov.fillRect(0, 0, 800, 600);
  endText = scene.add.text(400, 260, msg, { fontSize: '44px', fontFamily: 'Arial, sans-serif', color: '#ffffff', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5).setDepth(1501);
  const sub = scene.add.text(400, 330, 'Press R to Rematch', styleText('#ffff66', 22)).setOrigin(0.5).setDepth(1501);
  scene.input.keyboard.once('keydown-R', () => { scene.scene.restart(); });
}

function tone(f, d) {
  const ctx = game.sound.context; const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination); osc.type = 'square'; osc.frequency.value = f;
  const t = ctx.currentTime; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.01, t + d);
  osc.start(t); osc.stop(t + d);
}

// Procedural chipmunk music (tiny step sequencer)
function initMusic(scene) {
  const ctx = game.sound.context;
  if (!ctx) return;
  if (music._inited) { if (music.on && !music.timer) startMusic(scene); return; }
  music._inited = true;
  music.ctx = ctx;
  const master = ctx.createGain(); master.gain.value = 0.1;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 0.2;
  master.connect(lp); lp.connect(ctx.destination);
  const v1g = ctx.createGain(); const v2g = ctx.createGain(); const v3g = ctx.createGain(); v1g.gain.value = 0; v2g.gain.value = 0; v3g.gain.value = 0;
  v1g.connect(master); v2g.connect(master); v3g.connect(master);
  const o1 = ctx.createOscillator(); const o2 = ctx.createOscillator(); const o3 = ctx.createOscillator();
  o1.type = 'square'; o2.type = 'sine';
  o3.type = 'sawtooth';
  o1.connect(v1g); o2.connect(v2g); o3.connect(v3g);
  const t0 = ctx.currentTime;
  o1.start(t0); o2.start(t0); o3.start(t0);
  music.gain = master; music.lp = lp; music.o1 = o1; music.o2 = o2; music.o3 = o3; music.v1g = v1g; music.v2g = v2g; music.v3g = v3g; music.step = 0; music.hype = false;
  startMusic(scene);
}

function toggleMusic(scene) { if (music.on) stopMusic(); else startMusic(sceneRef || scene); }

function startMusic(scene) {
  if (!music._inited || music.on) return;
  music.on = true;
  const bpm = 112; const stepSec = 60 / bpm / 4; // 16th notes, groovier
  music.timer = scene.time.addEvent({ delay: stepSec * 1000, loop: true, callback: () => stepMusic(stepSec) });
}

function stopMusic() {
  if (!music.on) return;
  music.on = false;
  if (music.timer) { music.timer.remove(false); music.timer = null; }
  // release envelopes
  const t = music.ctx.currentTime;
  music.v1g.gain.setTargetAtTime(0, t, 0.03);
  music.v2g.gain.setTargetAtTime(0, t, 0.03);
  if (music.v3g) music.v3g.gain.setTargetAtTime(0, t, 0.03);
}

function stepMusic(stepSec) {
  // 2-voice with percussion; deeper groove, swing, variation
  const tNow = music.ctx.currentTime;
  const step = music.step % 32; // 2 bars of 16th notes
  const bar = Math.floor(music.step / 16);
  // Progression over 4 bars: i, iv, iii, v in A minor-ish
  const roots = [45, 50, 48, 52]; // A2, D3, C3, E3
  const root = roots[bar % roots.length];
  // Bass pattern (syncopated), stays low and punchy
  const bassPat = [0, , 0, , -5, , -7, , 0, , 0, , -5, , -7, , 0, , 0, , -5, , -7, , 0, , -2, , -5, , -7, ];
  const leadPat = [null, 0, 2, 3, null, 3, 2, 0, null, 5, 7, null, 3, 2, 0, null, null, 0, 2, 5, null, 7, 5, 2, null, 3, 2, 0, null, -2, 0, null];
  const bStep = bassPat[step];
  const lStep = leadPat[step];
  const swing = (step % 2 === 1) ? stepSec * 0.1 : 0; // light swing on off-16ths
  const t = tNow + swing;
  const endT = t + stepSec * 0.92;
  // Bass voice (o2) lower, louder than lead
  if (bStep !== undefined) {
    const bf = midiToFreq(root + (bStep || 0) - 12); // drop an octave
    music.o2.frequency.setValueAtTime(bf, t);
    const a2 = music.v2g.gain; a2.cancelScheduledValues(t);
    a2.setValueAtTime(0.0001, t);
    a2.exponentialRampToValueAtTime(0.12, t + 0.008);
    a2.exponentialRampToValueAtTime(0.02, endT);
  }
  // Lead voice (o1) sparse, pentatonic-ish, moderate volume
  if (lStep !== null && lStep !== undefined) {
    // occasional octave lift every 8 steps for excitement
    const lift = (step % 8 === 7) ? 12 : 0;
    const lf = midiToFreq(root + 12 + lStep + lift);
    music.o1.frequency.setValueAtTime(lf, t);
    // micro-arp for movement
    music.o1.frequency.setValueAtTime(lf * 1.06, t + stepSec * 0.25);
    music.o1.frequency.setValueAtTime(lf, t + stepSec * 0.5);
    const a1 = music.v1g.gain; a1.cancelScheduledValues(t);
    a1.setValueAtTime(0.0001, t);
    a1.exponentialRampToValueAtTime(0.06, t + 0.01);
    a1.exponentialRampToValueAtTime(0.012, endT);
  } else {
    // gently decay lead when resting
    const a1 = music.v1g.gain; a1.cancelScheduledValues(t);
    a1.setTargetAtTime(0.006, t, 0.03);
  }
  if (music.hype && music.o3 && music.v3g) {
    const arp = [0, 2, 5, 7];
    const n = arp[step % arp.length];
    const f3 = midiToFreq(root + 24 + n);
    music.o3.frequency.setValueAtTime(f3, t);
    const a3 = music.v3g.gain; a3.cancelScheduledValues(t);
    a3.setValueAtTime(0.0001, t);
    a3.exponentialRampToValueAtTime(0.05, t + 0.006);
    a3.exponentialRampToValueAtTime(0.01, endT);
  }
  // Simple percussion: kick/snare/hat
  if (step % 8 === 0) hit('kick', t, stepSec); // beats 1 and 3
  if (step % 16 === 8) hit('snare', t, stepSec); // beats 2 and 4
  if (step % 2 === 0) hit('hat', t, stepSec, 0.03); // light hats on 8ths
  // Occasional fill every 16 steps
  if (step === 15) hit('fill', t, stepSec * 2);
  music.step++;
}

function midiToFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); }

function hit(kind, t, len, vol) {
  const ctx = music.ctx;
  const g = ctx.createGain(); g.gain.value = (vol || 1) * 0.12; g.connect(music.gain);
  const o = ctx.createOscillator();
  if (kind === 'kick') {
    o.type = 'sine'; o.connect(g);
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(45, t + Math.min(0.08, len * 0.6));
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(0.12, len));
    o.start(t); o.stop(t + Math.min(0.14, len));
  } else if (kind === 'snare') {
    o.type = 'triangle'; o.connect(g);
    o.frequency.setValueAtTime(200, t);
    g.gain.setValueAtTime(g.gain.value * 0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(0.09, len));
    o.start(t); o.stop(t + Math.min(0.1, len));
  } else if (kind === 'hat') {
    o.type = 'square'; o.connect(g);
    o.frequency.setValueAtTime(6000, t);
    g.gain.setValueAtTime(g.gain.value * 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(0.03, len));
    o.start(t); o.stop(t + Math.min(0.035, len));
  } else if (kind === 'fill') {
    // tiny tom-like down sweep
    o.type = 'sine'; o.connect(g);
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(120, t + Math.min(0.2, len));
    g.gain.setValueAtTime(g.gain.value * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(0.22, len));
    o.start(t); o.stop(t + Math.min(0.24, len));
  }
}

// Start/Main menu
function openStartMenu(scene) {
  startMenu = {
    overlay: scene.add.graphics().setDepth(1400),
    bg: scene.add.graphics().setDepth(1400),
    sel: scene.add.graphics().setDepth(1401),
    title: scene.add.text(400, 160, 'TurboTurbo', { fontSize: '52px', fontFamily: 'Arial, sans-serif', color: '#ffffff', stroke: '#00d4ff', strokeThickness: 6 }).setOrigin(0.5).setDepth(1401),
    subtitle: scene.add.text(400, 210, '2P Battle-Race', styleText('#cfe0ff', 20)).setOrigin(0.5).setDepth(1401),
    options: ['Start', 'Instructions', 'Credits'],
    idx: 0,
    mode: 'main',
    rows: [],
    info: null,
    tip: scene.add.text(400, 520, 'Up/Down to select • Enter to confirm', styleText('#ffff66', 18)).setOrigin(0.5).setDepth(1401)
  };
  running = false;
  // dim background
  startMenu.overlay.fillStyle(0x000000, 0.55); startMenu.overlay.fillRect(0, 0, 800, 600);
  // panel
  const pw = 560, ph = 360; const px = 120, py = 120;
  startMenu.bg.fillStyle(0x0b0f1a, 0.95); startMenu.bg.fillRoundedRect(px, py, pw, ph, 18);
  startMenu.bg.lineStyle(2, 0x1f3b73, 0.9); startMenu.bg.strokeRoundedRect(px, py, pw, ph, 18);
  // option rows
  for (let i = 0; i < startMenu.options.length; i++) {
    const y = 270 + i * 44;
    const t = scene.add.text(400, y, startMenu.options[i], styleText('#cfe0ff', 24)).setOrigin(0.5).setDepth(1401);
    startMenu.rows.push(t);
  }
  drawStartMenu();
}

function drawStartMenu() {
  if (!startMenu) return;
  startMenu.sel.clear();
  // highlight only in main mode
  if (startMenu.mode === 'main') {
    for (let i = 0; i < startMenu.rows.length; i++) startMenu.rows[i].setVisible(true);
    if (startMenu.info) startMenu.info.setVisible(false);
    const y = 270 + startMenu.idx * 44 - 18;
    startMenu.sel.fillStyle(0x00d4ff, 0.16); startMenu.sel.fillRoundedRect(220, y, 360, 36, 10);
    startMenu.sel.lineStyle(1, 0x00d4ff, 0.6); startMenu.sel.strokeRoundedRect(220, y, 360, 36, 10);
    for (let i = 0; i < startMenu.rows.length; i++) {
      startMenu.rows[i].setColor(i === startMenu.idx ? '#00e5ff' : '#cfe0ff');
    }
    startMenu.tip.setText('Up/Down to select • Enter to confirm');
  } else {
    // subview: instructions or credits
    for (let i = 0; i < startMenu.rows.length; i++) startMenu.rows[i].setVisible(false);
    if (!startMenu.info) {
      startMenu.info = sceneRef.add.text(400, 340, '', { fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#e6f1ff', align: 'center', wordWrap: { width: 520 } }).setOrigin(0.5).setDepth(1401);
    }
    startMenu.info.setVisible(true);
    if (startMenu.mode === 'instructions') {
      startMenu.info.setText(
        'How to Play:\n\n' +
        '• P1: Move with W/A/S/D, use item with E\n' +
        '• P2: Move with Arrow Keys, use item with Enter\n' +
        '• Avoid walls and spikes, survive longer than your opponent\n' +
        '• Grab item boxes for multi-directional shots\n' +
        '• Press T in-game for Config. Press M to toggle music.'
      );
    } else if (startMenu.mode === 'credits') {
      startMenu.info.setText('Made by Renato Baeza for the Platanus Hackathon 2025');
    }
    startMenu.tip.setText('Backspace/Esc to go back');
  }
  handleStartMenuInput();
}

function handleStartMenuInput() {
  if (!startMenu) return;
  if (startMenu.mode === 'main') {
    if (Phaser.Input.Keyboard.JustDown(keys.up)) startMenu.idx = (startMenu.idx + startMenu.options.length - 1) % startMenu.options.length;
    if (Phaser.Input.Keyboard.JustDown(keys.down)) startMenu.idx = (startMenu.idx + 1) % startMenu.options.length;
    if (Phaser.Input.Keyboard.JustDown(keys.enter) || Phaser.Input.Keyboard.JustDown(keys.space)) {
      const sel = startMenu.options[startMenu.idx];
      if (sel === 'Start') { closeStartMenu(); initMatch(sceneRef); return; }
      if (sel === 'Instructions') { startMenu.mode = 'instructions'; }
      if (sel === 'Credits') { startMenu.mode = 'credits'; }
    }
  } else {
    if (Phaser.Input.Keyboard.JustDown(keys.back) || Phaser.Input.Keyboard.JustDown(keys.esc)) {
      startMenu.mode = 'main';
    }
  }
}

function closeStartMenu() {
  if (!startMenu) return;
  startMenu.overlay.destroy();
  startMenu.bg.destroy();
  startMenu.sel.destroy();
  startMenu.title.destroy();
  startMenu.subtitle.destroy();
  if (startMenu.info) startMenu.info.destroy();
  startMenu.rows.forEach(r => r.destroy());
  startMenu.tip.destroy();
  startMenu = null;
  running = true;
}

// Pause/config menu
function openMenu(scene) {
  menu = {
    overlay: scene.add.graphics().setDepth(1600),
    bg: scene.add.graphics().setDepth(1600),
    sel: scene.add.graphics().setDepth(1600),
    container: scene.add.container(0, 0).setDepth(1600),
    maskG: null,
    mask: null,
    view: { x: 180, y: 164, w: 440, h: 292 },
    scroll: 0,
    maxScroll: 0,
    title: scene.add.text(400, 120, 'Config', { fontSize: '36px', fontFamily: 'Arial, sans-serif', color: '#ffffff', stroke: '#00d4ff', strokeThickness: 2 }).setOrigin(0.5).setDepth(1601),
    items: [
      { name: 'Match Time', get: () => MATCH_TIME, set: v => { MATCH_TIME = clampInt(v, 10, 300); } },
      { name: 'Start Lives', get: () => LIFE_START, set: v => { LIFE_START = clampInt(v, 1, 9); } },
      { name: 'Obstacle Rate', get: () => RATE_OBS, set: v => { RATE_OBS = clamp(v, 0, 0.1); } },
      { name: 'Spike Rate', get: () => RATE_SPIKE, set: v => { RATE_SPIKE = clamp(v, 0, 0.05); } },
      { name: 'Item Rate', get: () => RATE_ITEM, set: v => { RATE_ITEM = clamp(v, 0, 0.05); } },
      { name: 'Enemy Missiles', get: () => RATE_EMISS, set: v => { RATE_EMISS = clamp(v, 0, 0.05); } },
      { name: 'Front Miss Spd', get: () => FRONT_MISSILE_SPEED, set: v => { FRONT_MISSILE_SPEED = clamp(v, 0.05, 2); } },
      { name: 'Topdown Miss Spd', get: () => TOPDOWN_MISSILE_SPEED, set: v => { TOPDOWN_MISSILE_SPEED = clamp(v, 0.05, 2); } },
      { name: 'Speed Slow', get: () => SPD_SLOW, set: v => { SPD_SLOW = clamp(v, 0.02, 1); } },
      { name: 'Speed Med', get: () => SPD_MED, set: v => { SPD_MED = clamp(v, 0.02, 1.5); } },
      { name: 'Speed Fast', get: () => SPD_FAST, set: v => { SPD_FAST = clamp(v, 0.02, 2); } },
      { name: 'Move Speed', get: () => MOVE_SPEED, set: v => { MOVE_SPEED = clamp(v, 0.1, 3); } },
      { name: 'Wall Hit Dmg', get: () => WALL_HIT_DAMAGE, set: v => { WALL_HIT_DAMAGE = clampInt(v, 1, 9); } },
      { name: 'Shot Dmg Mult', get: () => SHOT_DAMAGE_MULT, set: v => { SHOT_DAMAGE_MULT = clampInt(v, 1, 9); } },
    ],
    idx: 0,
    rows: [],
    tip: scene.add.text(400, 480, 'Up/Down select • Left/Right change • T to resume', styleText('#ffff66', 16)).setOrigin(0.5).setDepth(1601)
  };
  menu.overlay.fillStyle(0x000000, 0.55); menu.overlay.fillRect(0, 0, 800, 600);
  // panel background
  const pw = 520, ph = 360; const px = 140, py = 120;
  menu.bg.fillStyle(0x0b0f1a, 0.9); menu.bg.fillRoundedRect(px, py, pw, ph, 16);
  menu.bg.lineStyle(2, 0x1f3b73, 0.8); menu.bg.strokeRoundedRect(px, py, pw, ph, 16);
  // rows inside scrollable container
  for (let i = 0; i < menu.items.length; i++) {
    const y = 180 + i * 34;
    const txt = scene.add.text(400, y, '', styleText('#e6f1ff', 20)).setOrigin(0.5);
    menu.container.add(txt);
    menu.rows.push(txt);
  }
  // mask for scroll viewport
  menu.maskG = scene.add.graphics().setDepth(1600);
  menu.maskG.fillStyle(0xffffff, 1);
  menu.maskG.fillRect(menu.view.x, menu.view.y, menu.view.w, menu.view.h);
  menu.mask = menu.maskG.createGeometryMask();
  menu.container.setMask(menu.mask);
  // do not render the geometry used for the mask
  menu.maskG.setVisible(false);
  // mask the selection highlight too
  menu.sel.setMask(menu.mask);
  // compute max scroll
  const lastY = 180 + (menu.items.length - 1) * 34 + 16;
  const viewBottom = menu.view.y + menu.view.h;
  menu.maxScroll = Math.max(0, lastY - viewBottom);
  running = false;
  drawMenu();
  // wheel scroll
  menu._onWheel = (pointer, gameObjects, dx, dy) => {
    menu.scroll = clamp(menu.scroll + dy * 0.25, 0, menu.maxScroll);
    menu.container.y = -menu.scroll;
  };
  scene.input.on('wheel', menu._onWheel);
}

function drawMenu() {
  // selection highlight bar
  if (menu && menu.sel) {
    menu.sel.clear();
    // ensure selected row stays within viewport (auto-scroll)
    const rowY = 180 + menu.idx * 34;
    const topVisible = menu.view.y + 18;
    const botVisible = menu.view.y + menu.view.h - 18;
    const desiredTop = rowY - 16;
    const desiredBot = rowY + 16;
    if (desiredTop < topVisible) menu.scroll = clamp(menu.scroll - (topVisible - desiredTop), 0, menu.maxScroll);
    if (desiredBot > botVisible) menu.scroll = clamp(menu.scroll + (desiredBot - botVisible), 0, menu.maxScroll);
    menu.container.y = -menu.scroll;
    const y = rowY - 16 - menu.scroll;
    menu.sel.fillStyle(0x00d4ff, 0.16); menu.sel.fillRoundedRect(menu.view.x, y, menu.view.w, 32, 8);
    menu.sel.lineStyle(1, 0x00d4ff, 0.6); menu.sel.strokeRoundedRect(menu.view.x, y, menu.view.w, 32, 8);
  }
  for (let i = 0; i < menu.items.length; i++) {
    const it = menu.items[i];
    const sel = (i === menu.idx);
    const name = it.name;
    const val = it.get();
    const color = sel ? '#00e5ff' : '#cfe0ff';
    menu.rows[i].setColor(color).setText(name + ': ' + formatVal(val));
  }
  handleMenuInput();
}

function handleMenuInput() {
  if (Phaser.Input.Keyboard.JustDown(keys.up)) menu.idx = (menu.idx + menu.items.length - 1) % menu.items.length;
  if (Phaser.Input.Keyboard.JustDown(keys.down)) menu.idx = (menu.idx + 1) % menu.items.length;
  const step = (menu.idx <= 1) ? 1 : (menu.idx <= 4 ? 0.001 : (menu.idx <= 8 ? 0.01 : 0.1));
  if (Phaser.Input.Keyboard.JustDown(keys.left)) menu.items[menu.idx].set(menu.items[menu.idx].get() - step);
  if (Phaser.Input.Keyboard.JustDown(keys.right)) menu.items[menu.idx].set(menu.items[menu.idx].get() + step);
  // Page scroll with WASD vertical (optional): W/S mirrors Up/Down hold
  if (keys.w.isDown && !Phaser.Input.Keyboard.JustDown(keys.w)) { menu.scroll = clamp(menu.scroll - 6, 0, menu.maxScroll); menu.container.y = -menu.scroll; }
  if (keys.s.isDown && !Phaser.Input.Keyboard.JustDown(keys.s)) { menu.scroll = clamp(menu.scroll + 6, 0, menu.maxScroll); menu.container.y = -menu.scroll; }
}

function closeMenu(scene) {
  if (!menu) return;
  menu.overlay.destroy();
  if (menu.bg) menu.bg.destroy();
  if (menu.sel) menu.sel.destroy();
  if (menu.container) menu.container.destroy(true);
  if (menu.maskG) menu.maskG.destroy();
  if (scene && menu._onWheel) scene.input.off('wheel', menu._onWheel);
  menu.title.destroy();
  menu.tip.destroy();
  menu.rows.forEach(r => { if (!r.destroyed) r.destroy(); });
  menu = null;
  if (!endText) running = true;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function clampInt(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v))); }
function formatVal(v) { return (typeof v === 'number' && Math.abs(v - Math.round(v)) > 0.0001) ? v.toFixed(3) : String(v); }
