// player.js – Spieler-Klasse mit Physik, Boost, Barrel Roll, Energie-Management

import { W, H, SHIPS, COLORS, WEAPONS } from './config.js';

export class Player {
  constructor(shipType, colorScheme, isP2 = false) {
    const ship = SHIPS[shipType];
    this.shipType = shipType;
    this.ship = ship;
    this.color = COLORS[colorScheme];
    this.isP2 = isP2;

    // Position & Physik
    this.x = isP2 ? W * 0.35 : W / 2;
    this.y = H - 80;
    this.vx = 0;
    this.vy = 0;
    this.accel = 0.8 * ship.accel;
    this.friction = 0.88;
    this.maxSpeed = 6 * ship.speed;

    // Gesundheit
    this.maxHp = ship.maxHp;
    this.hp = this.maxHp;
    this.maxShield = ship.maxShield;
    this.shield = this.maxShield;

    // Kampf
    this.weapon = 'laser';
    this.shootCooldown = 0;
    this.invincible = 0;

    // Boost
    this.boostEnergy = 100;
    this.maxBoostEnergy = 100;
    this.boosting = false;

    // Barrel Roll
    this.barrelRoll = 0;
    this.barrelDir = 1;
    this.barrelCooldown = 0;

    // Energie-Verteilung
    this.energy = { shield: 33, weapons: 34, thrust: 33 };

    // Temporäre Effekte
    this.multiplier = 1;
    this.multiplierTimer = 0;

    // Status
    this.alive = true;
    this.respawnTimer = 0;
    this.specialCooldown = 0;
    this.faction = null;

    // Upgrade-Boni (kumuliert)
    this.upgrades = {
      dmgMult: 0, fireRateMult: 0, shieldMult: 0, speedMult: 0,
      hpBonus: 0, boostMult: 0, collectRadius: 0, dropRate: 0,
      autoRepair: 0, resistance: 0, critChance: 0,
      doubleShot: false, emergencyShield: false, droneSlot: false,
    };
  }

  /* ── Update ── */
  update(dt, inp) {
    if (!this.alive) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.alive = true;
        this.hp = this.maxHp + this.upgrades.hpBonus;
        this.shield = this.getMaxShield() * 0.5;
        this.invincible = 180;
        this.x = this.isP2 ? W * 0.35 : W / 2;
        this.y = H - 80;
        this.vx = 0; this.vy = 0;
      }
      return;
    }

    // Energie-Modifier
    const thrustMod = 0.5 + (this.energy.thrust / 100);
    const shieldRegen = this.energy.shield / 100;

    // Beschleunigung
    const a = this.accel * thrustMod * (1 + this.upgrades.speedMult);
    if (inp.left)  this.vx -= a;
    if (inp.right) this.vx += a;
    if (inp.up)    this.vy -= a;
    if (inp.down)  this.vy += a;

    // Boost
    if (inp.boost && this.boostEnergy > 0) {
      this.boosting = true;
      this.boostEnergy = Math.max(0, this.boostEnergy - 2);
      this.vx *= 1.04; this.vy *= 1.04;
    } else {
      this.boosting = false;
      this.boostEnergy = Math.min(
        this.maxBoostEnergy * (1 + this.upgrades.boostMult),
        this.boostEnergy + 0.4
      );
    }

    // Reibung
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Geschwindigkeit begrenzen
    const spd = Math.hypot(this.vx, this.vy);
    const max = this.maxSpeed * thrustMod * (1 + this.upgrades.speedMult) * (this.boosting ? 1.8 : 1);
    if (spd > max) { this.vx = (this.vx / spd) * max; this.vy = (this.vy / spd) * max; }

    this.x += this.vx;
    this.y += this.vy;
    this.x = Math.max(25, Math.min(W - 25, this.x));
    this.y = Math.max(35, Math.min(H - 35, this.y));

    // Barrel Roll
    if (this.barrelCooldown > 0) this.barrelCooldown--;
    if (this.barrelRoll > 0) {
      this.barrelRoll--;
      this.invincible = Math.max(this.invincible, 2);
    } else if (this.barrelCooldown <= 0) {
      if (inp.barrelL) { this.barrelRoll = 20; this.barrelDir = -1; this.barrelCooldown = 120; this.vx -= 4; }
      else if (inp.barrelR) { this.barrelRoll = 20; this.barrelDir = 1; this.barrelCooldown = 120; this.vx += 4; }
    }

    // Energie-Presets
    if (inp.energy1) this.energy = { shield: 60, weapons: 20, thrust: 20 };
    if (inp.energy2) this.energy = { shield: 20, weapons: 60, thrust: 20 };
    if (inp.energy3) this.energy = { shield: 20, weapons: 20, thrust: 60 };

    // Schild-Regeneration
    if (this.shield < this.getMaxShield())
      this.shield = Math.min(this.getMaxShield(), this.shield + (0.02 + this.upgrades.autoRepair) * shieldRegen * 60);

    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.invincible > 0) this.invincible--;
    if (this.specialCooldown > 0) this.specialCooldown--;
    if (this.multiplierTimer > 0) { this.multiplierTimer--; if (this.multiplierTimer <= 0) this.multiplier = 1; }
  }

  /* ── Getter ── */
  getMaxShield() {
    return this.maxShield * (1 + this.upgrades.shieldMult) * (this.faction === 'federation' ? 1.3 : 1);
  }

  getFireRate() {
    const wMod = 0.5 + (this.energy.weapons / 100);
    return (1 + this.upgrades.fireRateMult) * wMod * this.ship.fireRate;
  }

  getDmg() {
    const base = WEAPONS[this.weapon].dmg;
    const crit = Math.random() < this.upgrades.critChance ? 2 : 1;
    return base * (1 + this.upgrades.dmgMult) * (this.faction === 'rebels' ? 1.3 : 1) * crit;
  }

  getCollectRadius() { return 30 * (1 + this.upgrades.collectRadius); }

  /* ── Schießen ── */
  wantsToShoot(inp) {
    if (!this.alive || this.shootCooldown > 0 || !inp.shoot) return false;
    this.shootCooldown = Math.max(3, Math.floor(WEAPONS[this.weapon].cooldown / this.getFireRate()));
    return true;
  }

  /* ── Treffer ── */
  hit(dmg) {
    if (this.invincible > 0 || !this.alive) return false;
    dmg *= (1 - this.upgrades.resistance);
    if (this.shield > 0) {
      const abs = Math.min(this.shield, dmg);
      this.shield -= abs; dmg -= abs;
    }
    if (dmg > 0) {
      this.hp -= dmg;
      if (this.hp <= 0) {
        if (this.upgrades.emergencyShield) {
          this.hp = 1; this.shield = this.getMaxShield() * 0.5;
          this.upgrades.emergencyShield = false;
          this.invincible = 120;
          return true;
        }
        this.die();
        return true;
      }
    }
    this.invincible = 60;
    return true;
  }

  die() { this.alive = false; this.respawnTimer = 300; }

  /* ── Zeichnen ── */
  draw(ctx, renderer, fc) {
    if (!this.alive) return;
    if (this.invincible > 0 && Math.floor(fc / 4) % 2 === 0) return;

    renderer.drawTrail(this.isP2 ? 'p2' : 'p1', this.x, this.y + 20, this.color.glow, 10);

    ctx.save();
    ctx.translate(this.x, this.y);

    // Barrel-Roll-Animation
    if (this.barrelRoll > 0) ctx.scale(Math.cos((1 - this.barrelRoll / 20) * Math.PI * 2), 1);
    ctx.rotate(-this.vx * 0.03);

    const c = this.color;

    // Triebwerk-Flamme
    const fh = this.boosting ? 28 + Math.random() * 14 : 14 + Math.random() * 8;
    const fg = ctx.createLinearGradient(0, 22, 0, 22 + fh);
    fg.addColorStop(0, this.boosting ? '#fff' : c.flame);
    fg.addColorStop(0.35, '#f80');
    fg.addColorStop(1, 'transparent');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(-9, 22); ctx.lineTo(9, 22); ctx.lineTo(Math.random() * 6 - 3, 22 + fh);
    ctx.closePath(); ctx.fill();

    // Rumpf (je nach Schiffstyp)
    ctx.fillStyle = this.hp > 1 ? c.hull : '#c44';
    ctx.beginPath();
    if (this.shipType === 'fighter') {
      ctx.moveTo(0, -28); ctx.lineTo(-14, 24); ctx.lineTo(-6, 18);
      ctx.lineTo(0, 24); ctx.lineTo(6, 18); ctx.lineTo(14, 24);
    } else if (this.shipType === 'bomber') {
      ctx.moveTo(0, -22); ctx.lineTo(-24, 24); ctx.lineTo(-10, 20);
      ctx.lineTo(0, 26); ctx.lineTo(10, 20); ctx.lineTo(24, 24);
    } else {
      ctx.moveTo(0, -26); ctx.lineTo(-20, 26); ctx.lineTo(-8, 19);
      ctx.lineTo(0, 26); ctx.lineTo(8, 19); ctx.lineTo(20, 26);
    }
    ctx.closePath(); ctx.fill();

    // Flügel
    ctx.fillStyle = this.boosting ? '#fa0' : c.wing;
    ctx.beginPath(); ctx.moveTo(-20, 26); ctx.lineTo(-32, 14); ctx.lineTo(-22, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, 26); ctx.lineTo(32, 14); ctx.lineTo(22, 4); ctx.closePath(); ctx.fill();

    // Cockpit
    ctx.fillStyle = c.cockpit;
    ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI * 2); ctx.fill();

    // Glow-Outline
    ctx.shadowColor = this.boosting ? '#f80' : c.glow;
    ctx.shadowBlur = this.boosting ? 22 : 14;
    ctx.strokeStyle = ctx.shadowColor; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-20, 26); ctx.lineTo(20, 26);
    ctx.closePath(); ctx.stroke(); ctx.shadowBlur = 0;

    // Schildblase
    if (this.shield > 0) {
      const sa = (this.shield / this.getMaxShield()) * 0.28 + 0.05;
      ctx.strokeStyle = `rgba(0,220,255,${sa})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#0cf'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 34, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
