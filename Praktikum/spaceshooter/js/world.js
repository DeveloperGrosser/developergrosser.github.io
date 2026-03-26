// world.js – Sternenfeld, Nebel-Parallax, Hintergrundanimation

import { W, H } from './config.js';

export class World {
  constructor() {
    this.stars = [];
    this.nebulae = [];
    this.colorScheme = 0;
    this.schemes = [
      { a: 'rgba(20,10,60,0.12)', b: 'rgba(10,30,60,0.08)' },
      { a: 'rgba(50,10,40,0.12)', b: 'rgba(30,10,50,0.08)' },
      { a: 'rgba(60,15,10,0.10)', b: 'rgba(40,20,15,0.07)' },
      { a: 'rgba(10,40,30,0.10)', b: 'rgba(10,25,40,0.07)' },
    ];
    this._init();
  }

  _init() {
    this.stars = [];
    for (let i = 0; i < 180; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 0.5,
        layer: Math.random() < 0.3 ? 0 : 1,
        brightness: Math.random(),
      });
    }
    this.nebulae = [];
    for (let i = 0; i < 3; i++) {
      this.nebulae.push({
        x: Math.random() * W,
        y: Math.random() * H * 2 - H,
        r: 120 + Math.random() * 100,
        speed: 0.15 + Math.random() * 0.2,
        layer: i,
      });
    }
  }

  setScheme(idx) { this.colorScheme = idx % this.schemes.length; }

  update(fc) {
    for (const s of this.stars) {
      s.y += s.speed * (s.layer === 0 ? 0.5 : 1);
      if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
      s.brightness = 0.4 + Math.sin(fc * 0.05 + s.x) * 0.5;
    }
    for (const n of this.nebulae) {
      n.y += n.speed;
      if (n.y - n.r > H) { n.y = -n.r * 2; n.x = Math.random() * W; }
    }
  }

  draw(ctx, fc) {
    const sch = this.schemes[this.colorScheme];

    // Nebulae (hinter Sternen)
    for (const n of this.nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.layer === 0 ? sch.a : sch.b);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }

    // Sterne
    for (const s of this.stars) {
      ctx.fillStyle = `rgba(255,255,255,${s.brightness})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
  }
}
