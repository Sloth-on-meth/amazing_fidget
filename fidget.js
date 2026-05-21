/* ─── AUDIO ─── */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
function getCtx() {
  if (!actx) actx = new AudioCtx();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function vibe(ms) { if (navigator.vibrate) navigator.vibrate(ms); }

/* ─── TOGGLE ─── */
(function() {
  const card  = document.getElementById('card-toggle');
  const track = document.getElementById('toggleTrack');
  const thumb = document.getElementById('toggleThumb');
  const counter = document.getElementById('clickCount');
  let on = false, clicks = 0;

  const W = 180, TW = 66, PAD = 6;
  const MIN = PAD, MAX = W - TW - PAD;
  const TRAVEL = MAX - MIN;
  // detents at 1/4 and 3/4
  const DETENTS = [MIN + TRAVEL * 0.25, MIN + TRAVEL * 0.75];
  const MAG_R = 16; // magnetic radius px

  let dragging = false, startX = 0, startLeft = 0, moved = false;
  let prevRaw = null;

  function snapLeft() { return on ? MAX : MIN; }

  // Magnetic attraction: pulls visual position toward nearest detent within radius
  function magnetize(raw) {
    for (const d of DETENTS) {
      const dist = raw - d;
      if (Math.abs(dist) < MAG_R) {
        const pull = Math.pow(1 - Math.abs(dist) / MAG_R, 1.4);
        return raw - dist * pull * 0.88;
      }
    }
    return raw;
  }

  function playOn() {
    const c = getCtx(), t = c.currentTime;
    const b = c.createOscillator(), bg = c.createGain();
    b.type = 'sine'; b.frequency.setValueAtTime(110, t); b.frequency.exponentialRampToValueAtTime(48, t + 0.07);
    bg.gain.setValueAtTime(0.22, t); bg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    b.connect(bg); bg.connect(c.destination); b.start(t); b.stop(t + 0.11);
    const s = c.createOscillator(), sg = c.createGain();
    s.type = 'square'; s.frequency.setValueAtTime(700, t); s.frequency.exponentialRampToValueAtTime(200, t + 0.012);
    sg.gain.setValueAtTime(0.08, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    s.connect(sg); sg.connect(c.destination); s.start(t); s.stop(t + 0.016);
  }

  function playOff() {
    const c = getCtx(), t = c.currentTime;
    const b = c.createOscillator(), bg = c.createGain();
    b.type = 'sine'; b.frequency.setValueAtTime(85, t); b.frequency.exponentialRampToValueAtTime(36, t + 0.08);
    bg.gain.setValueAtTime(0.18, t); bg.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    b.connect(bg); bg.connect(c.destination); b.start(t); b.stop(t + 0.12);
    const s = c.createOscillator(), sg = c.createGain();
    s.type = 'square'; s.frequency.setValueAtTime(500, t); s.frequency.exponentialRampToValueAtTime(150, t + 0.012);
    sg.gain.setValueAtTime(0.06, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    s.connect(sg); sg.connect(c.destination); s.start(t); s.stop(t + 0.016);
  }

  function playDetent() {
    const c = getCtx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(130, t + 0.022);
    g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.03);
    vibe(4);
  }

  function commit(newOn) {
    if (newOn === on) return;
    on = newOn; clicks++;
    track.classList.toggle('is-on', on);
    card.classList.toggle('is-on', on);
    thumb.classList.remove('pressing'); void thumb.offsetWidth; thumb.classList.add('pressing');
    if (on) playOn(); else playOff();
    vibe(on ? [10, 0, 5] : [7]);
    counter.textContent = `clicks: ${clicks}`;
    counter.style.color = on ? '#3a8a3a' : '#444';
  }

  function handleMove(clientX) {
    const dx = clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    const raw = Math.max(MIN, Math.min(MAX, startLeft + dx));
    // fire detent sound when raw crosses a detent point
    if (prevRaw !== null) {
      for (const d of DETENTS) {
        if ((prevRaw < d && raw >= d) || (prevRaw > d && raw <= d)) playDetent();
      }
    }
    prevRaw = raw;
    thumb.style.left = magnetize(raw) + 'px';
  }

  function handleEnd(clientX) {
    if (!dragging) return; dragging = false;
    thumb.style.transition = ''; thumb.style.left = '';
    if (!moved) { commit(!on); return; }
    const raw = Math.max(MIN, Math.min(MAX, startLeft + (clientX - startX)));
    commit(magnetize(raw) > MIN + TRAVEL / 2);
  }

  thumb.addEventListener('mousedown', e => {
    e.preventDefault(); dragging = true; moved = false; prevRaw = null;
    startX = e.clientX; startLeft = snapLeft();
    thumb.style.transition = 'none';
  });
  window.addEventListener('mousemove', e => { if (dragging) handleMove(e.clientX); });
  window.addEventListener('mouseup', e => { if (dragging) handleEnd(e.clientX); });

  thumb.addEventListener('touchstart', e => {
    e.preventDefault(); dragging = true; moved = false; prevRaw = null;
    startX = e.touches[0].clientX; startLeft = snapLeft();
    thumb.style.transition = 'none';
  }, { passive: false });
  window.addEventListener('touchmove', e => { if (dragging) { e.preventDefault(); handleMove(e.touches[0].clientX); } }, { passive: false });
  window.addEventListener('touchend', e => { if (dragging) handleEnd(e.changedTouches[0].clientX); });

  track.addEventListener('click', e => {
    if (e.target === thumb || thumb.contains(e.target)) return;
    commit(!on);
  });
  track.setAttribute('tabindex', '0'); track.setAttribute('role', 'switch');
  track.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); commit(!on); } });
})();

/* ─── CLICKER ─── */
(function() {
  const btn = document.getElementById('clickerBtn');
  const display = document.getElementById('countDigit');
  let count = 0, pressing = false;

  function playClick(hard) {
    const c = getCtx(), t = c.currentTime;
    // Sharp attack layer
    const att = c.createOscillator(), attG = c.createGain();
    att.type = 'square';
    att.frequency.setValueAtTime(hard ? 1800 : 1200, t);
    att.frequency.exponentialRampToValueAtTime(hard ? 400 : 280, t + 0.018);
    attG.gain.setValueAtTime(hard ? 0.18 : 0.12, t);
    attG.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
    att.connect(attG); attG.connect(c.destination); att.start(t); att.stop(t + 0.025);
    // Body thump
    const body = c.createOscillator(), bodyG = c.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(hard ? 140 : 100, t);
    body.frequency.exponentialRampToValueAtTime(hard ? 55 : 40, t + 0.06);
    bodyG.gain.setValueAtTime(hard ? 0.3 : 0.2, t);
    bodyG.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    body.connect(bodyG); bodyG.connect(c.destination); body.start(t); body.stop(t + 0.1);
    // Subtle plastic resonance
    const res = c.createOscillator(), resG = c.createGain();
    res.type = 'triangle'; res.frequency.value = hard ? 600 : 420;
    resG.gain.setValueAtTime(0.04, t + 0.01); resG.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    res.connect(resG); resG.connect(c.destination); res.start(t + 0.01); res.stop(t + 0.07);
  }

  function playRelease() {
    const c = getCtx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.04);
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.06);
  }

  function press() {
    if (pressing) return; pressing = true;
    count++;
    btn.classList.add('pressed');
    playClick(count % 10 === 0);
    vibe(count % 10 === 0 ? [15, 0, 8] : 6);
    display.textContent = count;
    display.classList.remove('pop'); void display.offsetWidth; display.classList.add('pop');
  }
  function release() {
    if (!pressing) return; pressing = false;
    btn.classList.remove('pressed');
    playRelease();
  }

  btn.addEventListener('mousedown', e => { e.preventDefault(); press(); });
  window.addEventListener('mouseup', release);
  btn.addEventListener('touchstart', e => { e.preventDefault(); press(); }, { passive: false });
  window.addEventListener('touchend', release);
})();

/* ─── SQUEEZE BALL ─── */
(function() {
  const card  = document.getElementById('card-squeeze');
  const ball  = document.getElementById('squeezeBall');
  const shadow = document.getElementById('squeezeShadow');

  // Physics state
  let velX = 0, velY = 0;       // velocity of ball center
  let posX = 0, posY = 0;       // offset from resting position
  let scaleX = 1, scaleY = 1;
  let targetScaleX = 1, targetScaleY = 1;
  let pressing = false;

  // Pointer position relative to ball center (for directional deform)
  let pointerAngle = 0, pointerDist = 0;
  let pressure = 0; // 0..1, from stylus or mouse hold

  function playSquish(p) {
    const c = getCtx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(65 - p * 20, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.18);
    g.gain.setValueAtTime(0.1 + p * 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.25);
    const n = c.createOscillator(), ng = c.createGain();
    n.type = 'sawtooth'; n.frequency.setValueAtTime(1200, t); n.frequency.exponentialRampToValueAtTime(400, t + 0.08);
    ng.gain.setValueAtTime(0.02 + p * 0.02, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    n.connect(ng); ng.connect(c.destination); n.start(t); n.stop(t + 0.12);
  }

  function playRelease() {
    const c = getCtx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(55, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.06); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.2);
  }

  // Track pointer position over the ball for directional deform
  function updatePointer(clientX, clientY) {
    const r = ball.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = clientX - cx, dy = clientY - cy;
    pointerAngle = Math.atan2(dy, dx);
    pointerDist = Math.min(1, Math.sqrt(dx*dx + dy*dy) / (r.width * 0.6));
  }

  function physics() {
    const ease = 0.14, bounce = 0.55, friction = 0.78, gravity = 0.008;

    // Weight: ball settles with slight downward bias when not pressed
    if (!pressing) {
      posY += (4 - posY) * 0.03; // rest position slightly down
    }

    // Squish deformation: directional based on pointer angle when pressing
    if (pressing) {
      const squeeze = pressure * 0.35;
      const ax = Math.cos(pointerAngle), ay = Math.sin(pointerAngle);
      // Deform toward pointer: squish perpendicular, expand along pointer axis
      targetScaleX = 1 + Math.abs(ax) * squeeze * 0.5 - Math.abs(ay) * squeeze;
      targetScaleY = 1 + Math.abs(ay) * squeeze * 0.5 - Math.abs(ax) * squeeze;
    } else {
      targetScaleX = 1; targetScaleY = 1;
    }

    scaleX += (targetScaleX - scaleX) * ease;
    scaleY += (targetScaleY - scaleY) * ease;

    // Jiggle physics: spring back to rest
    const springX = -posX * 0.18, springY = -posY * 0.18;
    velX = (velX + springX) * friction;
    velY = (velY + springY + gravity) * friction;
    posX += velX; posY += velY;

    ball.style.transform = `translate(${posX}px, ${posY}px) scaleX(${scaleX}) scaleY(${scaleY})`;
    shadow.style.transform = `translateX(-50%) scaleX(${0.6 + (scaleX - 1) * 0.5}) scaleY(0.3)`;
    shadow.style.opacity = 0.35 + (pressing ? pressure * 0.2 : 0);

    requestAnimationFrame(physics);
  }
  physics();

  function press(clientX, clientY, p) {
    updatePointer(clientX, clientY);
    pressure = p;
    if (!pressing) {
      pressing = true;
      playSquish(p);
      vibe(Math.round(8 + p * 20));
      // Recoil: ball moves away from press direction
      velX -= Math.cos(pointerAngle) * 2 * p;
      velY -= Math.sin(pointerAngle) * 2 * p;
    }
    pressure = p;
  }

  function release() {
    if (!pressing) return;
    pressing = false; pressure = 0;
    // Wobble on release
    velX += (Math.random() - 0.5) * 3;
    velY -= 2;
    playRelease(); vibe(6);
  }

  ball.addEventListener('pointerdown', e => {
    e.preventDefault();
    ball.setPointerCapture(e.pointerId);
    const p = e.pressure > 0 ? e.pressure : 0.6;
    press(e.clientX, e.clientY, p);
  });
  ball.addEventListener('pointermove', e => {
    if (!pressing) return;
    const p = e.pressure > 0 ? e.pressure : 0.6;
    updatePointer(e.clientX, e.clientY);
    pressure = p;
  });
  ball.addEventListener('pointerup', () => release());
  ball.addEventListener('pointercancel', () => release());

  // Also track mouse position over card for wobble effect when not pressing
  card.addEventListener('mousemove', e => {
    if (pressing) return;
    const r = ball.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 80) {
      velX += dx * 0.001;
      velY += dy * 0.001;
    }
  });
})();

/* ─── DIAL ─── */
(function() {
  const knob = document.getElementById('dialKnob');
  const display = document.getElementById('dialValue');
  let angle = 0, lastAngle = 0, dragging = false;
  let startY = 0, startAngle = 0;
  const DETENTS = 12;

  function playTick() {
    const c = getCtx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(380, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.02);
    g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.028);
    vibe(4);
  }

  function setAngle(a) {
    const detentSize = 360 / DETENTS;
    const prevDetent = Math.round(lastAngle / detentSize);
    const newDetent = Math.round(a / detentSize);
    if (newDetent !== prevDetent) playTick();
    lastAngle = a; angle = a;
    knob.style.transform = `rotate(${a}deg)`;
    const deg = ((a % 360) + 360) % 360;
    display.textContent = Math.round(deg) + '°';
  }

  knob.addEventListener('mousedown', e => {
    e.preventDefault(); dragging = true;
    startY = e.clientY; startAngle = angle;
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    setAngle(startAngle + (startY - e.clientY) * 1.8);
  });
  window.addEventListener('mouseup', () => dragging = false);

  knob.addEventListener('touchstart', e => {
    e.preventDefault(); dragging = true;
    startY = e.touches[0].clientY; startAngle = angle;
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (!dragging) return; e.preventDefault();
    setAngle(startAngle + (startY - e.touches[0].clientY) * 1.8);
  }, { passive: false });
  window.addEventListener('touchend', () => dragging = false);

  // Scroll wheel
  document.getElementById('card-dial').addEventListener('wheel', e => {
    e.preventDefault();
    setAngle(angle + e.deltaY * 0.4);
  }, { passive: false });
})();

/* ─── SLIDER ─── */
(function() {
  const trackEl = document.getElementById('sliderTrack');
  const thumbEl = document.getElementById('sliderThumb');
  const fillEl = document.getElementById('sliderFill');
  const display = document.getElementById('sliderValue');
  const NOTCHES = 10;
  let value = 50, dragging = false, startX = 0, startVal = 50;
  let lastNotch = 5;

  function playTick(hard) {
    const c = getCtx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(hard ? 500 : 350, t); o.frequency.exponentialRampToValueAtTime(hard ? 180 : 120, t + 0.018);
    g.gain.setValueAtTime(hard ? 0.1 : 0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.025);
    vibe(3);
  }

  function setValue(v) {
    value = Math.max(0, Math.min(100, v));
    const pct = value / 100;
    const trackW = trackEl.offsetWidth;
    const thumbW = thumbEl.offsetWidth;
    const travel = trackW - thumbW;
    thumbEl.style.left = (pct * travel) + 'px';
    fillEl.style.width = (pct * 100) + '%';
    display.textContent = Math.round(value);

    const notch = Math.round(value / (100 / NOTCHES));
    if (notch !== lastNotch) { playTick(notch === 0 || notch === NOTCHES); lastNotch = notch; }
  }

  function getVal(clientX) {
    const rect = trackEl.getBoundingClientRect();
    const thumbW = thumbEl.offsetWidth;
    const travel = rect.width - thumbW;
    return Math.max(0, Math.min(100, ((clientX - rect.left - thumbW / 2) / travel) * 100));
  }

  thumbEl.addEventListener('mousedown', e => {
    e.preventDefault(); dragging = true;
    startX = e.clientX; startVal = value;
  });
  trackEl.addEventListener('mousedown', e => {
    if (e.target === thumbEl || thumbEl.contains(e.target)) return;
    setValue(getVal(e.clientX));
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const rect = trackEl.getBoundingClientRect();
    const thumbW = thumbEl.offsetWidth;
    const travel = rect.width - thumbW;
    setValue(startVal + ((e.clientX - startX) / travel) * 100);
  });
  window.addEventListener('mouseup', () => dragging = false);

  thumbEl.addEventListener('touchstart', e => {
    e.preventDefault(); dragging = true;
    startX = e.touches[0].clientX; startVal = value;
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (!dragging) return; e.preventDefault();
    const rect = trackEl.getBoundingClientRect();
    const thumbW = thumbEl.offsetWidth;
    const travel = rect.width - thumbW;
    setValue(startVal + ((e.touches[0].clientX - startX) / travel) * 100);
  }, { passive: false });
  window.addEventListener('touchend', () => dragging = false);

  setValue(50);
})();
