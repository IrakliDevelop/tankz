/**
 * All game audio, synthesized live with the Web Audio API — no sound files.
 *
 * Why synthesize instead of loading .mp3s? For an offline PoC it's ideal: zero
 * assets to ship, nothing to license, and it stays tiny. Every sound here is
 * just oscillators (tones) and noise shaped by gain "envelopes" (a quick
 * volume rise then fall), which is the essence of retro sound design.
 *
 * Browser rule: an AudioContext starts "suspended" and can only make sound
 * after a user gesture (click/keypress). We listen for the first one and
 * resume + start the engine loop then.
 */
export class AudioManager {
  constructor() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();

    // Master volume for everything.
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    this.started = false;
    this.engineIntensity = 0;  // smoothed 0 (idle) .. 1 (driving)

    // Unlock on the first interaction, then never again.
    const unlock = () => this.#start();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  /** A short buffer of white noise — reused for the firing/impact sounds. */
  #noiseBuffer(seconds = 0.4) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Resume the context and spin up the continuous engine loop (once). */
  #start() {
    if (this.started) return;
    this.started = true;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // Two slightly detuned sawtooth oscillators through a lowpass filter give
    // a fat, muffled diesel rumble. They run forever; we just ride the volume
    // and pitch to make the tank sound alive.
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineGain.connect(this.master);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 420;
    this.engineFilter.connect(this.engineGain);

    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.value = 42;
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sawtooth';
    this.osc2.frequency.value = 49;   // detuned for beating/thickness
    this.osc1.connect(this.engineFilter);
    this.osc2.connect(this.engineFilter);
    this.osc1.start();
    this.osc2.start();
  }

  /** Called each frame: 0 = stopped, 1 = driving. Smoothed for a natural rev. */
  setEngineIntensity(target) {
    this.engineIntensity = target;
  }

  update() {
    if (!this.started) return;
    const t = this.engineIntensity;

    // Idle is quiet and low-pitched; driving is louder and higher. We don't
    // smooth by hand — setTargetAtTime glides each parameter toward its target
    // over the given time constant, which is what gives the natural rev.
    const now = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0.05 + t * 0.11, now, 0.08);
    this.osc1.frequency.setTargetAtTime(42 + t * 34, now, 0.12);
    this.osc2.frequency.setTargetAtTime(49 + t * 38, now, 0.12);
    this.engineFilter.frequency.setTargetAtTime(380 + t * 520, now, 0.12);
  }

  /** Firing: a low sine that dives in pitch + a noise "crack". A punchy thoomp. */
  fire() {
    if (!this.started) return;
    const now = this.ctx.currentTime;

    // Body: sine dropping 220 -> 40 Hz.
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.9, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(oscGain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.24);

    // Crack: a burst of noise through a lowpass, very fast decay.
    this.#noiseHit(now, { cutoff: 1800, type: 'lowpass', gain: 0.7, decay: 0.12 });
  }

  /** Impact on a target: a brighter, metallic ping. */
  hit() {
    if (!this.started) return;
    const now = this.ctx.currentTime;

    // Metallic ring: a couple of high sines.
    for (const [f, g] of [[900, 0.25], [1350, 0.16]]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.6, now + 0.15);
      const og = this.ctx.createGain();
      og.gain.setValueAtTime(g, now);
      og.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(og).connect(this.master);
      osc.start(now);
      osc.stop(now + 0.2);
    }
    // Plus a bandpassed noise clank.
    this.#noiseHit(now, { cutoff: 2600, type: 'bandpass', gain: 0.5, decay: 0.14 });
  }

  /** Shared helper: a filtered noise burst with an exponential decay. */
  #noiseHit(now, { cutoff, type, gain, decay }) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.#noiseBuffer(decay + 0.05);
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + decay);
    src.connect(filter).connect(g).connect(this.master);
    src.start(now);
    src.stop(now + decay + 0.05);
  }
}
