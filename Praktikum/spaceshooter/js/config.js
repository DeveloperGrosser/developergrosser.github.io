// config.js – Spielkonstanten, Schiffstypen, Waffen, Fraktionen, Farben, Tech-Tree

export const W = 800;
export const H = 600;

/* ── Schiffstypen ── */
export const SHIPS = {
  fighter: {
    name: 'Jäger', desc: 'Schnell & wendig, schwache Hülle',
    speed: 1.3, accel: 1.3, fireRate: 1.25,
    maxHp: 2, maxShield: 30, special: 'afterburner', shape: 'slim',
  },
  bomber: {
    name: 'Bomber', desc: 'Langsam & stark, extra Panzerung',
    speed: 0.75, accel: 0.8, fireRate: 0.7,
    maxHp: 5, maxShield: 60, special: 'bomb', shape: 'wide',
  },
  allrounder: {
    name: 'Allrounder', desc: 'Ausgewogen in allen Bereichen',
    speed: 1.0, accel: 1.0, fireRate: 1.0,
    maxHp: 3, maxShield: 40, special: 'emp', shape: 'standard',
  },
};

/* ── Farbschemata ── */
export const COLORS = {
  cyan:   { hull: '#0cf', cockpit: '#0ff', glow: '#0ff', flame: '#ff0', wing: '#08a' },
  red:    { hull: '#f44', cockpit: '#f88', glow: '#f44', flame: '#fa0', wing: '#a22' },
  green:  { hull: '#4f4', cockpit: '#8f8', glow: '#4f4', flame: '#ff0', wing: '#2a2' },
  gold:   { hull: '#fa0', cockpit: '#ff4', glow: '#fa0', flame: '#f80', wing: '#a80' },
  purple: { hull: '#c4f', cockpit: '#d8f', glow: '#c4f', flame: '#f4f', wing: '#82a' },
  white:  { hull: '#ddd', cockpit: '#fff', glow: '#fff', flame: '#ff0', wing: '#999' },
};

/* ── Fraktionen ── */
export const FACTIONS = {
  federation: {
    name: 'Föderation', desc: 'Defensiv: +30 % Schildstärke', color: '#48f',
    shieldBonus: 0.3, dmgBonus: 0, shopDiscount: 0,
  },
  rebels: {
    name: 'Rebellen', desc: 'Offensiv: +30 % Waffenschaden', color: '#f44',
    shieldBonus: 0, dmgBonus: 0.3, shopDiscount: 0,
  },
  traders: {
    name: 'Freihandel', desc: '-25 % Shoppreise, bessere Drops', color: '#fa0',
    shieldBonus: 0, dmgBonus: 0, shopDiscount: 0.25,
  },
};

/* ── Waffentypen ── */
export const WEAPONS = {
  laser:  { name: 'Laser',       cooldown: 8,  dmg: 1,   speed: 14, desc: 'Schneller Einzelschuss' },
  spread: { name: 'Spread-Shot', cooldown: 14, dmg: 0.8, speed: 12, desc: '3 Kugeln fächerförmig' },
  plasma: { name: 'Plasma',      cooldown: 28, dmg: 3,   speed: 7,  desc: 'Langsam, durchschlagend' },
  rocket: { name: 'Raketen',     cooldown: 45, dmg: 5,   speed: 5,  desc: 'Zielverfolgend' },
};

/* ── Gegnertypen ── */
export const ENEMIES = {
  standard: { w: 30, h: 30, speed: 1,    hp: 1, pts: 10, col: '#f55', shootRate: 0 },
  fast:     { w: 22, h: 22, speed: 2.5,  hp: 1, pts: 20, col: '#f0f', shootRate: 0 },
  tank:     { w: 40, h: 40, speed: 0.6,  hp: 3, pts: 30, col: '#fa0', shootRate: 150 },
  sniper:   { w: 28, h: 28, speed: 0.75, hp: 2, pts: 25, col: '#0f8', shootRate: 100 },
};

/* ── Tech-Tree (3 Pfade × 5 Stufen) ── */
export const TECH_TREE = {
  offense: [
    { name: 'Schaden +10 %',       cost: 50,  effect: { dmgMult: 0.1 } },
    { name: 'Feuerrate +15 %',     cost: 100, effect: { fireRateMult: 0.15 } },
    { name: 'Doppelschuss',        cost: 200, effect: { doubleShot: true } },
    { name: 'Schaden +20 %',       cost: 350, effect: { dmgMult: 0.2 } },
    { name: 'Kritischer Treffer',  cost: 500, effect: { critChance: 0.15 } },
  ],
  defense: [
    { name: 'Schild +20 %',           cost: 50,  effect: { shieldMult: 0.2 } },
    { name: 'Auto-Reparatur',         cost: 100, effect: { autoRepair: 0.002 } },
    { name: 'Panzerung +1 HP',        cost: 200, effect: { hpBonus: 1 } },
    { name: 'Resistenz 10 %',         cost: 350, effect: { resistance: 0.1 } },
    { name: 'Notfall-Schild',         cost: 500, effect: { emergencyShield: true } },
  ],
  utility: [
    { name: 'Speed +15 %',            cost: 50,  effect: { speedMult: 0.15 } },
    { name: 'Boost-Kapazität +30 %',  cost: 100, effect: { boostMult: 0.3 } },
    { name: 'Sammelradius +50 %',     cost: 200, effect: { collectRadius: 0.5 } },
    { name: 'Drop-Rate +25 %',        cost: 350, effect: { dropRate: 0.25 } },
    { name: 'Drohnen-Slot',           cost: 500, effect: { droneSlot: true } },
  ],
};

export const POWERUP_TYPES = ['weapon', 'shield', 'energy', 'multiplier', 'credits'];

/* ── Events ── */
export const EVENTS = {
  asteroids: { name: 'Asteroidensturm!',  duration: 600, minWave: 3 },
  pirates:   { name: 'Piratenhinterhalt!', duration: 480, minWave: 5 },
  wreck:     { name: 'Wrack entdeckt!',    duration: 300, minWave: 4 },
  blackhole: { name: 'Schwarzes Loch!',    duration: 480, minWave: 8 },
};
