// game.js – Haupt-Spiellogik: Loop, Kollisionen, HUD, Menüs, Shop, Koop

import { W, H, SHIPS, COLORS, FACTIONS, WEAPONS, TECH_TREE } from './config.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Renderer } from './renderer.js';
import { Player } from './player.js';
import { Particles, PlayerBullets, EnemyBullets, PowerUps, FloatTexts } from './projectiles.js';
import { World } from './world.js';
import { WaveManager } from './waves.js';
import { StoryManager } from './story.js';

/* ════════════════════════════════════════════
   GAME
   ════════════════════════════════════════════ */
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.ctx = this.renderer.ctx;
    this.input = new Input();
    this.audio = new Audio();
    this.world = new World();
    this.story = new StoryManager();

    this.state = 'menu'; // menu | shipSelect | playing | shop | dialog | factionSelect | gameover
    this.coop = false;
    this.fc = 0;

    // Spielobjekte
    this.players = [];
    this.enemies = [];
    this.pBullets = new PlayerBullets();
    this.eBullets = new EnemyBullets();
    this.particles = new Particles();
    this.powerUps = new PowerUps();
    this.floatTexts = new FloatTexts();
    this.waves = new WaveManager();

    // Shop / Upgrades
    this.credits = 0;
    this.techLevels = { offense: 0, defense: 0, utility: 0 };
    this.shopCursor = 0;
    this.selectedShip = 'allrounder';
    this.selectedColor = 'cyan';
    this.selectedShip2 = 'fighter';
    this.selectedColor2 = 'green';

    // Pause-Zustand
    this.waveDelay = 0;

    // Highscore
    this.highscore = parseInt(localStorage.getItem('ss_highscore') || '0', 10);

    // Background-Loop starten
    this._bgLoop();
  }

  /* ── Menü-Hintergrundanimation ── */
  _bgLoop() {
    if (this.state === 'playing') return;
    this._bgRaf = requestAnimationFrame(() => this._bgLoop());
    this.renderer.beginFrame();
    this.world.update(this.fc++);
    this.world.draw(this.ctx, this.fc);
    this.renderer.endFrame();
  }

  /* ══════════════════════════════
     START
     ══════════════════════════════ */
  startGame() {
    if (this._bgRaf) cancelAnimationFrame(this._bgRaf);
    this.audio.init();
    this.state = 'playing';
    this.fc = 0;
    this.credits = 0;
    this._score = 0;
    this.techLevels = { offense: 0, defense: 0, utility: 0 };

    this.players = [new Player(this.selectedShip, this.selectedColor, false)];
    if (this.coop) this.players.push(new Player(this.selectedShip2, this.selectedColor2, true));

    this.enemies = [];
    this.pBullets = new PlayerBullets();
    this.eBullets = new EnemyBullets();
    this.particles = new Particles();
    this.powerUps = new PowerUps();
    this.floatTexts = new FloatTexts();
    this.waves = new WaveManager();
    this.story = new StoryManager();

    this.waves.nextWave(this.enemies);
    this.story.checkWaveTriggers(this.waves.wave);

    this.audio.play('waveStart');
    this.waveDelay = 0;
    this._loop();
  }

  /* ══════════════════════════════
     GAME LOOP
     ══════════════════════════════ */
  _loop() {
    if (this.state !== 'playing') return;
    requestAnimationFrame(() => this._loop());

    this.input.update();
    this.fc++;

    const R = this.renderer;
    const ctx = this.ctx;
    R.beginFrame();

    // Hintergrund
    this.world.update(this.fc);
    this.world.draw(ctx, this.fc);

    // Dialog-Pause
    if (this.story.currentDialog) {
      this._drawGame(ctx);
      this.story.drawDialog(ctx, W, H);
      if (this.input.just('Enter') || this.input.just('Space')) {
        const d = this.story.currentDialog;
        if (d.chooseFaction) { this.state = 'factionSelect'; this.story.currentDialog = null; this._showFactionSelect(); }
        else { this.story.nextDialog(); }
      }
      R.endFrame(); this.input.afterUpdate(); return;
    }

    // Neue Dialoge prüfen
    if (this.story.dialogQueue.length > 0) {
      this.story.nextDialog();
      R.endFrame(); this.input.afterUpdate(); return;
    }

    // Wellen-Übergang
    if (this.waves.isWaveCleared && this.waveDelay <= 0) {
      // Shop alle 5 Wellen
      if (this.waves.wave > 0 && this.waves.wave % 5 === 0) {
        this.state = 'shop'; this._showShop();
        R.endFrame(); this.input.afterUpdate(); return;
      }
      this.waveDelay = 90;
    }
    if (this.waveDelay > 0) {
      this.waveDelay--;
      if (this.waveDelay <= 0 && this.waves.isWaveCleared) {
        this.waves.nextWave(this.enemies);
        this.story.checkWaveTriggers(this.waves.wave);
        if (this.waves.wave % 10 === 0) this.story.addBossDialog(this.waves.wave);
        this.audio.play('waveStart');
        this.world.setScheme(Math.floor(this.waves.wave / 5));
      }
    }

    // Spieler
    this.players.forEach((p, idx) => {
      const inp = idx === 0 ? this.input.getP1() : this.input.getP2();
      p.update(0, inp);
      if (p.wantsToShoot(inp)) {
        this.pBullets.fire(p, this.enemies);
        this.audio.play('shoot');
      }
      if (inp.barrelL || inp.barrelR) this.audio.play('barrelRoll');
    });

    // Projektile
    this.pBullets.update();
    this.eBullets.update();

    // Gegner
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(this.fc, this.waves.wave);

      // Gegner-Schüsse
      const target = this._closestAlivePlayer(e.x, e.y);
      if (target) {
        const shots = e.wantsToShoot(target.x, target.y);
        if (shots) { this.eBullets.add(shots); this.audio.play('enemyShoot'); }
      }

      if (e.dead) { this.enemies.splice(i, 1); continue; }

      // Kollision Gegner → Spieler
      for (const p of this.players) {
        if (!p.alive || p.invincible > 0) continue;
        if (Math.abs(p.x - e.x) < 20 + e.w / 2 && Math.abs(p.y - e.y) < 22 + e.h / 2) {
          this.particles.spawn(e.x, e.y, e.col, 18);
          this.audio.play('hit');
          R.addShake(6, 12);
          p.hit(1);
          e.dead = true;
          this.enemies.splice(i, 1);
          break;
        }
      }
    }

    // Spieler-Projektile → Gegner
    for (let i = this.pBullets.list.length - 1; i >= 0; i--) {
      const b = this.pBullets.list[i];
      let hit = false;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (Math.abs(b.x - e.x) < e.w / 2 + b.size + 5 && Math.abs(b.y - e.y) < e.h / 2 + 8) {
          e.hp -= b.dmg;
          this.particles.spawn(b.x, b.y, '#ff0', 5);
          if (e.hp <= 0) {
            this.particles.spawn(e.x, e.y, e.col, 22);
            this.particles.ring(e.x, e.y, e.col, 30);
            this.audio.play('explosion');
            R.addShake(3, 6);
            const shooter = this.players.find(p => p.alive) || this.players[0];
            const pts = e.pts * shooter.multiplier;
            this.credits += Math.ceil(pts / 5);
            this._addScore(pts, e.x, e.y);
            this.powerUps.drop(e.x, e.y, shooter.upgrades.dropRate);
            this.enemies.splice(j, 1);
          }
          if (!b.pierce) hit = true;
          break;
        }
      }

      // Spieler-Projektile → Boss
      if (!hit && this.waves.bossActive && this.waves.boss) {
        const boss = this.waves.boss;
        const target = boss.hitTest(b.x, b.y);
        if (target) {
          boss.applyHit(target, b.dmg);
          this.particles.spawn(b.x, b.y, '#ff0', 4);
          if (boss.dead) {
            this.particles.spawn(boss.x, boss.y, '#f80', 60);
            this.particles.ring(boss.x, boss.y, '#ff0', 80);
            R.addShake(15, 30);
            R.flash('#fff', 0.5);
            this.audio.play('bigExplosion');
            this.waves.bossActive = false;
            this._addScore(500, boss.x, boss.y);
            this.credits += 100;
            this.story.unlock('boss_killed');
          }
          if (!b.pierce) hit = true;
        }
      }

      // Spieler-Projektile → Asteroiden
      if (!hit) {
        for (let j = this.waves.asteroids.length - 1; j >= 0; j--) {
          const a = this.waves.asteroids[j];
          if (Math.hypot(b.x - a.x, b.y - a.y) < a.r + 5) {
            a.hp--;
            this.particles.spawn(b.x, b.y, '#aa8', 4);
            if (a.hp <= 0) {
              a.dead = true;
              this.particles.spawn(a.x, a.y, '#998', 12);
              this.audio.play('explosion');
              this.credits += 5;
              this.floatTexts.add(a.x, a.y, '+5$', '#4f4');
              this.waves.asteroids.splice(j, 1);
            }
            if (!b.pierce) hit = true;
            break;
          }
        }
      }

      if (hit) this.pBullets.list.splice(i, 1);
    }

    // Gegner-Projektile → Spieler
    for (let i = this.eBullets.list.length - 1; i >= 0; i--) {
      const b = this.eBullets.list[i];
      for (const p of this.players) {
        if (!p.alive || p.invincible > 0) continue;
        if (Math.abs(b.x - p.x) < 14 && Math.abs(b.y - p.y) < 18) {
          this.eBullets.list.splice(i, 1);
          this.particles.spawn(b.x, b.y, '#f88', 8);
          p.hit(b.dmg || 1);
          this.audio.play('hit');
          R.addShake(5, 10);
          break;
        }
      }
    }

    // Asteroiden → Spieler
    for (const a of this.waves.asteroids) {
      for (const p of this.players) {
        if (!p.alive || p.invincible > 0) continue;
        if (Math.hypot(a.x - p.x, a.y - p.y) < a.r + 15) {
          p.hit(2);
          this.particles.spawn(a.x, a.y, '#aa8', 10);
          R.addShake(6, 12);
          a.dead = true;
        }
      }
    }

    // Boss-Schüsse + Boss-Laser
    if (this.waves.bossActive && this.waves.boss) {
      const boss = this.waves.boss;
      const target = this._closestAlivePlayer(boss.x, boss.y);
      if (target) {
        const shots = boss.getShots(target.x, target.y);
        if (shots.length) { this.eBullets.add(shots); this.audio.play('enemyShoot'); }
      }
      // Boss-Laser Treffer
      if (boss.laserActive > 0) {
        for (const p of this.players) {
          if (!p.alive || p.invincible > 0) continue;
          if (Math.abs(p.x - boss.x) < 22 && p.y > boss.y + boss.h / 2) {
            p.hit(0.05);
            if (this.fc % 10 === 0) this.particles.spawn(p.x, p.y - 10, '#f44', 3);
          }
        }
      }
    }

    // Schwarzes-Loch-Sog
    if (this.waves.activeEvent === 'blackhole') {
      const cx = W / 2, cy = H / 2;
      const sog = (e) => {
        const dx = cx - e.x, dy = cy - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const force = Math.min(2, 80 / d);
        e.x += (dx / d) * force * 0.3;
        e.y += (dy / d) * force * 0.3;
      };
      this.enemies.forEach(sog);
      this.players.forEach(p => { if (p.alive) sog(p); });
    }

    // Powerup-Einsammeln
    this.powerUps.update();
    for (const p of this.players) {
      if (!p.alive) continue;
      const collected = this.powerUps.collect(p, p.getCollectRadius());
      for (const type of collected) {
        this.audio.play('powerup');
        this._applyPowerUp(p, type);
      }
    }

    // Wellen-Manager
    this.waves.update(this.enemies, this.fc);
    this.particles.update();
    this.floatTexts.update();

    // Game-Over prüfen
    if (this.players.every(p => !p.alive && p.respawnTimer <= 0)) {
      this._gameOver();
      R.endFrame(); this.input.afterUpdate(); return;
    }

    // Achievements
    const score = this._totalScore();
    if (score >= 1000) this.story.unlock('score_1000');
    if (score >= 5000) this.story.unlock('score_5000');
    if (this.waves.wave >= 25) this.story.unlock('wave_25');

    /* ── ZEICHNEN ── */
    this._drawGame(ctx);

    // HUD
    this._drawHUD(ctx);

    // Wellen-Ankündigung
    if (this.waves.announceTimer > 0) {
      const a = Math.min(1, this.waves.announceTimer / 30);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Courier New'; ctx.textAlign = 'center';
      ctx.fillText(this.waves.announceText, W / 2, H / 2 - 60);
      ctx.globalAlpha = 1;
    }

    R.endFrame();
    this.input.afterUpdate();
  }

  /* ── Spielfeld zeichnen (wird auch während Dialog genutzt) ── */
  _drawGame(ctx) {
    // Asteroiden
    this.waves.drawAsteroids(ctx);

    // Schwarzes Loch
    if (this.waves.activeEvent === 'blackhole') {
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 80);
      g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.5, 'rgba(40,0,60,0.3)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2); ctx.fill();
    }

    // Spieler
    this.players.forEach(p => p.draw(ctx, this.renderer, this.fc));

    // Projektile
    this.pBullets.draw(ctx);
    this.eBullets.draw(ctx);

    // Gegner
    const target = this._closestAlivePlayer(W / 2, H / 2);
    for (const e of this.enemies) e.draw(ctx, this.fc, target?.x, target?.y);

    // Boss
    this.waves.drawBoss(ctx);

    // Partikel + Texte
    this.particles.draw(ctx);
    this.powerUps.draw(ctx, this.fc);
    this.floatTexts.draw(ctx);
  }

  /* ── HUD ── */
  _drawHUD(ctx) {
    ctx.textAlign = 'left';
    ctx.font = '16px Courier New';

    // Spieler-Info
    this.players.forEach((p, i) => {
      const yOff = 16 + i * 52;
      const label = this.coop ? (i === 0 ? 'P1' : 'P2') : '';

      // HP
      ctx.fillStyle = '#f44';
      ctx.fillText(`${label} HP: ${'♥'.repeat(Math.max(0, Math.ceil(p.hp)))}`, 15, yOff);

      // Schild-Balken
      const sw = 80, sx = 15, sy = yOff + 5;
      ctx.fillStyle = '#123'; ctx.fillRect(sx, sy, sw, 6);
      ctx.fillStyle = '#0cf'; ctx.fillRect(sx, sy, sw * Math.max(0, p.shield / p.getMaxShield()), 6);

      // Boost-Balken
      const by = sy + 9;
      ctx.fillStyle = '#220'; ctx.fillRect(sx, by, sw, 4);
      ctx.fillStyle = '#ff0'; ctx.fillRect(sx, by, sw * (p.boostEnergy / (p.maxBoostEnergy * (1 + p.upgrades.boostMult))), 4);

      // Energie-Verteilung
      ctx.fillStyle = '#888'; ctx.font = '10px Courier New';
      ctx.fillText(`🛡${p.energy.shield} ⚔${p.energy.weapons} 🚀${p.energy.thrust}`, sx + sw + 8, yOff);
      ctx.font = '16px Courier New';

      // Waffe
      ctx.fillStyle = '#aaa'; ctx.font = '11px Courier New';
      ctx.fillText(`[${WEAPONS[p.weapon].name}]`, sx + sw + 8, yOff + 14);
      if (p.multiplier > 1) {
        ctx.fillStyle = '#f80';
        ctx.fillText(`x${p.multiplier}`, sx + sw + 8, yOff + 26);
      }
      ctx.font = '16px Courier New';
    });

    // Score, Credits, Welle
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff'; ctx.fillText(`Punkte: ${this._totalScore()}`, W - 15, 16);
    ctx.fillStyle = '#4f4'; ctx.fillText(`Credits: ${this.credits}`, W - 15, 34);
    ctx.fillStyle = '#aaa'; ctx.fillText(`Welle: ${this.waves.wave}`, W - 15, 52);

    if (this.story.faction) {
      ctx.fillStyle = FACTIONS[this.story.faction].color;
      ctx.fillText(FACTIONS[this.story.faction].name, W - 15, 70);
    }

    // Barrel-Roll-Cooldown Indikator
    const p1 = this.players[0];
    if (p1 && p1.barrelCooldown > 0) {
      ctx.fillStyle = '#555'; ctx.font = '10px Courier New'; ctx.textAlign = 'center';
      ctx.fillText(`Roll: ${Math.ceil(p1.barrelCooldown / 60)}s`, W / 2, H - 12);
    }

    ctx.textAlign = 'center';
  }

  /* ══════════════════════════════
     HILFSFUNKTIONEN
     ══════════════════════════════ */
  _closestAlivePlayer(x, y) {
    let best = null, bd = Infinity;
    for (const p of this.players) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  _totalScore() {
    // Einfacher akkumulierter Score
    return this._score || 0;
  }

  _addScore(pts, x, y) {
    this._score = (this._score || 0) + Math.floor(pts);
    this.floatTexts.add(x, y - 10, `+${Math.floor(pts)}`, '#ff0');
  }

  _applyPowerUp(player, type) {
    switch (type) {
      case 'shield':
        player.shield = Math.min(player.getMaxShield(), player.shield + 20);
        this.floatTexts.add(player.x, player.y - 20, '+Schild', '#0cf');
        break;
      case 'energy':
        player.boostEnergy = player.maxBoostEnergy;
        this.floatTexts.add(player.x, player.y - 20, '+Energie', '#ff0');
        break;
      case 'multiplier':
        player.multiplier = 2; player.multiplierTimer = 600;
        this.floatTexts.add(player.x, player.y - 20, 'x2!', '#f80');
        break;
      case 'credits':
        this.credits += 20;
        this.floatTexts.add(player.x, player.y - 20, '+20$', '#4f4');
        break;
      case 'weapon': {
        const weps = Object.keys(WEAPONS);
        const cur = weps.indexOf(player.weapon);
        player.weapon = weps[(cur + 1) % weps.length];
        this.floatTexts.add(player.x, player.y - 20, WEAPONS[player.weapon].name, '#f0f');
        break;
      }
    }
  }

  _gameOver() {
    this.state = 'gameover';
    const score = this._totalScore();
    if (score > this.highscore) {
      this.highscore = score;
      localStorage.setItem('ss_highscore', String(score));
    }
    this._showGameOver(score, this.waves.wave);
  }

  /* ══════════════════════════════
     UI-SCREENS (über DOM)
     ══════════════════════════════ */
  _showShop() {
    const el = document.getElementById('shopScreen');
    if (!el) return;
    el.style.display = 'flex';
    const credEl = document.getElementById('shopCredits');
    if (credEl) credEl.textContent = `Credits: ${this.credits}`;
    this._renderShopContent();
  }

  _renderShopContent() {
    const el = document.getElementById('shopItems');
    if (!el) return;
    const paths = ['offense', 'defense', 'utility'];
    el.innerHTML = paths.map(path => {
      const level = this.techLevels[path];
      const tree = TECH_TREE[path];
      if (level >= tree.length) return `<div class="shop-path"><h3>${path.toUpperCase()} ✓</h3></div>`;
      const next = tree[level];
      const discount = this.story.faction === 'traders' ? 0.75 : 1;
      const cost = Math.floor(next.cost * discount);
      return `<div class="shop-path">
        <h3>${path.toUpperCase()} (${level}/${tree.length})</h3>
        <p>${next.name}</p>
        <button class="shop-buy" data-path="${path}" data-cost="${cost}" ${this.credits < cost ? 'disabled' : ''}>
          Kaufen: ${cost}$
        </button>
      </div>`;
    }).join('');

    el.querySelectorAll('.shop-buy').forEach(btn => {
      btn.onclick = () => {
        const path = btn.dataset.path;
        const cost = parseInt(btn.dataset.cost, 10);
        if (this.credits >= cost) {
          this.credits -= cost;
          const tree = TECH_TREE[path];
          const eff = tree[this.techLevels[path]].effect;
          this.techLevels[path]++;
          // Effekt auf alle Spieler anwenden
          this.players.forEach(p => {
            for (const [k, v] of Object.entries(eff)) {
              if (typeof p.upgrades[k] === 'boolean') p.upgrades[k] = v;
              else if (typeof p.upgrades[k] === 'number') p.upgrades[k] += v;
            }
          });
          this.audio.play('buy');
          const credEl = document.getElementById('shopCredits');
          if (credEl) credEl.textContent = `Credits: ${this.credits}`;
          this._renderShopContent();
        }
      };
    });
  }

  closeShop() {
    const el = document.getElementById('shopScreen');
    if (el) el.style.display = 'none';
    this.state = 'playing';
    this.waveDelay = 60;
    this._loop();
  }

  _showFactionSelect() {
    const el = document.getElementById('factionScreen');
    if (el) el.style.display = 'flex';
  }

  chooseFaction(key) {
    this.story.chooseFaction(key);
    this.players.forEach(p => p.faction = key);
    const el = document.getElementById('factionScreen');
    if (el) el.style.display = 'none';
    this.state = 'playing';
    this._loop();
  }

  _showGameOver(score, wave) {
    document.getElementById('finalScore').textContent = `Punkte: ${score} | Welle: ${wave} | Highscore: ${this.highscore}`;
    document.getElementById('gameOverScreen').style.display = 'flex';
  }

  hideScreens() {
    ['startScreen', 'gameOverScreen', 'shopScreen', 'factionScreen', 'shipSelectScreen'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
}
