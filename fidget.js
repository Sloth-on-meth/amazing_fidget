/* ─── STATE ─── */
const state = {
  toggleOn: false,
  clicks: 0,
  unlocked: { 2: false, 3: false, 4: false },
};

const UNLOCK_THRESHOLDS = { 2: 10, 3: 50, 4: 100 };

/* ─── ELEMENTS ─── */
const track     = document.getElementById('toggleTrack');
const thumb     = document.getElementById('toggleThumb');
const counter   = document.getElementById('clickCount');

/* ─── AUDIO ENGINE ─── */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

function playToggleOn() {
  const c = getCtx();
  const t = c.currentTime;

  // Mechanical thunk - low body
  const body = c.createOscillator();
  const bodyGain = c.createGain();
  body.type = 'sine';
  body.frequency.setValueAtTime(180, t);
  body.frequency.exponentialRampToValueAtTime(60, t + 0.08);
  bodyGain.gain.setValueAtTime(0.55, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  body.connect(bodyGain);
  bodyGain.connect(c.destination);
  body.start(t);
  body.stop(t + 0.13);

  // Click transient - sharp attack
  const click = c.createOscillator();
  const clickGain = c.createGain();
  click.type = 'square';
  click.frequency.setValueAtTime(2400, t);
  click.frequency.exponentialRampToValueAtTime(400, t + 0.02);
  clickGain.gain.setValueAtTime(0.25, t);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
  click.connect(clickGain);
  clickGain.connect(c.destination);
  click.start(t);
  click.stop(t + 0.03);

  // Subtle plastic resonance
  const res = c.createOscillator();
  const resGain = c.createGain();
  res.type = 'triangle';
  res.frequency.setValueAtTime(1200, t + 0.015);
  res.frequency.exponentialRampToValueAtTime(800, t + 0.08);
  resGain.gain.setValueAtTime(0.1, t + 0.015);
  resGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  res.connect(resGain);
  resGain.connect(c.destination);
  res.start(t + 0.015);
  res.stop(t + 0.1);
}

function playToggleOff() {
  const c = getCtx();
  const t = c.currentTime;

  // Off click - slightly duller, lower
  const body = c.createOscillator();
  const bodyGain = c.createGain();
  body.type = 'sine';
  body.frequency.setValueAtTime(140, t);
  body.frequency.exponentialRampToValueAtTime(45, t + 0.1);
  bodyGain.gain.setValueAtTime(0.5, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  body.connect(bodyGain);
  bodyGain.connect(c.destination);
  body.start(t);
  body.stop(t + 0.15);

  const click = c.createOscillator();
  const clickGain = c.createGain();
  click.type = 'square';
  click.frequency.setValueAtTime(1800, t);
  click.frequency.exponentialRampToValueAtTime(300, t + 0.02);
  clickGain.gain.setValueAtTime(0.2, t);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
  click.connect(clickGain);
  clickGain.connect(c.destination);
  click.start(t);
  click.stop(t + 0.03);
}

function playUnlock() {
  const c = getCtx();
  const t = c.currentTime;
  [0, 0.12, 0.24].forEach((offset, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = [440, 554, 660][i];
    gain.gain.setValueAtTime(0.3, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.3);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t + offset);
    osc.stop(t + offset + 0.3);
  });
}

/* ─── HAPTICS ─── */
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/* ─── TOGGLE LOGIC ─── */
function doToggle() {
  state.toggleOn = !state.toggleOn;
  state.clicks++;

  // visual
  track.classList.toggle('is-on', state.toggleOn);

  // press squish animation
  thumb.classList.remove('pressing');
  void thumb.offsetWidth; // force reflow to restart animation
  thumb.classList.add('pressing');

  // sound
  if (state.toggleOn) playToggleOn();
  else                playToggleOff();

  // haptics
  vibrate(state.toggleOn ? [8, 0, 4] : [6]);

  // counter
  counter.textContent = `clicks: ${state.clicks}`;
  counter.style.color = state.toggleOn ? '#3a8a3a' : '#444';

  // check unlocks
  checkUnlocks();
}

/* ─── UNLOCKS ─── */
function checkUnlocks() {
  for (const [slot, threshold] of Object.entries(UNLOCK_THRESHOLDS)) {
    if (!state.unlocked[slot] && state.clicks >= threshold) {
      state.unlocked[slot] = true;
      unlockCard(Number(slot));
    }
  }
}

function unlockCard(slot) {
  const card = document.getElementById(`card-${slot}`);
  if (!card) return;

  card.classList.remove('locked');
  card.classList.add('unlocking');
  playUnlock();
  vibrate([20, 30, 20, 30, 60]);

  card.innerHTML = `
    <div class="card-label">COMING SOON</div>
    <div style="font-size:2rem;filter:grayscale(0.3)">✨</div>
    <div style="font-size:0.6rem;letter-spacing:0.2em;color:#555;text-transform:uppercase">unlocked at ${UNLOCK_THRESHOLDS[slot]} clicks</div>
  `;

  setTimeout(() => card.classList.remove('unlocking'), 800);
}

/* ─── EVENT BINDING ─── */
// touch — prevent double-fire on mobile (touchstart fires before click)
let touchFired = false;
track.addEventListener('touchstart', e => {
  e.preventDefault();
  touchFired = true;
  doToggle();
}, { passive: false });

track.addEventListener('click', () => {
  if (touchFired) { touchFired = false; return; }
  doToggle();
});

// keyboard: space / enter when focused
track.setAttribute('tabindex', '0');
track.setAttribute('role', 'switch');
track.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doToggle(); }
});
