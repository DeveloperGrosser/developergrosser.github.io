// ============================================================
// INPUT SYSTEM — Keyboard handler with double-tap detection
// ============================================================

export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this._prevKeys = {};
    // Double-tap detection
    this._lastTapTime = {};
    this._doubleTaps = {};
    this.DOUBLE_TAP_WINDOW = 200; // ms

    this._onKeyDown = (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'KeyQ') e.preventDefault();
      // Double-tap detection
      const now = performance.now();
      if (this._lastTapTime[e.code] && now - this._lastTapTime[e.code] < this.DOUBLE_TAP_WINDOW) {
        this._doubleTaps[e.code] = true;
      }
      this._lastTapTime[e.code] = now;
    };

    this._onKeyUp = (e) => {
      this.keys[e.code] = false;
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  update() {
    // Calculate justPressed (true only on the frame the key was first pressed)
    for (const code in this.keys) {
      this.justPressed[code] = this.keys[code] && !this._prevKeys[code];
    }
    this._prevKeys = { ...this.keys };
  }

  afterUpdate() {
    // Clear double-taps after each frame
    this._doubleTaps = {};
  }

  isDoubleTap(code) {
    return !!this._doubleTaps[code];
  }

  // Player 1 bindings (Arrow keys + Space)
  getP1() {
    return {
      left: this.keys['ArrowLeft'],
      right: this.keys['ArrowRight'],
      up: this.keys['ArrowUp'],
      down: this.keys['ArrowDown'],
      shoot: this.keys['Space'],
      boost: this.keys['ShiftRight'] || this.keys['ShiftLeft'],
      barrelLeft: this.isDoubleTap('ArrowLeft'),
      barrelRight: this.isDoubleTap('ArrowRight'),
      energy1: this.justPressed['Digit1'],
      energy2: this.justPressed['Digit2'],
      energy3: this.justPressed['Digit3'],
    };
  }

  // Player 2 bindings (WASD + Q)
  getP2() {
    return {
      left: this.keys['KeyA'],
      right: this.keys['KeyD'],
      up: this.keys['KeyW'],
      down: this.keys['KeyS'],
      shoot: this.keys['KeyQ'],
      boost: this.keys['KeyE'],
      barrelLeft: this.isDoubleTap('KeyA'),
      barrelRight: this.isDoubleTap('KeyD'),
      energy1: this.justPressed['KeyZ'],
      energy2: this.justPressed['KeyX'],
      energy3: this.justPressed['KeyC'],
    };
  }
}
