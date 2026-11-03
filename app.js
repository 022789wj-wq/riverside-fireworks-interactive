(() => {
  const modes = {
    original: { name: '璀璨夜空', image: 'assets/fireworks-original.jpg', colors: ['#ffd48a', '#ff6d77', '#6d9cff', '#fff3cc'], kind: 'classic' },
    silver: { name: '蓝紫银瀑', image: 'assets/fireworks-silver.jpg', colors: ['#fff9dc', '#b9ccff', '#727aff', '#cf8cff'], kind: 'willow' },
    gold: { name: '金色盛放', image: 'assets/fireworks-gold.jpg', colors: ['#fff4ba', '#ffdd75', '#ffb84e', '#fffaf0'], kind: 'finale' },
    garden: { name: '粉红翠绿', image: 'assets/fireworks-garden.jpg', colors: ['#ff7eaf', '#ffb3d5', '#78e6a4', '#b6ffcc'], kind: 'garden' }
  };
  const scene = document.getElementById('scene');
  const canvas = document.getElementById('fireworks');
  const ctx = canvas.getContext('2d', { alpha: true });
  const photos = [document.getElementById('photoA'), document.getElementById('photoB')];
  const cards = [...document.querySelectorAll('.card')];
  const hint = document.getElementById('hint');
  const status = document.getElementById('status');
  const showBtn = document.getElementById('showBtn');
  const soundBtn = document.getElementById('soundBtn');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rockets = [];
  const sparks = [];
  const flashes = [];
  let mode = 'original';
  let activePhoto = 0;
  let width = 0, height = 0, dpr = 1, previous = 0, showTimer = null, audio = null, soundOn = false;

  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  function selectMode(next) {
    if (!modes[next] || next === mode) return;
    mode = next;
    const incoming = 1 - activePhoto;
    photos[incoming].style.backgroundImage = `url("${modes[next].image}")`;
    photos[incoming].style.opacity = '1';
    photos[activePhoto].style.opacity = '0';
    activePhoto = incoming;
    cards.forEach(card => card.setAttribute('aria-pressed', String(card.dataset.mode === mode)));
    status.textContent = modes[next].name;
    hint.classList.add('hidden');
  }
  cards.forEach(card => card.addEventListener('click', event => { event.stopPropagation(); selectMode(card.dataset.mode); launchRandom(); }));

  function launchPoint() {
    // The original photograph is 1536 × 1024; its far-bank launch site is near (755, 735).
    const scale = Math.max(width / 1536, height / 1024);
    return { x: (width - 1536 * scale) / 2 + 755 * scale, y: (height - 1024 * scale) / 2 + 735 * scale };
  }
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = list => list[Math.floor(Math.random() * list.length)];

  function playLaunch() {
    if (!soundOn) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(190, audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, audio.currentTime + .55);
      gain.gain.setValueAtTime(.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.035, audio.currentTime + .08);
      gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .65);
      osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + .68);
    } catch { /* The visual works even when audio is unavailable. */ }
  }
  function playBurst() {
    if (!soundOn || !audio) return;
    try {
      const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * .55), audio.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples.length, 2);
      const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
      source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 850;
      gain.gain.value = .17; source.connect(filter).connect(gain).connect(audio.destination); source.start();
    } catch { /* Keep animation available without audio. */ }
  }

  function launch(targetX, targetY) {
    hint.classList.add('hidden');
    const start = launchPoint();
    const minY = Math.max(75, height * .12);
    const maxY = Math.max(minY + 40, start.y - Math.max(130, height * .16));
    const x = Math.max(width * .08, Math.min(width * .92, targetX));
    const y = Math.max(minY, Math.min(maxY, targetY));
    const color = pick(modes[mode].colors);
    rockets.push({ sx: start.x + rand(-18, 18), sy: start.y, tx: x, ty: y, age: 0, duration: reducedMotion.matches ? .3 : rand(.68, .92), trail: [], color, kind: modes[mode].kind, colors: [...modes[mode].colors] });
    playLaunch();
  }
  function launchRandom() {
    const start = launchPoint();
    launch(rand(width * .23, width * .77), rand(height * .17, Math.max(height * .32, start.y - 165)));
  }
  scene.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    launch(event.clientX, event.clientY);
  });
  scene.addEventListener('keydown', event => {
    if (event.target !== scene) return;
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); launchRandom(); }
  });
  showBtn.addEventListener('click', event => {
    event.stopPropagation();
    if (showTimer) { clearInterval(showTimer); showTimer = null; }
    else { launchRandom(); showTimer = setInterval(launchRandom, 1400); }
    const playing = !!showTimer;
    showBtn.setAttribute('aria-pressed', String(playing));
    showBtn.textContent = playing ? 'Ⅱ 停止放映' : '✦ 连续放映';
  });
  soundBtn.addEventListener('click', event => {
    event.stopPropagation(); soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.textContent = soundOn ? '♪ 关闭声音' : '♪ 开启声音';
    if (soundOn) { try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { soundOn = false; } }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && showTimer) { clearInterval(showTimer); showTimer = null; showBtn.setAttribute('aria-pressed', 'false'); showBtn.textContent = '✦ 连续放映'; }
  });

  function explode(rocket) {
    const { tx: x, ty: y, kind, colors } = rocket;
    const baseCount = reducedMotion.matches ? 36 : kind === 'finale' ? 155 : 125;
    flashes.push({ x, y, radius: kind === 'finale' ? 64 : 48, life: 1, color: rocket.color });
    for (let i = 0; i < baseCount; i++) {
      const a = (i / baseCount) * Math.PI * 2 + rand(-.018, .018);
      const ring = i % 5 === 0 ? .58 : 1;
      let speed = rand(190, 385) * ring;
      let life = rand(1.4, 2.2);
      let gravity = 76;
      if (kind === 'willow') { speed *= .83; life *= 1.55; gravity = 95; }
      if (kind === 'finale') { speed *= 1.13; life *= 1.23; gravity = 105; }
      if (kind === 'garden') speed *= .94;
      sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, age: 0, life, gravity, color: kind === 'garden' ? colors[i % colors.length] : pick(colors), size: rand(1.4, 3.1), twinkle: Math.random() * 10 });
    }
    // Bright inner core makes the bloom legible over the photographed fireworks.
    for (let i = 0; i < 20; i++) {
      const a = rand(0, Math.PI * 2), speed = rand(35, 100);
      sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, age: 0, life: rand(.45, .9), gravity: 48, color: '#fff8e5', size: rand(1, 2.2), twinkle: 0 });
    }
    playBurst();
  }

  function glowDot(x, y, radius, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = radius * 7; ctx.shadowColor = color;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }
  function frame(time) {
    const dt = Math.min((time - (previous || time)) / 1000, .04); previous = time;
    ctx.clearRect(0, 0, width, height);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.age += dt;
      const t = Math.min(r.age / r.duration, 1);
      const eased = 1 - Math.pow(1 - t, 1.35);
      const x = r.sx + (r.tx - r.sx) * eased + Math.sin(t * Math.PI) * 13;
      const y = r.sy + (r.ty - r.sy) * eased;
      r.trail.push({ x, y }); if (r.trail.length > 19) r.trail.shift();
      for (let j = 1; j < r.trail.length; j++) {
        ctx.globalAlpha = (j / r.trail.length) * .75; ctx.strokeStyle = r.color; ctx.shadowColor = r.color; ctx.shadowBlur = 13; ctx.lineWidth = 1.2 + 2.7 * (j / r.trail.length);
        ctx.beginPath(); ctx.moveTo(r.trail[j - 1].x, r.trail[j - 1].y); ctx.lineTo(r.trail[j].x, r.trail[j].y); ctx.stroke();
      }
      glowDot(x, y, 3.2, '#fffce5', 1);
      if (t >= 1) { explode(r); rockets.splice(i, 1); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i]; p.age += dt;
      if (p.age >= p.life) { sparks.splice(i, 1); continue; }
      p.px = p.x; p.py = p.y;
      const drag = Math.pow(.985, dt * 60);
      p.vx *= drag; p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const fade = Math.pow(1 - p.age / p.life, 1.3);
      const blink = p.age > p.life * .55 ? .75 + .25 * Math.sin(p.age * 40 + p.twinkle) : 1;
      ctx.globalAlpha = fade * blink; ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.shadowBlur = 14; ctx.shadowColor = p.color;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      if (i % 5 === 0) glowDot(p.x, p.y, p.size * .56, p.color, fade * blink);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.life -= dt * 3.1;
      if (f.life <= 0) { flashes.splice(i, 1); continue; }
      const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * (1.4 - f.life * .3));
      gradient.addColorStop(0, '#ffffffb8'); gradient.addColorStop(.22, f.color + '77'); gradient.addColorStop(1, '#ffffff00');
      ctx.globalAlpha = f.life * .8; ctx.shadowBlur = 0; ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * (1.4 - f.life * .3), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

