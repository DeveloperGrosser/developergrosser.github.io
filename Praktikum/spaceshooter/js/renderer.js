// renderer.js – Canvas-Hilfsfunktionen, Screen-Shake, Trail, Flash

import { W, H } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;
    this.shake = { x: 0, y: 0, intensity: 0, time: 0, maxTime: 1 };
    this._trails = new Map();
    this._flash = null;
  }

  beginFrame() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake.time > 0) {
      this.shake.time--;
      const pct = this.shake.time / this.shake.maxTime;
      const i = this.shake.intensity * pct;
      this.shake.x = (Math.random() - 0.5) * i * 2;
      this.shake.y = (Math.random() - 0.5) * i * 2;
      ctx.translate(this.shake.x, this.shake.y);
    } else {
      this.shake.x = 0; this.shake.y = 0;
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }

  endFrame() {
    const ctx = this.ctx;
    if (this._flash) {
      ctx.globalAlpha = this._flash.alpha;
      ctx.fillStyle = this._flash.color;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      this._flash.alpha -= 0.03;
      if (this._flash.alpha <= 0) this._flash = null;
    }
    ctx.restore();
  }

  addShake(intensity, duration) {
    if (intensity > this.shake.intensity * (this.shake.time / (this.shake.maxTime || 1))) {
      this.shake.intensity = intensity;
      this.shake.time = duration;
      this.shake.maxTime = duration;
    }
  }

  flash(color = '#fff', alpha = 0.35) {
    this._flash = { color, alpha };
  }

  drawTrail(id, x, y, color, maxLen = 8) {
    if (!this._trails.has(id)) this._trails.set(id, []);
    const t = this._trails.get(id);
    t.push({ x, y });
    if (t.length > maxLen) t.shift();
    const ctx = this.ctx;
    for (let i = 0; i < t.length - 1; i++) {
      ctx.globalAlpha = (i / t.length) * 0.25;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t[i].x, t[i].y);
      ctx.lineTo(t[i + 1].x, t[i + 1].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  clearTrail(id) { this._trails.delete(id); }
}
