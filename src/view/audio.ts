import type { SimState } from '../core/sim';
import type { GamePhase } from '../core/types';

type SfxKey = 'fire' | 'explosion' | 'pickup' | 'ui' | 'success';

const AUDIO_ENABLED_KEY = 'tankz.audio.enabled';
const MUSIC_URL = '/audio/empty-city.ogg';
const MUSIC_VOLUME = 0.16;
const SFX_VOLUME = 0.68;

const SFX_URLS: Record<SfxKey, string> = {
  fire: '/audio/fire.mp3',
  explosion: '/audio/explosion.mp3',
  pickup: '/audio/pickup.mp3',
  ui: '/audio/ui.mp3',
  success: '/audio/success.mp3',
};

/**
 * Translates newly observed simulation entities and phase changes into audio.
 * Audio remains a read-only view concern and never feeds state back into the sim.
 */
export class AudioManager {
  private readonly button: HTMLButtonElement;
  private readonly music = createAudio(MUSIC_URL);
  private readonly sfx = new Map<SfxKey, HTMLAudioElement>();
  private readonly voices = new Set<HTMLAudioElement>();
  private knownShellIds: Set<number>;
  private knownEffectIds: Set<number>;
  private previousPhase: GamePhase;
  private enabled = readEnabledSetting();
  private unlocked = false;

  constructor(state: SimState) {
    this.button = requiredButton('audio-toggle');
    this.music.loop = true;
    this.music.volume = MUSIC_VOLUME;
    for (const [key, url] of Object.entries(SFX_URLS) as Array<[SfxKey, string]>) {
      this.sfx.set(key, createAudio(url));
    }

    this.knownShellIds = new Set(state.shells.map(({ id }) => id));
    this.knownEffectIds = new Set(state.effects.map(({ id }) => id));
    this.previousPhase = state.phase;
    this.button.addEventListener('click', () => this.toggle());
    document.addEventListener('visibilitychange', () => this.syncMusic());
    this.renderButton();
  }

  /** Must be called from a keyboard or pointer gesture to satisfy browser autoplay rules. */
  async unlock(): Promise<void> {
    if (this.unlocked) return;
    this.unlocked = true;
    this.renderButton();
    await this.syncMusic();
  }

  toggle(): void {
    this.enabled = !this.enabled;
    writeEnabledSetting(this.enabled);
    this.renderButton();
    if (this.enabled) {
      void this.unlock().then(() => this.syncMusic());
      this.play('ui', 0.55);
    } else {
      this.music.pause();
      for (const voice of this.voices) voice.pause();
      this.voices.clear();
    }
  }

  update(state: SimState): void {
    const nextShellIds = new Set<number>();
    let playerFired = false;
    let enemyFired = false;
    for (const shell of state.shells) {
      nextShellIds.add(shell.id);
      if (this.knownShellIds.has(shell.id)) continue;
      if (shell.team === 'player') playerFired = true;
      else enemyFired = true;
    }
    this.knownShellIds = nextShellIds;

    const nextEffectIds = new Set<number>();
    let explosionCount = 0;
    let collectedPickup = false;
    for (const effect of state.effects) {
      nextEffectIds.add(effect.id);
      if (this.knownEffectIds.has(effect.id)) continue;
      if (effect.kind === 'explosion') explosionCount += 1;
      if (effect.kind === 'repair' || effect.kind === 'shield' || effect.kind === 'overdrive') {
        collectedPickup = true;
      }
    }
    this.knownEffectIds = nextEffectIds;

    if (playerFired) this.play('fire', 0.9);
    if (enemyFired) this.play('fire', 0.34);
    if (explosionCount > 0) this.play('explosion', Math.min(1, 0.72 + explosionCount * 0.08));
    if (collectedPickup) this.play('pickup', 0.62);

    if (state.phase !== this.previousPhase) {
      if (state.phase === 'upgrade') this.play('success', 0.52);
      else if (state.phase === 'victory') this.play('success', 0.9);
      else if (state.phase === 'gameOver') this.play('explosion', 1);
      else if (this.previousPhase === 'upgrade' || this.previousPhase === 'gameOver') {
        this.play('ui', 0.5);
      }
      this.previousPhase = state.phase;
    }
  }

  private play(key: SfxKey, gain: number): void {
    if (!this.enabled || !this.unlocked || document.hidden) return;
    const template = this.sfx.get(key);
    if (!template) return;

    const voice = template.cloneNode(true) as HTMLAudioElement;
    voice.volume = Math.max(0, Math.min(1, SFX_VOLUME * gain));
    this.voices.add(voice);
    const release = () => this.voices.delete(voice);
    voice.addEventListener('ended', release, { once: true });
    voice.addEventListener('error', release, { once: true });
    void voice.play().catch(release);
  }

  private async syncMusic(): Promise<void> {
    if (!this.enabled || !this.unlocked || document.hidden) {
      this.music.pause();
      return;
    }
    await this.music.play().catch(() => undefined);
  }

  private renderButton(): void {
    this.button.textContent = this.enabled ? 'SOUND ON · M' : 'SOUND OFF · M';
    this.button.classList.toggle('active', this.enabled);
    this.button.setAttribute('aria-pressed', String(this.enabled));
  }
}

function createAudio(url: string): HTMLAudioElement {
  const audio = new Audio(url);
  audio.preload = 'auto';
  return audio;
}

function requiredButton(id: string): HTMLButtonElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error('Missing audio button #' + id);
  }
  return element;
}

function readEnabledSetting(): boolean {
  try {
    return localStorage.getItem(AUDIO_ENABLED_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeEnabledSetting(enabled: boolean): void {
  try {
    localStorage.setItem(AUDIO_ENABLED_KEY, String(enabled));
  } catch {
    // Audio still works when storage is unavailable; only persistence is lost.
  }
}
