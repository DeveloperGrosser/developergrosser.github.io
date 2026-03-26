// audio.js – Prozedurale Soundeffekte via Web Audio API

export class Audio {
  constructor() { this.ctx = null; this.on = true; this.vol = 0.25; }

  init() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { this.on = false; }
  }

  play(name) {
    if (!this.on || !this.ctx) return;
    try {
      const fn = {
        shoot:       () => this._tone(0.05, 800, 200, 'square'),
        hit:         () => this._tone(0.08, 300, 100, 'sawtooth'),
        explosion:   () => this._boom(0.15),
        bigExplosion:() => this._boom(0.3),
        powerup:     () => this._sweep(0.15, 400, 800, 'sine'),
        boost:       () => this._tone(0.1, 100, 50, 'sawtooth'),
        barrelRoll:  () => this._sweep(0.2, 200, 600, 'triangle'),
        bossAlert:   () => this._sweep(0.3, 200, 100, 'square'),
        enemyShoot:  () => this._tone(0.04, 400, 200, 'square'),
        buy:         () => this._sweep(0.1, 500, 1000, 'sine'),
        waveStart:   () => this._sweep(0.2, 300, 600, 'triangle'),
      }[name];
      if (fn) fn();
    } catch { /* ignore audio errors */ }
  }

  _tone(dur, f1, f2, type) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    g.gain.setValueAtTime(this.vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  }

  _sweep(dur, f1, f2, type) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.linearRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(this.vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  }

  _boom(dur) {
    const t = this.ctx.currentTime;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * dur, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(this.vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(600, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    src.connect(f); f.connect(g); g.connect(this.ctx.destination);
    src.start(t); src.stop(t + dur);
  }
}
