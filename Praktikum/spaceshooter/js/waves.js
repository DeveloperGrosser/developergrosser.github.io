// waves.js – Wellen-System, Boss-Trigger, dynamische Events

import { Enemy, Boss, createFormation, Asteroid } from './enemies.js';
import { EVENTS, W, H } from './config.js';

export class WaveManager {
  constructor() {
    this.wave = 0;
    this.enemiesAlive = 0;
    this.spawnQueue = [];
    this.spawnDelay = 0;
    this.bossActive = false;
    this.boss = null;
    this.paused = false; // für Shop / Dialog-Pausen
    this.announceText = '';
    this.announceTimer = 0;
    this.activeEvent = null;
    this.eventTimer = 0;
    this.asteroids = [];
  }

  get isWaveCleared() { return this.spawnQueue.length === 0 && this.enemiesAlive <= 0 && !this.bossActive; }

  nextWave(enemies) {
    this.wave++;
    this.announce(`Welle ${this.wave}`);
    const spd = 1 + this.wave * 0.12;

    // Boss alle 10 Wellen
    if (this.wave % 10 === 0) {
      this.bossActive = true;
      this.boss = new Boss(this.wave);
      this.announce(`⚠ BOSS ⚠`);
      // Ein paar Begleitgegner
      for (let i = 0; i < 3; i++) this.spawnQueue.push(new Enemy({ speedMult: spd }));
      return;
    }

    // Formation alle 3 Wellen
    if (this.wave % 3 === 0) {
      const types = ['v', 'line', 'circle', 'zigzag'];
      const formation = createFormation(types[this.wave % types.length], this.wave);
      this.spawnQueue.push(...formation);
    }

    // Reguläre Gegner
    const count = 5 + this.wave * 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) this.spawnQueue.push(new Enemy({ speedMult: spd }));

    // Zufallsevents (10 % ab Welle 3)
    if (this.wave >= 3 && Math.random() < 0.12) this._startEvent();
  }

  update(enemies, fc) {
    // Announce-Timer
    if (this.announceTimer > 0) this.announceTimer--;

    // Boss
    if (this.bossActive && this.boss) {
      this.boss.update(fc);
      if (this.boss.shouldSpawnSwarm()) {
        for (let i = 0; i < 3; i++) enemies.push(new Enemy({ speedMult: 1 + this.wave * 0.1, type: 'fast' }));
      }
    }

    // Spawning (gestaffelter Spawn)
    if (this.spawnQueue.length > 0) {
      this.spawnDelay--;
      if (this.spawnDelay <= 0) {
        enemies.push(this.spawnQueue.shift());
        this.spawnDelay = Math.max(8, 30 - this.wave);
      }
    }

    // Events
    if (this.activeEvent) {
      this.eventTimer--;
      if (this.activeEvent === 'asteroids') {
        if (fc % 12 === 0) this.asteroids.push(new Asteroid());
      }
      if (this.activeEvent === 'pirates' && this.eventTimer === Math.floor(EVENTS.pirates.duration / 2)) {
        for (let i = 0; i < 4; i++) enemies.push(new Enemy({ type: 'fast', speedMult: 1.5, x: i < 2 ? -20 : W + 20 }));
      }
      if (this.eventTimer <= 0) this.activeEvent = null;
    }

    // Asteroiden
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      this.asteroids[i].update();
      if (this.asteroids[i].dead) this.asteroids.splice(i, 1);
    }

    // Schwarzes Loch (Sog-Effekt wird in game.js angewendet)
    this.enemiesAlive = enemies.length + (this.bossActive ? 1 : 0);
  }

  _startEvent() {
    const keys = Object.keys(EVENTS).filter(k => EVENTS[k].minWave <= this.wave);
    if (keys.length === 0) return;
    const key = keys[Math.floor(Math.random() * keys.length)];
    this.activeEvent = key;
    this.eventTimer = EVENTS[key].duration;
    this.announce(EVENTS[key].name);
  }

  announce(text) {
    this.announceText = text;
    this.announceTimer = 120;
  }

  drawAsteroids(ctx) {
    for (const a of this.asteroids) a.draw(ctx);
  }

  drawBoss(ctx) {
    if (this.boss && this.bossActive) this.boss.draw(ctx);
  }
}
