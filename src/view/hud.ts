import { ARENA_TEMPLATES } from '../core/arena';
import { WAVE } from '../core/config';
import { UPGRADE_INFO, type UpgradeKind } from '../core/player';
import type { SimState } from '../core/sim';

export class Hud {
  private readonly armorValue = required('armor-value');
  private readonly armorFill = required('armor-fill');
  private readonly shieldValue = required('shield-value');
  private readonly shieldFill = required('shield-fill');
  private readonly powerupLabel = required('powerup-label');
  private readonly arenaLabel = required('arena-label');
  private readonly waveLabel = required('wave-label');
  private readonly threatLabel = required('threat-label');
  private readonly scrapLabel = required('scrap-label');
  private readonly scoreLabel = required('score-label');
  private readonly loadoutLabel = required('loadout-label');
  private readonly reloadFill = required('reload-fill');
  private readonly crosshair = required('crosshair');
  private readonly bossPanel = required('boss-panel');
  private readonly bossFill = required('boss-fill');
  private readonly upgradePanel = required('upgrade-panel');
  private readonly upgradeButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.upgrade-choice'),
  );
  private readonly endPanel = required('end-panel');
  private readonly endEyebrow = required('end-eyebrow');
  private readonly endTitle = required('end-title');
  private readonly endSummary = required('end-summary');

  setPointer(x: number, y: number): void {
    this.crosshair.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -50%)';
  }

  update(state: SimState): void {
    const player = state.players[0];
    const armorRatio = Math.max(0, player.hp / player.maxHp);
    const shieldRatio = Math.max(0, player.shield / player.maxShield);
    this.armorValue.textContent = Math.ceil(player.hp) + ' / ' + player.maxHp;
    this.armorFill.style.width = armorRatio * 100 + '%';
    this.shieldValue.textContent = Math.ceil(player.shield) + ' / ' + player.maxShield;
    this.shieldFill.style.width = shieldRatio * 100 + '%';
    this.powerupLabel.textContent =
      player.overdriveRemaining > 0
        ? 'OVERDRIVE  ' + player.overdriveRemaining.toFixed(1) + 's'
        : 'NO ACTIVE BOOST';
    this.powerupLabel.classList.toggle('active', player.overdriveRemaining > 0);

    const arena = ARENA_TEMPLATES.find((template) => template.id === state.arenaId);
    this.arenaLabel.textContent =
      'THE SPRAWL // ' + (arena?.name.toUpperCase() ?? state.arenaId.toUpperCase());
    this.waveLabel.textContent = 'WAVE ' + state.wave + ' / ' + WAVE.maxWaves;
    this.threatLabel.textContent =
      state.phase === 'combat'
        ? state.enemies.length + (state.enemies.length === 1 ? ' HOSTILE' : ' HOSTILES')
        : state.phase === 'upgrade'
          ? 'AREA SECURED'
          : 'RUN ENDED';
    this.scrapLabel.textContent = 'SALVAGE  ' + state.salvage;
    this.scoreLabel.textContent = 'SCORE  ' + state.score.toString().padStart(5, '0');

    const loadout = Object.entries(player.upgrades)
      .filter(([, count]) => count > 0)
      .map(([kind, count]) => {
        const name = UPGRADE_INFO[kind as UpgradeKind].name;
        return count > 1 ? name + ' x' + count : name;
      });
    this.loadoutLabel.textContent = loadout.length > 0 ? loadout.join('  /  ') : 'STOCK SCRAPPER';

    const reloadRatio = 1 - player.cooldown / player.fireCooldown;
    this.reloadFill.style.width = Math.max(0, Math.min(1, reloadRatio)) * 100 + '%';
    this.crosshair.classList.toggle('ready', player.cooldown <= 0 && state.phase === 'combat');

    const boss = state.enemies.find((enemy) => enemy.kind === 'boss');
    this.bossPanel.hidden = !boss;
    if (boss) {
      this.bossFill.style.width = Math.max(0, boss.hp / boss.maxHp) * 100 + '%';
    }

    this.upgradePanel.hidden = state.phase !== 'upgrade';
    if (state.phase === 'upgrade') {
      for (let i = 0; i < this.upgradeButtons.length; i++) {
        const kind = state.upgradeChoices[i];
        const button = this.upgradeButtons[i];
        const key = button.querySelector<HTMLElement>('.choice-key');
        const name = button.querySelector<HTMLElement>('.choice-name');
        const description = button.querySelector<HTMLElement>('.choice-description');
        if (!kind || !key || !name || !description) continue;
        key.textContent = String(i + 1);
        name.textContent = UPGRADE_INFO[kind].name;
        description.textContent = UPGRADE_INFO[kind].description;
      }
    }

    const ended = state.phase === 'gameOver' || state.phase === 'victory';
    this.endPanel.hidden = !ended;
    if (ended) {
      const victory = state.phase === 'victory';
      this.endEyebrow.textContent = victory ? 'THE SPRAWL IS QUIET' : 'WRECK RECOVERED';
      this.endTitle.textContent = victory ? 'RUN COMPLETE' : 'TANK DESTROYED';
      this.endSummary.textContent =
        state.kills + ' KILLS  /  ' + state.salvage + ' SALVAGE  /  ' + state.score + ' SCORE';
    }
  }

  get choiceButtons(): readonly HTMLButtonElement[] {
    return this.upgradeButtons;
  }
}

function required(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error('Missing HUD element #' + id);
  return element;
}
