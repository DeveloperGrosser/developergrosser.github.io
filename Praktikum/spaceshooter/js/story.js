// story.js – Fraktionswahl, Story-Dialoge, Skins, Entscheidungen

import { FACTIONS, SHIPS, COLORS } from './config.js';

export class StoryManager {
  constructor() {
    this.dialogQueue = [];
    this.currentDialog = null;
    this.faction = null;
    this.decisions = [];
    this.achievements = new Set();
    this.unlockedSkins = new Set(['cyan']); // Standard immer freigeschaltet
  }

  /** Events, die Dialoge auslösen, an bestimmten Wellen */
  checkWaveTriggers(wave) {
    const triggers = {
      1:  { speaker: 'Kommando', text: 'Piloten, macht euch bereit! Feindliche Kontakte voraus.' },
      5:  { speaker: 'Kommando', text: 'Gute Arbeit! Drei Fraktionen bieten dir ihre Unterstützung an.', chooseFaction: true },
      10: { speaker: 'Warnung', text: '⚠ Großkampfschiff im Anflug! Zerstöre seine Komponenten!' },
      15: { speaker: 'Kommando', text: 'Du hast es weit geschafft. Eine schwere Entscheidung steht bevor.', choice: 'route' },
      20: { speaker: 'Warnung', text: '⚠ Feindliche Armada! Endkampf naht!' },
      25: { speaker: 'Kommando', text: 'Dies ist die letzte Schlacht. Zeige, wofür du stehst!', choice: 'finale' },
    };
    if (triggers[wave]) this.dialogQueue.push(triggers[wave]);
  }

  /** Boss-Dialog vor dem Kampf */
  addBossDialog(wave) {
    this.dialogQueue.push({
      speaker: 'Sensoren',
      text: `Feindliches Großkampfschiff in Sektor ${wave}! Schildgenerator zuerst angreifen!`,
    });
  }

  /** Nächsten Dialog holen */
  nextDialog() {
    this.currentDialog = this.dialogQueue.shift() || null;
    return this.currentDialog;
  }

  /** Fraktion wählen */
  chooseFaction(key) {
    this.faction = key;
    this.decisions.push({ wave: 5, choice: key });
  }

  /** Achievement */
  unlock(key) {
    if (this.achievements.has(key)) return;
    this.achievements.add(key);
    // Skins bei bestimmten Achievements
    const skinRewards = {
      'score_1000': 'red', 'score_5000': 'gold',
      'boss_killed': 'purple', 'wave_25': 'white',
    };
    if (skinRewards[key]) this.unlockedSkins.add(skinRewards[key]);
  }

  /** Prüfen ob Skin verfügbar */
  isSkinUnlocked(color) { return this.unlockedSkins.has(color); }

  /** Dialog-Box zeichnen */
  drawDialog(ctx, W, H) {
    if (!this.currentDialog) return;
    const d = this.currentDialog;
    const bh = 80;
    const by = H - bh - 20;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(40, by, W - 80, bh);
    ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
    ctx.strokeRect(40, by, W - 80, bh);

    ctx.fillStyle = '#0ff'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(d.speaker, 60, by + 22);
    ctx.fillStyle = '#ddd'; ctx.font = '13px Courier New';
    ctx.fillText(d.text, 60, by + 46);
    ctx.fillStyle = '#888'; ctx.font = '11px Courier New';
    ctx.fillText('[ENTER] Weiter', 60, by + 66);
    ctx.textAlign = 'center';
  }
}
