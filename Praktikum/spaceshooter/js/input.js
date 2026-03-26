// input.js – Tastatureingabe mit Double-Tap-Erkennung für Barrel Roll

export class Input {
  constructor() {
    this.keys = {};
    this.prev = {};
    this.justPressed = {};
    this.doubleTapped = {};
    this._lastTap = {};

    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
        e.preventDefault();
    });

    document.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      const now = performance.now();
      if (this._lastTap[e.code] && now - this._lastTap[e.code] < 250)
        this.doubleTapped[e.code] = true;
      this._lastTap[e.code] = now;
    });
  }

  update() {
    for (const k in this.keys)
      this.justPressed[k] = this.keys[k] && !this.prev[k];
    this.prev = { ...this.keys };
  }

  afterUpdate() { this.doubleTapped = {}; }

  down(c)    { return !!this.keys[c]; }
  just(c)    { return !!this.justPressed[c]; }
  dblTap(c)  { return !!this.doubleTapped[c]; }

  /** Spieler 1: Pfeiltasten + Space + Shift */
  getP1() {
    return {
      left: this.down('ArrowLeft'),   right: this.down('ArrowRight'),
      up:   this.down('ArrowUp'),     down:  this.down('ArrowDown'),
      shoot: this.down('Space'),
      boost: this.down('ShiftLeft') || this.down('ShiftRight'),
      barrelL: this.dblTap('ArrowLeft'), barrelR: this.dblTap('ArrowRight'),
      energy1: this.just('Digit1'), energy2: this.just('Digit2'), energy3: this.just('Digit3'),
      special: this.just('KeyE'),
    };
  }

  /** Spieler 2: WASD + Q + Tab */
  getP2() {
    return {
      left: this.down('KeyA'),  right: this.down('KeyD'),
      up:   this.down('KeyW'),  down:  this.down('KeyS'),
      shoot: this.down('KeyQ'),
      boost: this.down('Tab'),
      barrelL: this.dblTap('KeyA'), barrelR: this.dblTap('KeyD'),
      energy1: this.just('KeyZ'), energy2: this.just('KeyX'), energy3: this.just('KeyC'),
      special: this.just('KeyF'),
    };
  }
}
