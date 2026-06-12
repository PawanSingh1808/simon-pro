const PADS = [
  { id: 'pad-r', freq: 261, dotClass: 'dot-r' },
  { id: 'pad-g', freq: 329, dotClass: 'dot-g' },
  { id: 'pad-b', freq: 392, dotClass: 'dot-b' },
  { id: 'pad-y', freq: 523, dotClass: 'dot-y' }
];

let seq = [], user = [], level = 0, score = 0, best = 0, streak = 0, combo = 0;
let accepting = false, started = false, baseSpeed = 900;
let audioCtx = null;

const $ = id => document.getElementById(id);

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, dur = 0.22, type = 'sine') {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}

function playError() {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.value = 90;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {}
}

function playWinChord() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'triangle'), i * 80));
}

function flashPad(id, cls, dur) {
  return new Promise(res => {
    const el = $(id);
    el.classList.add(cls);
    setTimeout(() => { el.classList.remove(cls); res(); }, dur);
  });
}

function triggerPulse() {
  const ring = $('pulse');
  ring.style.transition = 'none';
  ring.style.opacity = '0.7';
  ring.style.transform = 'translate(-50%, -50%) scale(0.88)';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ring.style.transition = 'transform 0.55s ease-out, opacity 0.55s ease-out';
      ring.style.transform = 'translate(-50%, -50%) scale(1.3)';
      ring.style.opacity = '0';
    });
  });
}

function setStat(id, val) { $(id).textContent = val; }
function setMsg(t) { $('msg').textContent = t; }

function setCombo(text, show) {
  const el = $('combo-badge');
  el.textContent = text;
  el.classList.toggle('show', show);
}

function updateDots() {
  const el = $('seq-track');
  el.innerHTML = '';
  seq.slice(-24).forEach(i => {
    const d = document.createElement('div');
    d.className = 'seq-dot ' + PADS[i].dotClass;
    el.appendChild(d);
  });
}

function disablePads(state) {
  PADS.forEach(p => $(p.id).disabled = state);
}

async function playSequence() {
  accepting = false;
  disablePads(true);
  setMsg('watch the pattern…');
  const speed = Math.max(180, baseSpeed - level * 18);
  const gap = Math.max(80, speed * 0.4);
  for (const idx of seq) {
    await new Promise(r => setTimeout(r, gap));
    playTone(PADS[idx].freq, (speed / 1000) * 0.85);
    await flashPad(PADS[idx].id, 'lit', speed * 0.7);
  }
  await new Promise(r => setTimeout(r, 350));
  setMsg('your turn! ' + seq.length + ' step' + (seq.length > 1 ? 's' : ''));
  disablePads(false);
  accepting = true;
}

function levelUp() {
  user = [];
  level++;
  combo = 0;
  setStat('s-level', level);
  $('center-level').textContent = level;
  const idx = Math.floor(Math.random() * 4);
  seq.push(idx);
  updateDots();
  const milestones = { 5: 'getting warm...', 10: 'on fire!', 15: 'incredible!', 20: 'legendary!', 25: 'GODLIKE!' };
  if (milestones[level]) { setCombo(milestones[level], true); setTimeout(() => setCombo('', false), 1800); }
  triggerPulse();
  setTimeout(playSequence, 500);
}

async function handleTap(idx) {
  if (!accepting) return;
  playTone(PADS[idx].freq, 0.15);
  await flashPad(PADS[idx].id, 'user-tap', 220);
  user.push(idx);
  const pos = user.length - 1;

  if (user[pos] !== seq[pos]) {
    playError();
    accepting = false;
    disablePads(true);
    if (score > best) { best = score; setStat('s-best', best); }
    streak = 0;
    setStat('s-streak', 0);
    setMsg('wrong! score: ' + score + ' · press restart');
    setCombo('game over', true);
    $('start-btn').textContent = 'Restart';
    $('start-btn').disabled = false;
    $('center-level').textContent = '✕';
    seq = []; user = []; level = 0; score = 0; started = false;
    setStat('s-level', '—');
    setStat('s-score', 0);
    return;
  }

  score += level * (combo > 2 ? 2 : 1);
  setStat('s-score', score);
  combo++;
  if (combo > 3) { setCombo('x' + combo + ' combo!', true); }

  if (user.length === seq.length) {
    accepting = false;
    streak++;
    setStat('s-streak', streak);
    playWinChord();
    setMsg('correct! next level…');
    setTimeout(levelUp, 800);
  }
}

PADS.forEach((p, i) => $(p.id).addEventListener('click', () => handleTap(i)));

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    baseSpeed = parseInt(this.dataset.speed);
  });
});

$('start-btn').addEventListener('click', () => {
  if (started) return;
  started = true;
  seq = []; user = []; level = 0; score = 0; combo = 0;
  setStat('s-level', '—');
  setStat('s-score', 0);
  $('center-level').textContent = '—';
  $('start-btn').disabled = true;
  $('start-btn').textContent = 'playing…';
  setCombo('', false);
  levelUp();
});

const canvas = $('bg');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initParticles() {
  particles = [];
  for (let i = 0; i < 70; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      a: Math.random() * 0.35 + 0.05
    });
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(124, 92, 252, ${p.a})`;
    ctx.fill();
  });
  requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
resizeCanvas();
initParticles();
animateParticles();
