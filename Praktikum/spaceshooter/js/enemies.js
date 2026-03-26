// enemies.js – Gegner-Klassen, Formationen, Boss

import { W, H, ENEMIES } from './config.js';

/* ── Normaler Gegner ── */
export class Enemy {
  constructor(opts = {}) {
    const types = ['standard', 'fast', 'tank', 'sniper'];
    const rnd = Math.random();
    const type = opts.type || (rnd < 0.5 ? 'standard' : rnd < 0.72 ? 'fast' : rnd < 0.88 ? 'tank' : 'sniper');
    const def = ENEMIES[type];
    this.type = type;
    this.x = opts.x ?? Math.random() * (W - 60) + 30;
    this.y = opts.y ?? -35;
    this.w = def.w;
    this.h = def.h;
    this.speed = (opts.speedMult || 1) * def.speed + Math.random() * 0.4;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.pts = def.pts;
    this.col = def.col;
    this.vx = 0;
    this.shootTimer = def.shootRate > 0 ? 60 + Math.floor(Math.random() * def.shootRate) : 9999;
    this.shootRate = def.shootRate;
    this.dead = false;
  }

  update(fc, wave) {
    this.y += this.speed;
    if (this.type === 'fast') this.x += Math.sin(fc * 0.08 + this.y * 0.01) * 2.5;
    if (this.type === 'sniper') this.x += Math.sin(fc * 0.03 + this.y * 0.02) * 0.6;
    this.x = Math.max(10, Math.min(W - 10, this.x));
    if (wave >= 3 && this.shootRate > 0) this.shootTimer--;
    if (this.y > H + 50) this.dead = true;
  }

  wantsToShoot(playerX, playerY) {
    if (this.shootTimer > 0) return null;
    this.shootTimer = this.shootRate + Math.floor(Math.random() * 80);
    const dx = playerX - this.x, dy = playerY - this.y;
    const d = Math.hypot(dx, dy) || 1;
    if (this.type === 'sniper')
      return [{ x: this.x, y: this.y + this.h / 2, vx: dx / d * 7, vy: dy / d * 7, r: 5, col: '#0ff', dmg: 1.5 }];
    if (this.type === 'tank') {
      const ang = Math.atan2(dy, dx);
      return [-0.3, 0, 0.3].map(off => ({
        x: this.x, y: this.y + this.h / 2,
        vx: Math.cos(ang + off) * 3, vy: Math.sin(ang + off) * 3,
        r: 4, col: '#fa0', dmg: 1,
      }));
    }
    return [{ x: this.x, y: this.y + this.h / 2, vx: 0, vy: 3.5, r: 3, col: '#f55', dmg: 1 }];
  }

  draw(ctx, fc, playerX, playerY) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = this.col; ctx.shadowBlur = 8;
    ctx.fillStyle = this.col;

    if (this.type === 'standard') {
      ctx.beginPath();
      ctx.moveTo(0, -15); ctx.lineTo(-15, 10); ctx.lineTo(-5, 5);
      ctx.lineTo(0, 15); ctx.lineTo(5, 5); ctx.lineTo(15, 10);
      ctx.closePath(); ctx.fill();
    } else if (this.type === 'fast') {
      ctx.beginPath();
      ctx.moveTo(0, -12); ctx.lineTo(-12, 12); ctx.lineTo(12, 12);
      ctx.closePath(); ctx.fill();
    } else if (this.type === 'tank') {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 2;
        k === 0 ? ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20) : ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
      }
      ctx.closePath(); ctx.fill();
      const bw = 36;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#300'; ctx.fillRect(-bw / 2, -27, bw, 4);
      ctx.fillStyle = '#f80'; ctx.fillRect(-bw / 2, -27, bw * (this.hp / this.maxHp), 4);
      ctx.fillStyle = '#fff'; ctx.font = '11px Courier New'; ctx.textAlign = 'center';
      ctx.fillText(this.hp, 0, 5);
    } else if (this.type === 'sniper') {
      ctx.beginPath();
      ctx.moveTo(0, -15); ctx.lineTo(14, 0); ctx.lineTo(0, 15); ctx.lineTo(-14, 0);
      ctx.closePath(); ctx.fill();
      if (this.shootTimer < 28 && playerX != null) {
        const alpha = (28 - this.shootTimer) / 28 * 0.55;
        ctx.strokeStyle = `rgba(0,255,140,${alpha})`;
        ctx.lineWidth = 1; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(playerX - this.x, playerY - this.y);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

/* ── Boss ── */
export class Boss {
  constructor(wave) {
    this.x = W / 2;
    this.y = -120;
    this.targetY = 90;
    this.w = 200;
    this.h = 100;
    this.phase = 'enter';
    this.wave = wave;

    // Kern
    this.coreHp = 30 + wave * 5;
    this.coreMaxHp = this.coreHp;

    // Schild-Generator
    this.shieldHp = 15 + wave * 3;
    this.shieldMaxHp = this.shieldHp;

    // Kanonen (4 Stück)
    this.cannons = [
      { x: -70, y: 20, hp: 8, maxHp: 8, timer: 30 },
      { x: -35, y: 35, hp: 8, maxHp: 8, timer: 50 },
      { x: 35, y: 35, hp: 8, maxHp: 8, timer: 70 },
      { x: 70, y: 20, hp: 8, maxHp: 8, timer: 90 },
    ];

    this.dead = false;
    this.swarmTimer = 300;
    this.laserTimer = 0;
    this.laserActive = 0;
    this.moveDir = 1;
    this.fc = 0;
  }

  get totalHp() {
    return this.coreHp + this.shieldHp + this.cannons.reduce((s, c) => s + Math.max(0, c.hp), 0);
  }

  get totalMaxHp() {
    return this.coreMaxHp + this.shieldMaxHp + this.cannons.reduce((s, c) => s + c.maxHp, 0);
  }

  update(fc) {
    this.fc = fc;
    if (this.phase === 'enter') {
      this.y += 1;
      if (this.y >= this.targetY) this.phase = 'fight';
      return;
    }

    // Seitliche Bewegung
    this.x += Math.sin(fc * 0.01) * 0.8;
    this.x = Math.max(120, Math.min(W - 120, this.x));

    // Schwarm-Timer
    this.swarmTimer--;

    // Laser-Timer (wenn Kanonen noch leben)
    const liveCannons = this.cannons.filter(c => c.hp > 0);
    liveCannons.forEach(c => c.timer--);

    // Breit-Laser ab 50% HP
    if (this.coreHp < this.coreMaxHp * 0.5) {
      if (this.laserActive > 0) this.laserActive--;
      else this.laserTimer--;
      if (this.laserTimer <= 0) { this.laserActive = 90; this.laserTimer = 240; }
    }
  }

  getShots(playerX, playerY) {
    if (this.phase !== 'fight') return [];
    const shots = [];
    this.cannons.forEach(c => {
      if (c.hp <= 0 || c.timer > 0) return;
      c.timer = 50 + Math.floor(Math.random() * 40);
      const dx = playerX - (this.x + c.x), dy = playerY - (this.y + c.y);
      const d = Math.hypot(dx, dy) || 1;
      shots.push({
        x: this.x + c.x, y: this.y + c.y,
        vx: dx / d * 4, vy: dy / d * 4,
        r: 5, col: '#f80', dmg: 1.5,
      });
    });
    return shots;
  }

  shouldSpawnSwarm() {
    if (this.swarmTimer <= 0) { this.swarmTimer = 240 + Math.floor(Math.random() * 120); return true; }
    return false;
  }

  hitTest(bx, by) {
    // Schild zuerst
    if (this.shieldHp > 0) {
      if (Math.abs(bx - this.x) < this.w / 2 + 10 && Math.abs(by - this.y) < this.h / 2 + 15)
        return 'shield';
    }
    // Kanonen
    for (let i = 0; i < this.cannons.length; i++) {
      const c = this.cannons[i];
      if (c.hp > 0 && Math.abs(bx - (this.x + c.x)) < 18 && Math.abs(by - (this.y + c.y)) < 18)
        return { type: 'cannon', idx: i };
    }
    // Kern (nur wenn Schild down)
    if (this.shieldHp <= 0 && Math.abs(bx - this.x) < 35 && Math.abs(by - this.y) < 30)
      return 'core';
    return null;
  }

  applyHit(target, dmg) {
    if (target === 'shield') this.shieldHp = Math.max(0, this.shieldHp - dmg);
    else if (target === 'core') {
      this.coreHp = Math.max(0, this.coreHp - dmg);
      if (this.coreHp <= 0) this.dead = true;
    } else if (target.type === 'cannon') {
      this.cannons[target.idx].hp = Math.max(0, this.cannons[target.idx].hp - dmg);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Hauptkörper
    ctx.fillStyle = '#556';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // Streifen-Detail
    ctx.fillStyle = '#334';
    for (let i = -3; i <= 3; i++) ctx.fillRect(i * 25 - 5, -this.h / 2, 10, this.h);

    // Schildblase
    if (this.shieldHp > 0) {
      const a = (this.shieldHp / this.shieldMaxHp) * 0.22 + 0.04;
      ctx.strokeStyle = `rgba(100,180,255,${a})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#48f'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(0, 0, this.w / 2 + 15, this.h / 2 + 20, 0, 0, Math.PI * 2);
      ctx.stroke(); ctx.shadowBlur = 0;
    }

    // Kanonen
    this.cannons.forEach(c => {
      ctx.fillStyle = c.hp > 0 ? '#f80' : '#333';
      ctx.beginPath(); ctx.arc(c.x, c.y, 10, 0, Math.PI * 2); ctx.fill();
      if (c.hp > 0) {
        const bw = 18;
        ctx.fillStyle = '#300'; ctx.fillRect(c.x - bw / 2, c.y - 15, bw, 3);
        ctx.fillStyle = '#f80'; ctx.fillRect(c.x - bw / 2, c.y - 15, bw * (c.hp / c.maxHp), 3);
      }
    });

    // Kern
    ctx.fillStyle = this.shieldHp > 0 ? '#48f' : '#f44';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // HP-Balken (Kern)
    ctx.fillStyle = '#300'; ctx.fillRect(-40, -this.h / 2 - 14, 80, 6);
    ctx.fillStyle = '#f44'; ctx.fillRect(-40, -this.h / 2 - 14, 80 * (this.coreHp / this.coreMaxHp), 6);

    // Breit-Laser
    if (this.laserActive > 0) {
      const a = Math.min(1, this.laserActive / 30) * 0.4;
      ctx.fillStyle = `rgba(255,50,50,${a})`;
      ctx.fillRect(-20, this.h / 2, 40, H);
    }

    ctx.restore();
  }
}

/* ── Formationen ── */
export function createFormation(type, wave) {
  const cx = Math.random() * (W - 220) + 110;
  const sm = 1 + wave * 0.12;
  const enemies = [];
  const patterns = {
    v: [{ dx: 0, dy: 0 }, { dx: -50, dy: 30 }, { dx: 50, dy: 30 }, { dx: -100, dy: 60 }, { dx: 100, dy: 60 }],
    line: [{ dx: -120, dy: 0 }, { dx: -80, dy: 0 }, { dx: -40, dy: 0 }, { dx: 0, dy: 0 }, { dx: 40, dy: 0 }, { dx: 80, dy: 0 }, { dx: 120, dy: 0 }],
    circle: [{ dx: 0, dy: 0, t: 'tank' }, { dx: -40, dy: -30 }, { dx: 40, dy: -30 }, { dx: -40, dy: 30 }, { dx: 40, dy: 30 }],
    zigzag: [{ dx: -80, dy: 0 }, { dx: -40, dy: 30 }, { dx: 0, dy: 0 }, { dx: 40, dy: 30 }, { dx: 80, dy: 0 }],
  };
  const p = patterns[type] || patterns.v;
  p.forEach(pos => {
    enemies.push(new Enemy({
      type: pos.t || 'standard',
      x: cx + pos.dx,
      y: -50 + (pos.dy || 0),
      speedMult: sm,
    }));
  });
  return enemies;
}

/* ── Asteroiden (für Events) ── */
export class Asteroid {
  constructor() {
    this.x = Math.random() * W;
    this.y = -30;
    this.r = 12 + Math.random() * 20;
    this.speed = 1.5 + Math.random() * 2.5;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.04;
    this.hp = Math.ceil(this.r / 10);
    this.dead = false;
    this.verts = [];
    const n = 7 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 / n) * i;
      const d = this.r * (0.7 + Math.random() * 0.3);
      this.verts.push({ x: Math.cos(ang) * d, y: Math.sin(ang) * d });
    }
  }

  update() {
    this.y += this.speed;
    this.rot += this.rotSpeed;
    if (this.y > H + 50) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = '#665';
    ctx.strokeStyle = '#998';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this.verts.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
