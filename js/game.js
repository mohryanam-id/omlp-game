    'use strict';
    // Original Craftpix images live under assets/images; paths resolve from the HTML document.
    // Source: Free Alphabet Vector Asset Kit for Education Games; https://craftpix.net/file-licenses/
    const ASSET_DATA = {
  "unicorn": "./assets/images/characters/unicorn.png",
  "rainbow": "./assets/images/ui/rainbow.png",
  "background": "./assets/images/backgrounds/clouds.png",
  "play": "./assets/images/ui/play.png",
  "replay": "./assets/images/ui/replay.png",
  "reward": "./assets/images/ui/reward.png",
  "sparkles": "./assets/images/effects/sparkles.png",
  "queen": "./assets/images/characters/queen.png",
  "lion": "./assets/images/characters/lion.png"
};
    const sprites = {};
    let assetsReady = false;
    document.documentElement.style.setProperty('--arena-art', `url("${new URL(ASSET_DATA.background, document.baseURI).href}")`);
    for (const element of document.querySelectorAll('[data-asset]')) element.src = ASSET_DATA[element.dataset.asset];
    const assetsLoaded = Promise.all(Object.entries(ASSET_DATA).map(([name, source]) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load ${name}`));
      sprites[name] = image;
      image.src = source;
    })));

    // SFX from the supplied 400 Sounds Pack, stored under assets/audio/sfx.
    const SFX = {
      start: { file: './assets/audio/sfx/start.wav', volume: .45 },
      collect: { file: './assets/audio/sfx/collect.wav', volume: .55 },
      bounce: { file: './assets/audio/sfx/bounce.wav', volume: .16 },
      victory: { file: './assets/audio/sfx/victory.wav', volume: .6 },
      gameover: { file: './assets/audio/sfx/gameover.wav', volume: .5 }
    };
    const soundToggle = document.getElementById('soundToggle');
    const backgroundMusic = document.getElementById('backgroundMusic');
    const MUSIC_VOLUME = .16; // Keep the soundtrack below collection and game-event SFX.
    backgroundMusic.volume = MUSIC_VOLUME;
    let musicSource = null, musicGain = null;
    function playBackgroundMusic(restart = false) {
      if (restart) { try { backgroundMusic.currentTime = 0; } catch (_) {} }
      if (muted || state !== 'playing') return;
      backgroundMusic.play().catch(() => {}); // Autoplay denial or missing music must not stop the game.
    }
    let muted = false, audioContext = null, audioEpoch = 0, lastBounceSound = -Infinity;
    const activeSounds = new Set(), soundBuffers = new Map();
    try { muted = localStorage.getItem('one-more-little-pony.muted') === 'true'; } catch (_) {}
    // Download early; decoding and audio activation wait for a user gesture.
    const soundDownloads = Object.fromEntries(Object.entries(SFX).map(([name, effect]) =>
      [name, fetch(effect.file).then(response => {
        if (!response.ok) throw new Error('Sound unavailable');
        return response.arrayBuffer();
      }).catch(() => null)]));
    function updateSoundButton() {
      soundToggle.textContent = muted ? 'Sound off' : 'Sound on';
      soundToggle.setAttribute('aria-pressed', String(muted));
      soundToggle.setAttribute('aria-label', muted ? 'Enable music and sound effects' : 'Mute music and sound effects');
    }
    function activateAudio() {
      if (muted) return;
      try {
        const AudioEngine = window.AudioContext || window.webkitAudioContext;
        if (!AudioEngine) return;
        if (!audioContext) audioContext = new AudioEngine();
        if (!musicSource) {
          musicSource = audioContext.createMediaElementSource(backgroundMusic);
          musicGain = audioContext.createGain();
          musicGain.gain.value = MUSIC_VOLUME;
          backgroundMusic.volume = 1;
          musicSource.connect(musicGain); musicGain.connect(audioContext.destination);
        }
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      } catch (_) { /* Audio availability never blocks gameplay. */ }
    }
    function stopSounds() {
      backgroundMusic.pause();
      audioEpoch++;
      for (const source of activeSounds) { try { source.stop(); } catch (_) {} }
      activeSounds.clear();
    }
    async function playSfx(name) {
      if (muted || !audioContext) return;
      const epoch = audioEpoch;
      if (name === 'bounce') {
        if (audioContext.currentTime - lastBounceSound < .18) return;
        lastBounceSound = audioContext.currentTime;
      }
      try {
        if (!soundBuffers.has(name)) soundBuffers.set(name, soundDownloads[name].then(bytes =>
          bytes ? audioContext.decodeAudioData(bytes.slice(0)) : null).catch(() => null));
        const buffer = await soundBuffers.get(name);
        if (!buffer || muted || epoch !== audioEpoch || audioContext.state !== 'running' || activeSounds.size >= 10) return;
        const source = audioContext.createBufferSource(), gain = audioContext.createGain();
        source.buffer = buffer; gain.gain.value = SFX[name].volume;
        source.connect(gain); gain.connect(audioContext.destination);
        source.onended = () => { activeSounds.delete(source); source.disconnect(); gain.disconnect(); };
        activeSounds.add(source); source.start();
      } catch (_) { /* Missing or unsupported sound files leave the game playable. */ }
    }
    soundToggle.addEventListener('click', () => {
      muted = !muted;
      try { localStorage.setItem('one-more-little-pony.muted', String(muted)); } catch (_) {}
      stopSounds(); updateSoundButton();
      if (!muted) { activateAudio(); playSfx('collect'); playBackgroundMusic(); }
      soundToggle.blur();
    });
    updateSoundButton();

    // Tune gameplay here. World dimensions adapt to the viewport at a constant area.
    const CONFIG = { width: 900, height: 560, duration: 60, playerSpeed: 265,
      playerRadius: 24, enemyRadius: 18, enemySpeed: 115, spawnEvery: 10,
      unicornRadius: 17, unicornCount: 6, safeDistance: 180 };
    const BASE_RADII = { playerRadius: 24, enemyRadius: 18, unicornRadius: 17 };
    // Minimum visible diameters in CSS pixels, independent of phone resolution.
    const PHONE_DIAMETERS = { playerRadius: 48, enemyRadius: 40, unicornRadius: 38 };
    const phoneSizing = window.matchMedia('(max-width: 600px), (pointer: coarse) and (max-height: 600px)');
    function updateEntitySizes(unitsPerPixel, isPhone) {
      for (const key of Object.keys(BASE_RADII)) {
        CONFIG[key] = isPhone ? Math.max(BASE_RADII[key], PHONE_DIAMETERS[key] * unitsPerPixel / 2) : BASE_RADII[key];
      }
      CONFIG.safeDistance = Math.max(180, CONFIG.playerRadius + CONFIG.enemyRadius + 60);
    }
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const arena = document.querySelector('.arena');
    const panel = document.querySelector('.panel');
    const WORLD_AREA = 900 * 560;
    let layoutWidth = 0, layoutHeight = 0, layoutDpr = 0;
    function fitToViewport() {
      const { width, height } = arena.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (width !== layoutWidth || height !== layoutHeight || dpr !== layoutDpr) {
        if (state === 'playing') pause();
        const oldWidth = CONFIG.width, oldHeight = CONFIG.height;
        // The same pixels-per-unit on both axes keeps every shape undistorted.
        // Constant world area keeps object sizes and difficulty comparable.
        const unitsPerPixel = Math.sqrt(WORLD_AREA / (width * height));
        CONFIG.width = width * unitsPerPixel;
        CONFIG.height = height * unitsPerPixel;
        updateEntitySizes(unitsPerPixel, phoneSizing.matches);
        const moveIntoBounds = (object, radius) => {
          object.x = clamp(object.x / oldWidth * CONFIG.width, radius, CONFIG.width - radius);
          object.y = clamp(object.y / oldHeight * CONFIG.height, radius, CONFIG.height - radius);
        };
        if (player) {
          moveIntoBounds(player, CONFIG.playerRadius);
          for (const enemy of enemies) {
            moveIntoBounds(enemy, CONFIG.enemyRadius);
            // A resize must never leave an enemy touching the player.
            if (distance(enemy, player) < CONFIG.playerRadius + CONFIG.enemyRadius + 30) {
              enemy.x = player.x < CONFIG.width / 2 ? CONFIG.width - CONFIG.enemyRadius : CONFIG.enemyRadius;
              enemy.y = player.y < CONFIG.height / 2 ? CONFIG.height - CONFIG.enemyRadius : CONFIG.enemyRadius;
            }
          }
          unicorns.forEach(unicorn => moveIntoBounds(unicorn, CONFIG.unicornRadius + 18));
          sparks = []; pickups = [];
        }
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        ctx.setTransform(canvas.width / CONFIG.width, 0, 0, canvas.height / CONFIG.height, 0, 0);
        layoutWidth = width; layoutHeight = height; layoutDpr = dpr;
      }
      const overlayPadding = parseFloat(getComputedStyle(panel.parentElement).paddingTop) || 0;
      const menuScale = Math.max(0, Math.min(1, (height - overlayPadding * 2) / (panel.offsetHeight || 1)));
      panel.style.transform = `scale(${menuScale})`;
    }
    const ui = Object.fromEntries(['score', 'timer', 'enemyCount', 'best', 'overlay',
      'label', 'title', 'description', 'legend', 'action', 'actionText', 'actionIcon', 'hint'].map(id => [id, document.getElementById(id)]));
    const STORAGE_KEY = 'one-more-love.best';
    let best = 0;
    // Storage can be unavailable in private browsers or under file:// restrictions.
    try { const saved = Number(localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('one-more-coin.best')); if (Number.isSafeInteger(saved) && saved > 0) best = saved; } catch (_) {}
    ui.best.textContent = best;
    let state = 'start', player, enemies = [], unicorns = [], sparks = [];
    let pickups = [];
    let elapsed = 0, score = 0, nextSpawn = CONFIG.spawnEvery;
    let lastTime = 0, accumulator = 0;
    const keys = new Set();
    const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);
    const random = (min, max) => min + Math.random() * (max - min);
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    const touchPause = document.getElementById('touchPause');
    const touchInput = { x: 0, y: 0, pointer: null };
    const touchLayout = window.matchMedia('(any-pointer: coarse), (max-width: 600px)');
    function resetJoystick() {
      const pointer = touchInput.pointer;
      touchInput.pointer = null; touchInput.x = 0; touchInput.y = 0;
      joystickKnob.style.transform = 'translate(0px, 0px)';
      if (pointer !== null && joystick.hasPointerCapture(pointer)) joystick.releasePointerCapture(pointer);
    }
    function clearMovement() { keys.clear(); resetJoystick(); }
    function syncTouchControls() {
      joystick.setAttribute('aria-disabled', String(state !== 'playing'));
      touchPause.disabled = state !== 'playing' && state !== 'paused';
      touchPause.textContent = state === 'paused' ? 'Resume' : 'Pause';
    }
    function moveJoystick(event) {
      const rect = joystick.getBoundingClientRect();
      const travel = Math.max(1, (rect.width - joystickKnob.offsetWidth) / 2 - 3);
      const dx = event.clientX - rect.left - rect.width / 2;
      const dy = event.clientY - rect.top - rect.height / 2;
      const distance = Math.hypot(dx, dy), limit = Math.max(travel, distance);
      const x = dx / limit, y = dy / limit;
      const strength = Math.hypot(x, y);
      const speed = Math.max(0, (strength - .12) / .88);
      touchInput.x = strength ? x / strength * speed : 0;
      touchInput.y = strength ? y / strength * speed : 0;
      joystickKnob.style.transform = `translate(${x * travel}px, ${y * travel}px)`;
    }
    joystick.addEventListener('pointerdown', event => {
      if (state !== 'playing' || touchInput.pointer !== null || event.button !== 0) return;
      event.preventDefault(); touchInput.pointer = event.pointerId;
      joystick.setPointerCapture(event.pointerId); moveJoystick(event);
    });
    joystick.addEventListener('pointermove', event => {
      if (event.pointerId !== touchInput.pointer) return;
      event.preventDefault(); moveJoystick(event);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      joystick.addEventListener(name, event => { if (event.pointerId === touchInput.pointer) resetJoystick(); });
    }
    joystick.addEventListener('contextmenu', event => event.preventDefault());
    touchPause.addEventListener('click', () => {
      if (state === 'playing') pause(); else if (state === 'paused') resume();
      touchPause.blur();
    });

    function spawnUnicorn() {
      const margin = CONFIG.unicornRadius + 18;
      let unicorn;
      for (let attempt = 0; attempt < 100; attempt++) {
        unicorn = { x: random(margin, CONFIG.width - margin), y: random(margin, CONFIG.height - margin), phase: random(0, Math.PI * 2) };
        if (distance(unicorn, player) > CONFIG.playerRadius + CONFIG.unicornRadius + 12
          && unicorns.every(c => distance(c, unicorn) > CONFIG.unicornRadius * 2 + 10)
          && enemies.every(e => distance(e, unicorn) > CONFIG.enemyRadius + CONFIG.unicornRadius + 12)) break;
      }
      return unicorn;
    }
    function spawnEnemy() {
      const r = CONFIG.enemyRadius;
      // Pick an edge away from the player, with a guaranteed safe corner fallback.
      let enemy;
      for (let attempt = 0; attempt < 100; attempt++) {
        enemy = Math.random() < .5
          ? { x: Math.random() < .5 ? r : CONFIG.width - r, y: random(r, CONFIG.height - r) }
          : { x: random(r, CONFIG.width - r), y: Math.random() < .5 ? r : CONFIG.height - r };
        if (distance(enemy, player) >= CONFIG.safeDistance) break;
      }
      if (distance(enemy, player) < CONFIG.safeDistance) {
        enemy = { x: player.x < CONFIG.width / 2 ? CONFIG.width - r : r, y: player.y < CONFIG.height / 2 ? CONFIG.height - r : r };
      }
      const angle = random(.35, 1.22), speed = CONFIG.enemySpeed + random(0, 30);
      enemy.vx = Math.cos(angle) * speed * (enemy.x < CONFIG.width / 2 ? 1 : -1);
      enemy.vy = Math.sin(angle) * speed * (enemy.y < CONFIG.height / 2 ? 1 : -1);
      enemy.phase = random(0, Math.PI * 2);
      enemy.squashX = 0; enemy.squashY = 0;
      enemies.push(enemy);
    }
    function resetWorld() {
      player = { x: CONFIG.width / 2, y: CONFIG.height / 2 };
      enemies = []; unicorns = []; sparks = []; pickups = []; score = 0; elapsed = 0; nextSpawn = CONFIG.spawnEvery;
      spawnEnemy(); spawnEnemy();
      for (let i = 0; i < CONFIG.unicornCount; i++) unicorns.push(spawnUnicorn());
      updateHUD();
    }
    function updateHUD() {
      ui.score.textContent = score;
      ui.timer.textContent = Math.max(0, Math.ceil(CONFIG.duration - elapsed)) + 's';
      ui.enemyCount.textContent = enemies.length;
      ui.best.textContent = best;
    }
    function saveBest() {
      if (score <= best) return;
      best = score;
      try { localStorage.setItem(STORAGE_KEY, String(best)); } catch (_) {}
    }
    function start() {
      if (!assetsReady) return;
      stopSounds(); activateAudio(); playSfx('start');
      clearMovement(); resetWorld(); accumulator = 0; lastTime = performance.now();
      state = 'playing'; ui.overlay.hidden = true; ui.action.blur();
      playBackgroundMusic(true); syncTouchControls();
    }
    function showPanel(label, title, description, button, hint) {
      ui.label.textContent = label; ui.title.textContent = title;
      ui.description.textContent = description; ui.actionText.textContent = button;
      ui.actionIcon.src = ASSET_DATA[state === 'over' || state === 'victory' ? 'replay' : 'play'];
      document.querySelector('.hero-art').src = ASSET_DATA[state === 'victory' ? 'reward' : 'queen'];
      ui.hint.textContent = touchLayout.matches ? (state === 'paused' ? 'Tap Resume to continue' : 'Tap Play again to restart') : hint;
      syncTouchControls(); ui.legend.hidden = true; ui.overlay.hidden = false;
      ui.action.focus({ preventScroll: true });
    }
    function finish(won) {
      stopSounds(); playSfx(won ? 'victory' : 'gameover');
      state = won ? 'victory' : 'over'; clearMovement(); saveBest(); updateHUD();
      showPanel(won ? '60 seconds. A kingdom of ponies.' : 'Every queen gets another chance.', won ? 'A royal victory.' : 'Lion trouble.',
        `You collected ${score} ${score === 1 ? 'unicorn' : 'unicorns'} and survived ${Math.floor(elapsed)} seconds. Personal best: ${best}.`,
        'Play again →', 'Press Enter to restart');
    }
    function pause() {
      if (state !== 'playing') return;
      stopSounds();
      state = 'paused'; clearMovement(); accumulator = 0;
      showPanel('A moment for yourself', 'Take a heartbeat.', 'Your unicorns and remaining time are right where you left them.', 'Resume →', 'Press Enter or Esc to resume');
    }
    function resume() {
      activateAudio();
      state = 'playing'; clearMovement(); accumulator = 0; lastTime = performance.now();
      ui.overlay.hidden = true; ui.action.blur();
      playBackgroundMusic(); syncTouchControls();
    }
    ui.action.addEventListener('click', () => state === 'paused' ? resume() : start());
    window.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      if ((event.target === soundToggle || event.target === touchPause) && (key === 'enter' || key === ' ')) return;
      if (movementKeys.has(key) || key === ' ' || key === 'escape' || key === 'enter') event.preventDefault();
      if (movementKeys.has(key) && state === 'playing') keys.add(key);
      if (event.repeat) return;
      if (key === 'escape') { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
      if (key === 'enter' && state !== 'playing') state === 'paused' ? resume() : start();
    });
    window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

    function update(dt) {
      let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
      let dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
      if (dx === 0 && dy === 0) { dx = touchInput.x; dy = touchInput.y; }
      const length = Math.max(1, Math.hypot(dx, dy));
      player.x = clamp(player.x + dx / length * CONFIG.playerSpeed * dt, CONFIG.playerRadius, CONFIG.width - CONFIG.playerRadius);
      player.y = clamp(player.y + dy / length * CONFIG.playerSpeed * dt, CONFIG.playerRadius, CONFIG.height - CONFIG.playerRadius);
      for (const e of enemies) {
        e.squashX = Math.max(0, e.squashX - dt);
        e.squashY = Math.max(0, e.squashY - dt);
        e.x += e.vx * dt; e.y += e.vy * dt;
        const r = CONFIG.enemyRadius;
        let hitWall = false;
        // Reflect the overshoot instead of pinning to the wall, preserving speed.
        if (e.x < r) { e.x = 2 * r - e.x; e.vx = Math.abs(e.vx); e.squashX = .24; hitWall = true; }
        else if (e.x > CONFIG.width - r) { e.x = 2 * (CONFIG.width - r) - e.x; e.vx = -Math.abs(e.vx); e.squashX = .24; hitWall = true; }
        if (e.y < r) { e.y = 2 * r - e.y; e.vy = Math.abs(e.vy); e.squashY = .24; hitWall = true; }
        else if (e.y > CONFIG.height - r) { e.y = 2 * (CONFIG.height - r) - e.y; e.vy = -Math.abs(e.vy); e.squashY = .24; hitWall = true; }
        if (hitWall) playSfx('bounce');
        if (distance(e, player) <= r + CONFIG.playerRadius) { finish(false); return; }
      }
      for (let i = 0; i < unicorns.length; i++) {
        if (distance(unicorns[i], player) <= CONFIG.unicornRadius + CONFIG.playerRadius) {
          playSfx('collect');
          const collected = unicorns[i];
          pickups.push({ x: collected.x, y: collected.y, life: .5,
            flip: Math.cos(elapsed * Math.PI + collected.phase) });
          for (let j = 0; j < 18; j++) {
            const angle = j / 18 * Math.PI * 2 + random(-.12, .12), speed = random(40, 130);
            const life = random(.45, .85);
            sparks.push({ x: collected.x, y: collected.y, vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 30, life, duration: life,
              angle: random(0, Math.PI * 2), spin: random(-5, 5), radius: random(3, 6) });
          }
          score++; saveBest(); unicorns[i] = spawnUnicorn();
        }
      }
      for (const s of sparks) {
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 95 * dt;
        s.vx *= Math.exp(-1.5 * dt); s.angle += s.spin * dt; s.life -= dt;
      }
      for (const pickup of pickups) pickup.life -= dt;
      pickups = pickups.filter(pickup => pickup.life > 0);
      sparks = sparks.filter(s => s.life > 0);
      elapsed = Math.min(CONFIG.duration, elapsed + dt);
      if (elapsed >= CONFIG.duration - 1e-8) { elapsed = CONFIG.duration; finish(true); return; }
      if (elapsed + 1e-8 >= nextSpawn) { spawnEnemy(); nextSpawn += CONFIG.spawnEvery; }
      updateHUD();
    }
    // Consistent role colors in gameplay: queen = green, unicorn = pink, lion = red.
    const ROLE_GLOW = { queen: '#32d980', unicorn: '#ff57b2', lion: '#ff465d' };
    function drawSprite(name, x, y, radius, angle = 0, opacity = 1, scaleX = 1, scaleY = 1) {
      const image = sprites[name];
      if (!image || !image.complete || !image.naturalWidth) return;
      const scale = radius * 2 / Math.max(image.naturalWidth, image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = opacity;
      const glow = ROLE_GLOW[name];
      if (glow) {
        const halo = ctx.createRadialGradient(0, 0, radius * .2, 0, 0, radius * 1.7);
        halo.addColorStop(0, glow + '80');
        halo.addColorStop(.55, glow + '48');
        halo.addColorStop(1, glow + '00');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(0, 0, radius * 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = glow; ctx.shadowBlur = 14;
      }
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(image, -width / 2, -height / 2, width, height); ctx.restore();
    }
    function draw() {
      ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
      if (!assetsReady) return;
      for (const unicorn of unicorns) {
        // A continuous 2-second turn, with independent phases for each collectible.
        const flip = Math.cos(elapsed * Math.PI + unicorn.phase);
        drawSprite('unicorn', unicorn.x, unicorn.y, CONFIG.unicornRadius, 0, 1, flip);
      }
      for (const enemy of enemies) {
        const t = elapsed * 35 + enemy.phase;
        const wobbleX = Math.sin(t) * .8, wobbleY = Math.cos(t * 1.3) * .6;
        // Damped squash/stretch after wall impact, independent of the hitbox.
        const spring = remaining => remaining > 0 ? Math.cos((.24 - remaining) * 25) * (remaining / .24) * .24 : 0;
        const sx = spring(enemy.squashX), sy = spring(enemy.squashY);
        drawSprite('lion', clamp(enemy.x + wobbleX, CONFIG.enemyRadius, CONFIG.width - CONFIG.enemyRadius),
          clamp(enemy.y + wobbleY, CONFIG.enemyRadius, CONFIG.height - CONFIG.enemyRadius),
          CONFIG.enemyRadius, Math.sin(t * .8) * .065, 1, 1 - sx + sy * .5, 1 - sy + sx * .5);
      }
      for (const pickup of pickups) {
        const fade = pickup.life / .5;
        drawSprite('unicorn', pickup.x, pickup.y - (1 - fade) * 16,
          CONFIG.unicornRadius * (.55 + fade * .45), 0, fade, pickup.flip);
      }
      drawSprite('queen', player.x, player.y, CONFIG.playerRadius);
      for (const spark of sparks) drawSprite('sparkles', spark.x, spark.y, spark.radius,
        spark.angle, Math.min(1, spark.life / spark.duration * 1.5));
    }
    // Small fixed steps prevent fast movement from skipping collisions.
    function frame(now) {
      const delta = Math.min((now - lastTime) / 1000, .1); lastTime = now;
      if (state === 'playing') {
        accumulator += delta;
        while (accumulator >= 1 / 120 && state === 'playing') { update(1 / 120); accumulator -= 1 / 120; }
      } else accumulator = 0;
      draw(); requestAnimationFrame(frame);
    }
    fitToViewport();
    resetWorld();
    const layoutObserver = new ResizeObserver(fitToViewport);
    layoutObserver.observe(arena);
    layoutObserver.observe(panel);
    window.addEventListener('resize', fitToViewport);
    requestAnimationFrame(frame);
    assetsLoaded.then(() => {
      assetsReady = true;
      ui.action.disabled = false;
      ui.actionText.textContent = 'Find ponies →';
      fitToViewport();
    }).catch(() => {
      ui.actionText.textContent = 'Reload to try again';
      ui.hint.textContent = 'An image could not load. Keep the assets folder with index.html, then reload.';
    });
