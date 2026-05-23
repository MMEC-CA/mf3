// ── Sound Effects ──────────────────────────────────────────────────

const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : null;
let masterVolume = 0.5;

export function setMasterVolume(v) {
  masterVolume = Math.max(0, Math.min(1, v));
}

function playTone(freq, duration, type = 'square', vol = 0.1) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol * masterVolume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, vol = 0.05) {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol * masterVolume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
}

export function sfxFootstep() {
  playNoise(0.05, 0.02);
}

export function sfxGunshot() {
  playNoise(0.15, 0.3);
  playTone(80, 0.1, 'sawtooth', 0.2);
  setTimeout(() => playTone(40, 0.15, 'sine', 0.15), 50);
}

export function sfxTaser() {
  playTone(2000, 0.1, 'square', 0.05);
  playTone(2100, 0.1, 'square', 0.05);
  setTimeout(() => { playTone(2000, 0.1, 'square', 0.05); playTone(2100, 0.1, 'square', 0.05); }, 80);
}

export function sfxRadioBeep() {
  playTone(800, 0.08, 'sine', 0.08);
  setTimeout(() => playTone(1000, 0.05, 'sine', 0.06), 100);
}

export function sfxNotification() {
  playTone(600, 0.1, 'sine', 0.06);
  setTimeout(() => playTone(900, 0.15, 'sine', 0.06), 120);
}

export function sfxPurchase() {
  playTone(400, 0.05, 'triangle', 0.08);
  setTimeout(() => playTone(600, 0.08, 'triangle', 0.08), 60);
}

export function sfxDoorOpen() {
  playTone(200, 0.15, 'sine', 0.04);
  playNoise(0.1, 0.03);
}

export function sfxInteract() {
  playTone(500, 0.06, 'triangle', 0.05);
}

export function sfxAssignNew() {
  playTone(800, 0.1, 'sine', 0.08);
  setTimeout(() => playTone(1200, 0.12, 'sine', 0.08), 100);
}

// Ambient background — looping city hum
let ambientNode = null;
export function startAmbient() {
  if (!audioCtx || ambientNode) return;
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.02;
  }
  ambientNode = audioCtx.createBufferSource();
  ambientNode.buffer = buffer;
  ambientNode.loop = true;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.015 * masterVolume;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  ambientNode.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  ambientNode.start();
}

export function stopAmbient() {
  if (ambientNode) {
    try { ambientNode.stop(); } catch (e) { /* ignore */ }
    ambientNode = null;
  }
}
