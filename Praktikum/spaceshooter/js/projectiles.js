// projectiles.js – Spieler-Projektile, Gegner-Projektile, Powerups, Partikel, Float-Texte

import { W, H, WEAPONS, POWERUP_TYPES } from './config.js';

/* ════════════════════════════════════════════
   PARTIKEL
   ════════════════════════════════════════════ */
const MAX_PARTICLES = 600;

export class Particles {
  constructor() { this.list = []; }

  spawn(x, y, color, count, opts = {}) {
    for (let i = 0; i < count && this.list.length < MAX_PARTICLES; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (opts.speed || 4) * (Math.random() * 0.8 + 0.2);
      this.list.push({
        x, y,
        vx: Math.cos(ang) * spd + (opts.dvx || 0),
        vy: Math.sin(ang) * spd + (opts.dvy || 0),
        life: (opts.life || 40) + Math.random() * 15,
        maxLife: (opts.life || 40) + 15,
        size: opts.size || (Math.random() * 3 + 1),
        color,
        type: opts.type || 'spark',
      });
    }
  }

  ring(x, y, color, radius) {
    for (let i = 0; i < 40; i++) {
      const ang = (Math.PI * 2 / 40) * i;
      this.list.push({
        x: x + Math.cos(ang) * 5,
        y: y + Math.sin(ang) * 5,
        vx: Math.cos(ang) * radius / 25,
        vy: Math.sin(ang) * radius / 25,
        life: 25, maxLife: 25, size: 3, color, type: 'ring',
      });
    }
  }

  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.98; p.vy *= 0.98;
      p.life--;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      if (p.type === 'ring') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }
}

/* ════════════════════════════════════════════
   SPIELER-PROJEKTILE
   ════════════════════════════════════════════ */
export class PlayerBullets {
  constructor() { this.list = []; }

  fire(player, enemies) {
    const w = WEAPONS[player.weapon];
    const baseSpeed = w.speed;

    if (player.weapon === 'spread') {
      const angles = [-0.22, 0, 0.22];
      if (player.upgrades.doubleShot) angles.push(-0.11, 0.11);
      angles.forEach(a => this.list.push({
        x: player.x, y: player.y - 26,
        vx: Math.sin(a) * baseSpeed,
        vy: -Math.cos(a) * baseSpeed,
        dmg: player.getDmg(), pierce: false, size: 3,
      }));
    } else if (player.weapon === 'plasma') {
      this.list.push({
        x: player.x, y: player.y - 26,
        vx: 0, vy: -baseSpeed,
        dmg: player.getDmg(), pierce: true, size: 8,
      });
    } else if (player.weapon === 'rocket' && enemies.length) {
      const tgt = enemies.reduce((a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y) < Math.hypot(b.x - player.x, b.y - player.y) ? a : b
      );
      this.list.push({
        x: player.x, y: player.y - 26,
        vx: 0, vy: -3,
        dmg: player.getDmg(), pierce: false, size: 5,
        homing: true, target: tgt,
      });
    } else {
      // Laser (Standard)
      this.list.push({
        x: player.x, y: player.y - 26,
        vx: 0, vy: -baseSpeed,
        dmg: player.getDmg(), pierce: false, size: 3,
      });
      if (player.upgrades.doubleShot) {
        this.list.push({
          x: player.x - 8, y: player.y - 20,
          vx: 0, vy: -baseSpeed,
          dmg: player.getDmg(), pierce: false, size: 3,
        });
      }
    }
  }

  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      if (b.homing && b.target && !b.target.dead) {
        const dx = b.target.x - b.x, dy = b.target.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        b.vx += (dx / d) * 0.6;
        b.vy += (dy / d) * 0.6;
        const s = Math.hypot(b.vx, b.vy);
        if (s > 8) { b.vx = (b.vx / s) * 8; b.vy = (b.vy / s) * 8; }
      }
      b.x += b.vx; b.y += b.vy;
      if (b.y < -20 || b.y > H + 20 || b.x < -20 || b.x > W + 20)
        this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const b of this.list) {
      if (b.homing) {
        ctx.fillStyle = '#f44'; ctx.shadowColor = '#f44'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
      } else if (b.pierce) {
        ctx.fillStyle = '#c4f'; ctx.shadowColor = '#c4f'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
      } else {
        const g = ctx.createLinearGradient(b.x, b.y - 7, b.x, b.y + 7);
        g.addColorStop(0, '#ff0'); g.addColorStop(1, '#f80');
        ctx.fillStyle = g;
        ctx.shadowColor = '#ff0'; ctx.shadowBlur = 8;
        ctx.fillRect(b.x - b.size / 2, b.y - 7, b.size, 14);
      }
    }
    ctx.shadowBlur = 0;
  }
}

/* ════════════════════════════════════════════
   GEGNER-PROJEKTILE
   ════════════════════════════════════════════ */
export class EnemyBullets {
  constructor() { this.list = []; }

  add(shots) { this.list.push(...shots); }

  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.x += b.vx; b.y += b.vy;
      if (b.y > H + 20 || b.y < -20 || b.x < -20 || b.x > W + 20)
        this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const b of this.list) {
      ctx.fillStyle = b.col; ctx.shadowColor = b.col; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r || 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}

/* ════════════════════════════════════════════
   POWERUPS
   ════════════════════════════════════════════ */
export class PowerUps {
  constructor() { this.list = []; }

  drop(x, y, dropRateBonus = 0) {
    if (Math.random() > 0.18 + dropRateBonus) return;
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const colors = { weapon: '#f0f', shield: '#0cf', energy: '#ff0', multiplier: '#f80', credits: '#4f4' };
    const labels = { weapon: 'W', shield: 'S', energy: 'E', multiplier: 'x2', credits: '$' };
    this.list.push({
      x, y, type,
      vy: 1.2 + Math.random() * 0.5,
      col: colors[type], label: labels[type],
      life: 360,
    });
  }

  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      this.list[i].y += this.list[i].vy;
      this.list[i].life--;
      if (this.list[i].y > H + 20 || this.list[i].life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx, fc) {
    for (const p of this.list) {
      const pulse = 0.85 + Math.sin(fc * 0.1) * 0.15;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = p.col;
      ctx.shadowColor = p.col; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000'; ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center';
      ctx.fillText(p.label, 0, 4);
      ctx.restore();
    }
  }

  collect(player, radius) {
    const results = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (Math.hypot(p.x - player.x, p.y - player.y) < radius) {
        results.push(p.type);
        this.list.splice(i, 1);
      }
    }
    return results;
  }
}

/* ════════════════════════════════════════════
   FLOAT-TEXTE (Schadens-/Bonus-Anzeigen)
   ════════════════════════════════════════════ */
export class FloatTexts {
  constructor() { this.list = []; }

  add(x, y, text, color = '#fff') {
    this.list.push({ x, y, text, color, life: 40 });
  }

  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      this.list[i].y -= 0.8;
      this.list[i].life--;
      if (this.list[i].life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const t of this.list) {
      ctx.globalAlpha = Math.max(0, t.life / 40);
      ctx.fillStyle = t.color;
      ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
