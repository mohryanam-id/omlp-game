    'use strict';
    const LANGUAGE_KEY = 'one-more-little-pony.language';
    let language = 'id', assetsFailed = false;
    try { const saved = localStorage.getItem(LANGUAGE_KEY); if (saved === 'id' || saved === 'en') language = saved; } catch (_) {}
    const t = (key, values = {}) => window.PONY_I18N[language][key].replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
    const languageSelect = document.getElementById('languageSelect');
    const pauseToggle = document.getElementById('pauseToggle');
    const newGameButtons = ['pauseNewGame', 'menuNewGame'].map(id => document.getElementById(id));
    const durationSelect = document.getElementById('durationSelect');
    const durationControl = document.getElementById('durationControl');
    // Original Craftpix images live under assets/images; paths resolve from the HTML document.
    // Source: Free Alphabet Vector Asset Kit for Education Games; https://craftpix.net/file-licenses/
    const ASSET_DATA = {
  "unicorn": "./assets/images/characters/unicorn.png",
  "rainbow": "./assets/images/ui/rainbow.png",
  "background": "./assets/images/backgrounds/clouds.png",
  "play": "./assets/images/ui/play.png",
  "replay": "./assets/images/ui/replay.png",
  "reward": "./assets/images/ui/reward.png",
  "navigationStar": "./assets/images/ui/navigation-star.png",
  "touchShine": "./assets/images/effects/touch-shine.png",
  "sparkles": "./assets/images/effects/sparkles.png",
  "queen": "./assets/images/characters/queen.png",
  "lion": "./assets/images/characters/lion.png"
};
    const MASCOTS = { catHappy: 'happy', catSad: 'sad', catThinking: 'thinking', catCelebrate: 'celebrate' };
    for (const [key, pose] of Object.entries(MASCOTS)) ASSET_DATA[key] = `./assets/images/mascot/${pose}.png`;
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const LEARNING_PAIRS = [
      ['A', 'apple', 'Apel', 'Apple'], ['B', 'ball', 'Bola', 'Ball'], ['C', 'cat', 'Cat (kucing)', 'Cat'],
      ['D', 'donut', 'Donat', 'Donut'], ['E', 'egg', 'Egg (telur)', 'Egg'], ['F', 'flower', 'Flower (bunga)', 'Flower'],
      ['G', 'grape', 'Grape (anggur)', 'Grape'], ['H', 'hat', 'Hat (topi)', 'Hat'], ['I', 'igloo', 'Iglo', 'Igloo'],
      ['J', 'juice', 'Jus', 'Juice'], ['K', 'key', 'Kunci', 'Key'], ['L', 'leaf', 'Leaf (daun)', 'Leaf'],
      ['M', 'mango', 'Mangga', 'Mango'], ['N', 'notebook', 'Notebook (buku)', 'Notebook'], ['O', 'orange', 'Orange (jeruk)', 'Orange'],
      ['P', 'pencil', 'Pensil', 'Pencil'], ['Q', 'queen', 'Queen (ratu)', 'Queen'], ['R', 'rocket', 'Roket', 'Rocket'],
      ['S', 'star', 'Star (bintang)', 'Star'], ['T', 'train', 'Train (kereta)', 'Train'], ['U', 'unicorn', 'Unicorn', 'Unicorn'],
      ['V', 'vase', 'Vas', 'Vase'], ['W', 'whale', 'Whale (paus)', 'Whale'], ['X', 'x-ray', 'X-ray', 'X-ray'],
      ['Y', 'yo-yo', 'Yoyo', 'Yo-yo'], ['Z', 'zebra', 'Zebra', 'Zebra']
    ].map(([letter, object, id, en]) => ({ letter, object, id, en }));
    const COUNTING_OBJECTS = [
      { object: 'apple', id: 'apel', en: 'apples' }, { object: 'ball', id: 'bola', en: 'balls' },
      { object: 'dog', id: 'anjing', en: 'dogs' }, { object: 'flower', id: 'bunga', en: 'flowers' },
      { object: 'star', id: 'bintang', en: 'stars' }, { object: 'umbrella', id: 'payung', en: 'umbrellas' },
      { object: 'xylophone', id: 'xilofon', en: 'xylophones' }
    ];
    for (const letter of LETTERS) ASSET_DATA[`letter${letter}`] = `./assets/images/learning/letters/${letter}0.png`;
    for (const { object } of LEARNING_PAIRS) ASSET_DATA[`learn-${object}`] = `./assets/images/learning/objects/${object}.png`;
    for (const { object } of COUNTING_OBJECTS) ASSET_DATA[`learn-${object}`] = `./assets/images/learning/objects/${object}.png`;
    const sprites = {};
    const collisionMasks = {};
    let assetsReady = false;
    document.documentElement.style.setProperty('--arena-art', `url("${new URL(ASSET_DATA.background, document.baseURI).href}")`);
    for (const element of document.querySelectorAll('[data-asset]')) element.src = ASSET_DATA[element.dataset.asset];
    const SCENES = ['clouds', 'meadow', 'night', 'beach'];
    let selectedScene = 'clouds';
    try { const saved = localStorage.getItem('one-more-little-pony.scene'); if (SCENES.includes(saved)) selectedScene = saved; } catch (_) {}
    function applyScene(scene) {
      if (!SCENES.includes(scene)) return;
      selectedScene = scene;
      document.getElementById('timeIcon').src = `./assets/images/ui/${scene === 'night' ? 'moon' : 'sun'}.png`;
      document.documentElement.style.setProperty('--arena-art', `url("${new URL(`./assets/images/backgrounds/${scene}.png`, document.baseURI).href}")`);
      for (const button of document.querySelectorAll('[data-scene]')) button.setAttribute('aria-pressed', String(button.dataset.scene === scene));
      try { localStorage.setItem('one-more-little-pony.scene', scene); } catch (_) {}
    }
    for (const button of document.querySelectorAll('[data-scene]')) button.addEventListener('click', () => { if (button.dataset.scene !== selectedScene) { applyScene(button.dataset.scene); playUi(); } });
    applyScene(selectedScene);
    const assetsLoaded = Promise.all(Object.entries(ASSET_DATA).map(([name, source]) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (name === 'queen' || name === 'lion') collisionMasks[name] = makeCollisionMask(image);
        resolve(image);
      };
      image.onerror = () => reject(new Error(`Unable to load ${name}`));
      sprites[name] = image;
      image.src = source;
    })));

    // SFX from the supplied 400 Sounds Pack, stored under assets/audio/sfx.
    const SFX = {
      start: { file: './assets/audio/sfx/start.wav', volume: .45 },
      collect: { file: './assets/audio/sfx/collect.wav', volume: .32, group: 'collect', cooldown: 0 },
      heart: { file: './assets/audio/sfx/heart-collect.wav', volume: .42, cooldown: 250 },
      spawn: { file: './assets/audio/sfx/bounce.wav', volume: .16 },
      victory: { file: './assets/audio/sfx/victory.wav', volume: .5 },
      gameover: { file: './assets/audio/sfx/gameover.wav', volume: .4 },
      uiSelect: { file: './assets/audio/sfx/ui-select.wav', volume: .14, group: 'ui', cooldown: 130 },
      uiOpen: { file: './assets/audio/sfx/ui-open.wav', volume: .12, group: 'ui', cooldown: 130 },
      uiClose: { file: './assets/audio/sfx/ui-close.wav', volume: .10, group: 'ui', cooldown: 130 },
      countdown: { file: './assets/audio/sfx/countdown.wav', volume: .10, cooldown: 700 }
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
    let muted = false, audioContext = null, audioEpoch = 0;
    const activeSounds = new Set(), soundBuffers = new Map();
    const lastSoundAt = new Map(), soundGroups = new Map();
    try { muted = localStorage.getItem('one-more-little-pony.muted') === 'true'; } catch (_) {}
    // Download early; decoding and audio activation wait for a user gesture.
    const soundDownloads = Object.fromEntries(Object.entries(SFX).map(([name, effect]) =>
      [name, fetch(effect.file).then(response => {
        if (!response.ok) throw new Error('Sound unavailable');
        return response.arrayBuffer();
      }).catch(() => null)]));
    function updateSoundButton() {
      soundToggle.textContent = t(muted ? 'soundOff' : 'soundOn');
      soundToggle.setAttribute('aria-pressed', String(muted));
      soundToggle.setAttribute('aria-label', t(muted ? 'unmute' : 'mute'));
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
      activeSounds.clear(); soundGroups.clear(); lastSoundAt.clear();
    }
    async function playSfx(name) {
      if (muted || !audioContext || !SFX[name] || document.hidden) return;
      const effect = SFX[name], group = effect.group || name, requestedAt = performance.now();
      // Every pickup gets its own voice, including several in the same frame.
      if (group !== 'collect' && requestedAt - (lastSoundAt.get(group) ?? -Infinity) < (effect.cooldown ?? 100)) return;
      lastSoundAt.set(group, requestedAt);
      const epoch = audioEpoch;
      try {
        if (!soundBuffers.has(name)) soundBuffers.set(name, soundDownloads[name].then(bytes =>
          bytes ? audioContext.decodeAudioData(bytes.slice(0)) : null).catch(() => null));
        const buffer = await soundBuffers.get(name);
        if (!buffer || muted || epoch !== audioEpoch || audioContext.state !== 'running' || (group !== 'collect' && (activeSounds.size >= 5 || performance.now() - requestedAt > 350)) || (group === 'ui' && [...soundGroups.values()].includes('ui'))) return;
        const source = audioContext.createBufferSource(), gain = audioContext.createGain();
        source.buffer = buffer; gain.gain.value = SFX[name].volume;
        source.connect(gain); gain.connect(audioContext.destination);
        source.onended = () => { activeSounds.delete(source); soundGroups.delete(source); source.disconnect(); gain.disconnect(); };
        activeSounds.add(source); soundGroups.set(source, group); source.start();
      } catch (_) { /* Missing or unsupported sound files leave the game playable. */ }
    }
    function playUi(name = 'uiSelect') { activateAudio(); playSfx(name); }
    soundToggle.addEventListener('click', () => {
      muted = !muted;
      try { localStorage.setItem('one-more-little-pony.muted', String(muted)); } catch (_) {}
      stopSounds(); updateSoundButton();
      if (!muted) { activateAudio(); playSfx('uiSelect'); playBackgroundMusic(); }
      soundToggle.blur();
    });
    updateSoundButton();

    // Tune gameplay here. World dimensions adapt to the viewport at a constant area.
    const CONFIG = { width: 900, height: 560, duration: 60, playerSpeed: 265,
      playerRadius: 48, enemyRadius: 18, enemySpeed: 115, spawnEvery: 10,
      unicornRadius: 25.5, unicornCount: 6, safeDistance: 180 };
    const BASE_RADII = { playerRadius: 48, enemyRadius: 18, unicornRadius: 25.5 };
    // Minimum visible diameters in CSS pixels, independent of phone resolution.
    const PHONE_DIAMETERS = { playerRadius: 96, enemyRadius: 40, unicornRadius: 57 };
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
          learningTokens.forEach(token => moveIntoBounds(token, learningRadius()));
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
    const ui = Object.fromEntries(['score', 'timer', 'enemyCount', 'hearts', 'best', 'overlay',
      'label', 'title', 'description', 'legend', 'action', 'actionText', 'actionIcon', 'hint'].map(id => [id, document.getElementById(id)]));
    const rescueStars = document.getElementById('rescueStars');
    const rescueButtons = [...document.querySelectorAll('#rescueStars button')];
    const missionCard = document.getElementById('learningMission');
    const missionIcon = document.getElementById('missionIcon');
    const missionKind = document.getElementById('missionKind');
    const missionText = document.getElementById('missionText');
    const missionProgress = document.getElementById('missionProgress');
    const missionSuccess = document.getElementById('missionSuccess');
    const lifeProgressEl = document.getElementById('lifeProgress');
    const alphabetAlbum = document.getElementById('alphabetAlbum');
    const alphabetGrid = document.getElementById('alphabetGrid');
    const ALBUM_KEY = 'one-more-unicorn.alphabet-album';
    const albumLetters = new Set();
    try {
      for (const letter of JSON.parse(localStorage.getItem(ALBUM_KEY) || '[]')) if (LETTERS.includes(letter)) albumLetters.add(letter);
    } catch (_) {}
    const STORAGE_KEY = 'one-more-love.best';
    let best = 0;
    // Storage can be unavailable in private browsers or under file:// restrictions.
    try { const saved = Number(localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('one-more-coin.best')); if (Number.isSafeInteger(saved) && saved > 0) best = saved; } catch (_) {}
    ui.best.textContent = best;
    let state = 'start', player, enemies = [], unicorns = [], sparks = [];
    let pickups = [];
    let learningTokens = [], missionState = null, missionNumber = 0, lastMissionLetter = '';
    let countdownSecond = 4;
    const STARTING_HEARTS = 3, MAX_HEARTS = 5, UNICORNS_PER_HEART = 5;
    let elapsed = 0, score = 0, hearts = STARTING_HEARTS, lifeProgress = 0, nextSpawn = CONFIG.spawnEvery;
    let rescueFound = 0;
    let lastTime = 0, accumulator = 0;
    const keys = new Set();
    const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);
    const random = (min, max) => min + Math.random() * (max - min);
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

    function pairName(pair) { return language === 'id' ? (pair.id || pair.en) : pair.en; }
    function shuffled(items) {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }
    function learningRadius() { return Math.max(27, CONFIG.unicornRadius * 1.05); }
    function learningPosition(radius = learningRadius()) {
      const margin = radius + 16, top = Math.max(margin, CONFIG.height * .18);
      let point = { x: CONFIG.width / 2, y: CONFIG.height / 2 };
      for (let attempt = 0; attempt < 100; attempt++) {
        point = { x: random(margin, CONFIG.width - margin), y: random(top, CONFIG.height - margin) };
        if (distance(point, player) > CONFIG.playerRadius + radius + 35
          && learningTokens.every(token => distance(token, point) > radius * 2 + 18)
          && enemies.every(enemy => distance(enemy, point) > CONFIG.enemyRadius + radius + 20)
          && unicorns.every(unicorn => distance(unicorn, point) > CONFIG.unicornRadius + radius + 14)) break;
      }
      return point;
    }
    function makeLearningToken(sprite, details = {}) {
      return { ...learningPosition(), sprite, phase: random(0, Math.PI * 2), cooldown: 0, bounce: 0, ...details };
    }
    function saveAlbum() {
      try { localStorage.setItem(ALBUM_KEY, JSON.stringify([...albumLetters].sort())); } catch (_) {}
    }
    function addAlbumLetter(letter) {
      if (albumLetters.has(letter)) return;
      albumLetters.add(letter); saveAlbum();
    }
    function renderAlbum() {
      const cards = LETTERS.map(letter => {
        const found = albumLetters.has(letter), card = document.createElement('div'), image = document.createElement('img');
        card.className = `album-letter ${found ? 'found' : 'locked'}`;
        card.setAttribute('aria-label', t(found ? 'letterFound' : 'letterLocked', { letter }));
        image.src = ASSET_DATA[`letter${letter}`]; image.alt = found ? letter : '';
        card.append(image); return card;
      });
      alphabetGrid.replaceChildren(...cards);
      document.getElementById('albumCount').textContent = `${albumLetters.size} / 26`;
    }
    function updateMissionCard() {
      const missionComplete = state === 'playing' && missionState?.type === 'complete';
      missionCard.hidden = state !== 'playing' || !missionState || missionComplete;
      missionSuccess.hidden = !missionComplete;
      if (!missionState) return;
      missionKind.textContent = t('missionShort');
      if (missionState.type === 'complete') {
        missionSuccess.setAttribute('aria-label', `${missionState.message}. ${t('nextMission')}`);
      } else if (missionState.type === 'count') {
        const name = pairName(missionState.pair);
        missionIcon.src = ASSET_DATA[`learn-${missionState.pair.object}`];
        missionText.textContent = `× ${missionState.target}`;
        missionProgress.textContent = missionState.target === 1 ? '' : '●'.repeat(missionState.collected) + '○'.repeat(missionState.target - missionState.collected);
        missionCard.setAttribute('aria-label', `${t('collectCount', { count: missionState.target, name })}. ${t('countProgress', { current: missionState.collected, count: missionState.target })}`);
      } else if (missionState.phase === 'letter') {
        missionIcon.src = ASSET_DATA[`letter${missionState.pair.letter}`];
        missionText.textContent = '= ?';
        missionProgress.textContent = missionState.wrongAttempts >= 2 ? '✨' : missionState.feedback ? '↺' : '● ● ●';
        missionCard.setAttribute('aria-label', `${t('findLetter', { letter: missionState.pair.letter })}. ${missionState.wrongAttempts >= 2 ? t('hintGlow') : missionState.feedback ? t('tryAnother') : t('chooseLetter')}`);
      } else {
        const name = pairName(missionState.pair);
        missionIcon.src = ASSET_DATA[`learn-${missionState.pair.object}`];
        missionText.textContent = '× 1';
        missionProgress.textContent = '';
        missionCard.setAttribute('aria-label', `${t('findObject', { name })}. ${t('letterPair', { letter: missionState.pair.letter, name })}`);
      }
    }
    function startLearningMission() {
      learningTokens = [];
      const pool = LEARNING_PAIRS;
      if (missionNumber % 2 === 0) {
        const candidates = pool.filter(pair => pair.letter !== lastMissionLetter);
        const pair = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
        lastMissionLetter = pair.letter;
        missionState = { type: 'letter-object', phase: 'letter', pair, wrongAttempts: 0, feedback: false };
        const distractors = shuffled(LETTERS.filter(letter => letter !== pair.letter)).slice(0, 2);
        for (const letter of shuffled([pair.letter, ...distractors])) {
          learningTokens.push(makeLearningToken(`letter${letter}`, { letter, correct: letter === pair.letter }));
        }
      } else {
        const pair = COUNTING_OBJECTS[Math.floor(Math.random() * COUNTING_OBJECTS.length)];
        const target = 1 + Math.floor(Math.random() * 5);
        missionState = { type: 'count', pair, target, collected: 0 };
        for (let i = 0; i < target; i++) learningTokens.push(makeLearningToken(`learn-${pair.object}`, { correct: true }));
      }
      updateMissionCard();
    }
    function rewardLearningMission(x, y, message) {
      score++; saveBest(); playSfx('collect'); react(player, 'happy');
      recordUnicornForLife();
      pickups.push({ x, y, life: .7, flip: 1 });
      for (let i = 0; i < 14; i++) {
        const angle = i / 14 * Math.PI * 2, speed = random(35, 105), life = random(.45, .8);
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 25,
          life, duration: life, angle, spin: random(-4, 4), radius: random(4, 7) });
      }
      learningTokens = []; missionNumber++;
      missionState = { type: 'complete', message, transition: reducedMotion.matches ? .45 : 1.1 };
      updateMissionCard(); updateHUD();
    }
    function touchLearningToken(index) {
      const token = learningTokens[index];
      if (!token || token.cooldown > 0 || !missionState || missionState.type === 'complete') return;
      if (missionState.type === 'count') {
        learningTokens.splice(index, 1); missionState.collected++; playSfx('uiSelect');
        if (missionState.collected >= missionState.target) rewardLearningMission(token.x, token.y,
          t('countComplete', { count: missionState.target, name: pairName(missionState.pair) }));
        else updateMissionCard();
        return;
      }
      if (missionState.phase === 'letter' && !token.correct) {
        token.cooldown = 1.2; token.bounce = .55; missionState.feedback = true; missionState.wrongAttempts++;
        if (missionState.wrongAttempts >= 2) for (const item of learningTokens) item.highlight = item.correct;
        react(player, 'thinking'); playSfx('uiClose'); updateMissionCard(); return;
      }
      if (missionState.phase === 'letter') {
        addAlbumLetter(missionState.pair.letter); playSfx('uiSelect');
        missionState.phase = 'object'; learningTokens = [makeLearningToken(`learn-${missionState.pair.object}`, { correct: true })];
        updateMissionCard(); return;
      }
      rewardLearningMission(token.x, token.y,
        t('pairComplete', { letter: missionState.pair.letter, name: pairName(missionState.pair) }));
    }
    function updateLearning(dt) {
      if (!missionState) return;
      if (missionState.type === 'complete') {
        missionState.transition -= dt;
        if (missionState.transition <= 0) startLearningMission();
        return;
      }
      for (const token of learningTokens) {
        token.cooldown = Math.max(0, token.cooldown - dt);
        token.bounce = Math.max(0, token.bounce - dt);
      }
      const radius = learningRadius();
      for (let i = learningTokens.length - 1; i >= 0; i--) {
        if (distance(learningTokens[i], player) <= radius + CONFIG.playerRadius * .62) {
          touchLearningToken(i); break;
        }
      }
    }

    const pointerTarget = { x: 0, y: 0, active: false, pointer: null, fade: 0 };
    const touchMark = { x: 0, y: 0, life: 0 };
    const POINTER_FEEDBACK = { arrivalFade: .45, rippleDuration: .55 };
    function resetPointerTarget() {
      const pointer = pointerTarget.pointer;
      pointerTarget.active = false; pointerTarget.pointer = null;
      pointerTarget.fade = 0; touchMark.life = 0;
      if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    }
    function clearMovement() { keys.clear(); resetPointerTarget(); }
    function setPointerTarget(event) {
      const rect = canvas.getBoundingClientRect();
      pointerTarget.x = clamp((event.clientX - rect.left) / rect.width * CONFIG.width, CONFIG.playerRadius, CONFIG.width - CONFIG.playerRadius);
      pointerTarget.y = clamp((event.clientY - rect.top) / rect.height * CONFIG.height, CONFIG.playerRadius, CONFIG.height - CONFIG.playerRadius);
      pointerTarget.active = true;
      pointerTarget.fade = POINTER_FEEDBACK.arrivalFade;
    }
    canvas.addEventListener('pointerdown', event => {
      if (state !== 'playing' || event.button !== 0 || pointerTarget.pointer !== null) return;
      event.preventDefault(); keys.clear();
      pointerTarget.pointer = event.pointerId;
      canvas.setPointerCapture(event.pointerId); setPointerTarget(event);
      const rect = canvas.getBoundingClientRect();
      touchMark.x = (event.clientX - rect.left) / rect.width * CONFIG.width;
      touchMark.y = (event.clientY - rect.top) / rect.height * CONFIG.height;
      touchMark.life = POINTER_FEEDBACK.rippleDuration;
    });
    canvas.addEventListener('pointermove', event => {
      if (event.pointerId !== pointerTarget.pointer) return;
      event.preventDefault(); setPointerTarget(event);
    });
    canvas.addEventListener('pointerup', event => {
      if (event.pointerId !== pointerTarget.pointer) return;
      setPointerTarget(event); pointerTarget.pointer = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    });
    for (const name of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => {
      if (event.pointerId === pointerTarget.pointer) resetPointerTarget();
    });
    canvas.addEventListener('contextmenu', event => event.preventDefault());
    const navigationHelp = document.getElementById('navigationHelp');
    const hideNavigation = document.getElementById('hideNavigation');
    const NAVIGATION_KEY = 'one-more-little-pony.hide-navigation';
    function navigationHidden() {
      try { return localStorage.getItem(NAVIGATION_KEY) === 'true'; } catch (_) { return false; }
    }
    function openNavigationHelp() {
      pause(); clearMovement();
      hideNavigation.checked = navigationHidden();
      navigationHelp.showModal();
    }
    document.getElementById('navigationDone').addEventListener('click', () => { navigationHelp.close(); playUi(); });
    hideNavigation.addEventListener('change', () => playUi());
    navigationHelp.addEventListener('close', () => {
      try { localStorage.setItem(NAVIGATION_KEY, String(hideNavigation.checked)); } catch (_) {}
      menuToggle.focus({ preventScroll: true });
    });
    document.getElementById('showNavigation').addEventListener('click', () => {
      closeMenu(false); openNavigationHelp(); playUi('uiOpen');
    });
    document.getElementById('showAlbum').addEventListener('click', () => {
      closeMenu(false); renderAlbum(); alphabetAlbum.showModal(); playUi('uiOpen');
      document.getElementById('albumClose').focus({ preventScroll: true });
    });
    document.getElementById('albumClose').addEventListener('click', () => alphabetAlbum.close());
    alphabetAlbum.addEventListener('close', () => { playUi('uiClose'); menuToggle.focus({ preventScroll: true }); });
    const gameMenu = document.getElementById('gameMenu');
    const menuToggle = document.getElementById('menuToggle');
    const settingsTab = document.getElementById('settingsTab');
    const aboutTab = document.getElementById('aboutTab');
    function selectMenuPage(about) {
      document.getElementById('settingsPage').hidden = about;
      document.getElementById('aboutPage').hidden = !about;
      settingsTab.setAttribute('aria-pressed', String(!about));
      aboutTab.setAttribute('aria-pressed', String(about));
    }
    function closeMenu(feedback = true) { gameMenu.close(); if (feedback) playUi('uiClose'); menuToggle.focus({ preventScroll: true }); }
    menuToggle.addEventListener('click', () => {
      pause(); clearMovement(); selectMenuPage(false); syncControls();
      gameMenu.showModal(); menuToggle.setAttribute('aria-expanded', 'true'); playUi('uiOpen');
    });
    document.getElementById('menuClose').addEventListener('click', closeMenu);
    gameMenu.addEventListener('close', () => menuToggle.setAttribute('aria-expanded', 'false'));
    gameMenu.addEventListener('click', event => {
      const rect = gameMenu.getBoundingClientRect();
      if (event.target === gameMenu && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeMenu();
    });
    settingsTab.addEventListener('click', () => { if (document.getElementById('settingsPage').hidden) { selectMenuPage(false); playUi(); } });
    aboutTab.addEventListener('click', () => { if (document.getElementById('aboutPage').hidden) { selectMenuPage(true); playUi(); } });
    function syncControls() {
      for (const button of newGameButtons) {
        button.hidden = state !== 'paused';
        button.disabled = state !== 'paused' || !assetsReady;
        button.title = t('newGameHint');
        button.setAttribute('aria-label', `${t('newGame')}. ${t('newGameHint')}`);
      }
      pauseToggle.hidden = state !== 'paused';
      pauseToggle.disabled = state !== 'paused';
      pauseToggle.textContent = t('resume');
      durationSelect.disabled = state === 'playing' || state === 'paused' || state === 'rescue';
    }
    pauseToggle.addEventListener('click', () => {
      if (state === 'paused') { closeMenu(false); resume(); }
    });

    for (const button of newGameButtons) button.addEventListener('click', () => {
      if (state !== 'paused' || !assetsReady) return;
      if (gameMenu.open) closeMenu(false);
      saveBest(); start(); button.blur();
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
      playSfx('spawn');
    }
    let defeatReveal = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function react(object, kind) { object.reaction = kind; object.reactionLife = .65; }
    function resetWorld() {
      defeatReveal = 0;
      player = { x: CONFIG.width / 2, y: CONFIG.height / 2, invulnerable: 0 };
      enemies = []; unicorns = []; sparks = []; pickups = []; learningTokens = []; missionState = null; missionNumber = 0;
      score = 0; hearts = STARTING_HEARTS; lifeProgress = 0; rescueFound = 0; elapsed = 0; countdownSecond = 4; nextSpawn = CONFIG.spawnEvery;
      for (const button of rescueButtons) button.classList.remove('found');
      for (let i = 0; i < CONFIG.unicornCount; i++) unicorns.push(spawnUnicorn());
      startLearningMission();
      updateHUD();
    }
    function updateHUD() {
      ui.score.textContent = score;
      ui.timer.textContent = Math.max(0, Math.ceil(CONFIG.duration - elapsed)) + 's';
      ui.enemyCount.textContent = enemies.length;
      ui.hearts.textContent = '♥'.repeat(hearts) || '♡';
      ui.hearts.setAttribute('aria-label', `${t('hearts')}: ${hearts}`);
      const shownProgress = hearts >= MAX_HEARTS ? UNICORNS_PER_HEART : lifeProgress;
      lifeProgressEl.textContent = '●'.repeat(shownProgress) + '○'.repeat(UNICORNS_PER_HEART - shownProgress);
      lifeProgressEl.setAttribute('aria-label', hearts >= MAX_HEARTS ? t('lifeFull') : t('lifeProgress', { current: lifeProgress, count: UNICORNS_PER_HEART }));
      ui.best.textContent = best;
      document.getElementById('timeFill').style.width = `${Math.max(0, 1 - elapsed / CONFIG.duration) * 100}%`;
    }
    function saveBest() {
      if (score <= best) return;
      best = score;
      try { localStorage.setItem(STORAGE_KEY, String(best)); } catch (_) {}
    }
    function recordUnicornForLife() {
      if (hearts >= MAX_HEARTS) return;
      lifeProgress++;
      if (lifeProgress < UNICORNS_PER_HEART) return;
      lifeProgress = 0; hearts++;
      react(player, 'life'); playSfx('heart');
      lifeProgressEl.classList.remove('earned'); void lifeProgressEl.offsetWidth; lifeProgressEl.classList.add('earned');
      for (let i = 0; i < 16; i++) {
        const angle = i / 16 * Math.PI * 2, speed = random(45, 120), life = random(.55, .9);
        sparks.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 28,
          life, duration: life, angle, spin: random(-4, 4), radius: random(6, 10) });
      }
    }
    function start() {
      if (!assetsReady || navigationHelp.open) return;
      stopSounds(); activateAudio(); playSfx('start');
      CONFIG.duration = Number(durationSelect.value) || 60;
      clearMovement(); resetWorld(); accumulator = 0; lastTime = performance.now();
      state = 'playing'; ui.overlay.hidden = true; ui.action.blur();
      updateMissionCard(); playBackgroundMusic(true); syncControls();
    }
    function renderPanel() {
      const starting = state === 'start', paused = state === 'paused', rescuing = state === 'rescue', won = state === 'victory';
      durationControl.hidden = rescuing;
      ui.label.textContent = t(rescuing ? 'rescueLabel' : starting ? 'startLabel' : paused ? 'pauseLabel' : won ? 'winLabel' : 'loseLabel', { seconds: CONFIG.duration });
      ui.title.textContent = t(rescuing ? 'rescueTitle' : starting ? 'startTitle' : paused ? 'pauseTitle' : won ? 'winTitle' : 'loseTitle');
      ui.description.textContent = rescuing ? t('rescueText') : starting ? t('instructions', { minutes: Number(durationSelect.value) / 60 || 1 }) : paused ? t('pauseText') : t('result', { score, seconds: Math.floor(elapsed), best });
      ui.actionText.textContent = t(assetsFailed ? 'reload' : !assetsReady ? 'loading' : starting ? 'start' : paused ? 'resume' : 'replay');
      ui.hint.textContent = t(rescuing ? 'rescueHint' : assetsFailed ? 'loadError' : starting ? 'startHint' : paused ? 'pauseHint' : 'restartHint');
      ui.actionIcon.src = ASSET_DATA[starting || paused ? 'play' : 'replay'];
      document.querySelector('.hero-art').src = ASSET_DATA[starting || rescuing ? 'catHappy' : paused ? 'catThinking' : won ? 'catCelebrate' : 'catSad'];
      panel.dataset.result = won ? 'victory' : starting ? 'start' : paused ? 'paused' : rescuing ? 'rescue' : 'over';
      ui.legend.hidden = !starting;
      rescueStars.hidden = !rescuing;
      ui.action.hidden = rescuing;
      updateMissionCard();
    }
    function applyLanguage() {
      document.documentElement.lang = language;
      languageSelect.value = language;
      languageSelect.setAttribute('aria-label', t('language'));
      for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
      for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', t(element.dataset.i18nAria));
      rescueStars.setAttribute('aria-label', t('rescueStars'));
      rescueButtons.forEach((button, index) => button.setAttribute('aria-label', `${t('rescueStars')} ${index + 1}`));
      updateSoundButton(); syncControls();
      updateMissionCard();
      if (alphabetAlbum.open) renderAlbum();
      if (state !== 'playing') renderPanel();
    }
    durationSelect.addEventListener('change', () => {
      playUi();
      if (![60, 120, 180].includes(Number(durationSelect.value))) durationSelect.value = '60';
      if (state === 'start') { CONFIG.duration = Number(durationSelect.value); updateHUD(); }
      renderPanel();
    });
    languageSelect.addEventListener('change', () => {
      if (state === 'playing') pause();
      language = languageSelect.value === 'en' ? 'en' : 'id';
      try { localStorage.setItem(LANGUAGE_KEY, language); } catch (_) {}
      applyLanguage(); playUi();
    });
    function showPanel() {
      renderPanel(); syncControls(); ui.overlay.hidden = false;
      if (!gameMenu.open && !navigationHelp.open) (state === 'rescue' ? rescueButtons[0] : ui.action)?.focus({ preventScroll: true });
    }
    function finish(won) {
      stopSounds(); playSfx(won ? 'victory' : 'gameover');
      state = won ? 'victory' : 'over'; clearMovement(); saveBest(); updateHUD();
      if (!won && player.reaction === 'hurt') { defeatReveal = reducedMotion.matches ? .2 : .65; ui.overlay.hidden = true; syncControls(); }
      else showPanel();
    }
    function resumeFromRescue() {
      hearts = 1;
      player.invulnerable = 2.5;
      player.x = CONFIG.width / 2; player.y = CONFIG.height / 2;
      // Give the child a calm, predictable space when play resumes.
      enemies.forEach((enemy, index) => {
        enemy.x = index % 2 ? CONFIG.enemyRadius : CONFIG.width - CONFIG.enemyRadius;
        enemy.y = index % 4 < 2 ? CONFIG.enemyRadius : CONFIG.height - CONFIG.enemyRadius;
        enemy.unicornContacts = new Set();
      });
      state = 'playing'; ui.overlay.hidden = true; rescueStars.hidden = true;
      accumulator = 0; lastTime = performance.now();
      updateHUD(); updateMissionCard(); syncControls(); playBackgroundMusic();
    }
    function collectRescueStar(index = rescueFound) {
      if (state !== 'rescue') return;
      const button = rescueButtons[index];
      if (!button || button.classList.contains('found')) return;
      button.classList.add('found'); rescueFound++; playUi();
      if (rescueFound >= rescueButtons.length) resumeFromRescue();
      else rescueButtons.find(item => !item.classList.contains('found'))?.focus({ preventScroll: true });
    }
    rescueButtons.forEach((button, index) => button.addEventListener('click', () => collectRescueStar(index)));
    function beginRescue() {
      state = 'rescue'; rescueFound = 0; clearMovement(); stopSounds();
      for (const button of rescueButtons) button.classList.remove('found');
      playSfx('start'); updateHUD(); showPanel();
    }
    function dropCollectedUnicorn() {
      if (score <= 0) return;
      score--;
      const dropped = spawnUnicorn();
      dropped.dropped = true;
      unicorns.push(dropped);
    }
    function handleLionTouch(enemy) {
      if (player.invulnerable > 0) return;
      hearts = Math.max(0, hearts - 1); player.invulnerable = 2;
      react(player, 'hurt'); react(enemy, 'caught'); dropCollectedUnicorn();
      const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x) || 0;
      const reboundSpeed = Math.max(CONFIG.enemySpeed, Math.hypot(enemy.vx, enemy.vy));
      enemy.vx = Math.cos(angle) * reboundSpeed;
      enemy.vy = Math.sin(angle) * reboundSpeed;
      playSfx('uiClose'); updateHUD();
      if (!hearts) beginRescue();
    }
    function pause() {
      if (state !== 'playing') return;
      stopSounds();
      state = 'paused'; clearMovement(); accumulator = 0;
      showPanel();
    }
    function resume() {
      activateAudio();
      state = 'playing'; clearMovement(); accumulator = 0; lastTime = performance.now();
      ui.overlay.hidden = true; ui.action.blur();
      updateMissionCard(); playBackgroundMusic(); syncControls(); playUi();
    }
    ui.action.addEventListener('click', () => state === 'paused' ? resume() : start());
    window.addEventListener('keydown', event => {
      if (gameMenu.open || navigationHelp.open) return;
      const key = event.key.toLowerCase();
      if (event.target === menuToggle && (key === 'enter' || key === ' ')) return;
      if (event.target === languageSelect || event.target === durationSelect) return;
      if ((newGameButtons.includes(event.target) || event.target === soundToggle || event.target === pauseToggle) && (key === 'enter' || key === ' ')) return;
      if (movementKeys.has(key) || key === ' ' || key === 'escape' || key === 'enter') event.preventDefault();
      if (movementKeys.has(key) && state === 'playing') { resetPointerTarget(); keys.add(key); }
      if (event.repeat) return;
      if (key === 'escape') { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
      if (key === 'enter' && state === 'rescue') collectRescueStar();
      else if (key === 'enter' && state !== 'playing') state === 'paused' ? resume() : start();
    });
    window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur', pause);
    window.addEventListener('pony:pause', pause);
    window.addEventListener('pony:back', event => {
      if (alphabetAlbum.open) { event.preventDefault(); alphabetAlbum.close(); return; }
      if (navigationHelp.open) { event.preventDefault(); navigationHelp.close(); return; }
      if (gameMenu.open) { event.preventDefault(); closeMenu(); return; }
      if (state === 'playing') { event.preventDefault(); pause(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

    function update(dt) {
      player.invulnerable = Math.max(0, (player.invulnerable || 0) - dt);
      let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
      let dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
      if (dx === 0 && dy === 0 && pointerTarget.active) {
        const tx = pointerTarget.x - player.x, ty = pointerTarget.y - player.y;
        const remaining = Math.hypot(tx, ty);
        if (remaining < .01) pointerTarget.active = false;
        else { const divisor = Math.max(remaining, CONFIG.playerSpeed * dt); dx = tx / divisor; dy = ty / divisor; }
      }
      const length = Math.max(1, Math.hypot(dx, dy));
      player.x = clamp(player.x + dx / length * CONFIG.playerSpeed * dt, CONFIG.playerRadius, CONFIG.width - CONFIG.playerRadius);
      player.y = clamp(player.y + dy / length * CONFIG.playerSpeed * dt, CONFIG.playerRadius, CONFIG.height - CONFIG.playerRadius);
      for (const e of enemies) {
        e.squashX = Math.max(0, e.squashX - dt);
        e.squashY = Math.max(0, e.squashY - dt);
        e.x += e.vx * dt; e.y += e.vy * dt;
        const r = CONFIG.enemyRadius;
        // Reflect the overshoot instead of pinning to the wall, preserving speed.
        if (e.x < r) { e.x = 2 * r - e.x; e.vx = Math.abs(e.vx); e.squashX = .24; }
        else if (e.x > CONFIG.width - r) { e.x = 2 * (CONFIG.width - r) - e.x; e.vx = -Math.abs(e.vx); e.squashX = .24; }
        if (e.y < r) { e.y = 2 * r - e.y; e.vy = Math.abs(e.vy); e.squashY = .24; }
        else if (e.y > CONFIG.height - r) { e.y = 2 * (CONFIG.height - r) - e.y; e.vy = -Math.abs(e.vy); e.squashY = .24; }
        if (player.invulnerable <= 0 && touchesPrincess(e)) {
          handleLionTouch(e); return;
        }
        // React on contact entry, not every simulation step; unicorns remain collectible.
        const contacts = new Set(unicorns.filter(u => distance(e, u) < CONFIG.enemyRadius * .75 + CONFIG.unicornRadius * .65));
        if ([...contacts].some(u => !e.unicornContacts?.has(u))) react(e, 'surprised');
        e.unicornContacts = contacts;
      }
      updateLearning(dt);
      for (let i = 0; i < unicorns.length; i++) {
        if (distance(unicorns[i], player) <= CONFIG.unicornRadius + CONFIG.playerRadius) {
          playSfx('collect'); react(player, 'happy');
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
          score++; saveBest(); recordUnicornForLife();
          if (collected.dropped) { unicorns.splice(i, 1); i--; }
          else unicorns[i] = spawnUnicorn();
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
      const remainingSecond = Math.ceil(CONFIG.duration - elapsed - 1e-8);
      if (remainingSecond > 0 && remainingSecond <= 3 && remainingSecond < countdownSecond) {
        countdownSecond = remainingSecond; playSfx('countdown');
      }
      if (elapsed + 1e-8 >= nextSpawn) { spawnEnemy(); nextSpawn += CONFIG.spawnEvery; }
      updateHUD();
    }
    // Cache visible pixels once. Transparent PNG padding must not count as contact.
    function makeCollisionMask(image) {
      const size = 128;
      const surface = document.createElement('canvas');
      surface.width = size; surface.height = size;
      const context = surface.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, size, size);
      try {
        return { size, pixels: context.getImageData(0, 0, size, size).data };
      } catch (_) { return null; } // Restricted file URLs can prevent pixel reads.
    }
    function lionPose(enemy) {
      const t = elapsed * 35 + enemy.phase;
      const spring = remaining => remaining > 0 ? Math.cos((.24 - remaining) * 25) * (remaining / .24) * .24 : 0;
      const sx = spring(enemy.squashX), sy = spring(enemy.squashY);
      const pulse = reducedMotion.matches ? 0 : Math.sin((1 - (enemy.reactionLife || 0) / .65) * Math.PI * 3) * (enemy.reactionLife || 0) / .65 * .16;
      return {
        x: clamp(enemy.x + Math.sin(t) * .8, CONFIG.enemyRadius, CONFIG.width - CONFIG.enemyRadius),
        y: clamp(enemy.y + Math.cos(t * 1.3) * .6, CONFIG.enemyRadius, CONFIG.height - CONFIG.enemyRadius),
        angle: Math.sin(t * .8) * .065 + pulse * .6, sx: 1 - sx + sy * .5 + pulse, sy: 1 - sy + sx * .5 - pulse
      };
    }
    function touchesPrincess(enemy) {
      if (distance(enemy, player) > (CONFIG.playerRadius + CONFIG.enemyRadius) * 1.5) return false;
      const queen = collisionMasks.queen, lion = collisionMasks.lion;
      const pose = lionPose(enemy), princess = princessPose();
      if (!queen || !lion) {
        // Conservative body ellipse when the browser disallows image pixel access.
        const dx = (pose.x - princess.x) / (CONFIG.playerRadius * .56 + CONFIG.enemyRadius * .62);
        const dy = (pose.y - princess.y - CONFIG.playerRadius * .15) / (CONFIG.playerRadius * .72 + CONFIG.enemyRadius * .75);
        return dx * dx + dy * dy < 1;
      }
      const image = sprites.lion;
      const width = CONFIG.enemyRadius * 2 * image.naturalWidth / Math.max(image.naturalWidth, image.naturalHeight) * pose.sx;
      const height = CONFIG.enemyRadius * 2 * image.naturalHeight / Math.max(image.naturalWidth, image.naturalHeight) * pose.sy;
      const cos = Math.cos(pose.angle), sin = Math.sin(pose.angle);
      for (let y = 0; y < lion.size; y++) for (let x = 0; x < lion.size; x++) {
        if (lion.pixels[(y * lion.size + x) * 4 + 3] < 128) continue;
        const lx = ((x + .5) / lion.size - .5) * width;
        const ly = ((y + .5) / lion.size - .5) * height;
        const wx = pose.x + lx * cos - ly * sin - princess.x;
        const wy = pose.y + lx * sin + ly * cos - princess.y;
        const pc = Math.cos(princess.angle), ps = Math.sin(princess.angle);
        const qx = Math.floor(((wx * pc + wy * ps) / (CONFIG.playerRadius * 2 * princess.sx) + .5) * queen.size);
        const qy = Math.floor(((-wx * ps + wy * pc) / (CONFIG.playerRadius * 2 * princess.sy) + .5) * queen.size);
        if (qx >= 0 && qx < queen.size && qy >= 0 && qy < queen.size && queen.pixels[(qy * queen.size + qx) * 4 + 3] >= 128) return true;
      }
      return false;
    }
    // Only unicorns glow to highlight collectibles.
    const ROLE_GLOW = { unicorn: '#ff57b2' };
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
    function princessPose() {
      const life = player.reactionLife || 0, progress = 1 - life / .65;
      const wave = life > 0 && !reducedMotion.matches ? Math.sin(progress * Math.PI * 3) * life / .65 : 0;
      const happy = player.reaction === 'happy';
      return { x: player.x, y: Math.max(CONFIG.playerRadius, player.y - (happy ? Math.abs(wave) * CONFIG.playerRadius * .18 : 0)),
        angle: wave * (happy ? .1 : .22), sx: 1 + wave * .12, sy: 1 - wave * .12 };
    }
    function drawReaction(object, radius) {
      if (!(object.reactionLife > 0)) return;
      const symbols = { happy: '🦄 +1', life: '♥ +1', hurt: '✦ ! ✦', thinking: '…?', surprised: '!?', caught: '!' };
      ctx.save();
      ctx.globalAlpha = Math.min(1, object.reactionLife * 5);
      ctx.font = `bold ${Math.max(16, radius * .6)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = '#fffdf9'; ctx.fillStyle = object.reaction === 'happy' ? '#bc317b' : '#8047a0';
      const x = clamp(object.x, 32, CONFIG.width - 32), y = Math.max(16, object.y - radius - 12);
      ctx.fillStyle = ['happy', 'life'].includes(object.reaction) ? '#bc317b' : '#8047a0';
      ctx.strokeText(symbols[object.reaction], x, y); ctx.fillText(symbols[object.reaction], x, y);
      ctx.restore();
    }
    function animateReactions(dt) {
      if (state !== 'playing' && state !== 'over') return;
      for (const object of [player, ...enemies]) object.reactionLife = Math.max(0, (object.reactionLife || 0) - dt);
      if (defeatReveal > 0) {
        defeatReveal = Math.max(0, defeatReveal - dt);
        if (!defeatReveal) showPanel();
      }
    }
    // Navigation hints use CSS-pixel sizes, so they stay legible on phones.
    // Draw beneath characters: this is a direction guide, not a safe-route prediction.
    function drawPointerFeedback() {
      if (state !== 'playing') return;
      const unit = CONFIG.width / Math.max(1, layoutWidth);
      if (touchMark.life > 0) {
        const progress = 1 - touchMark.life / POINTER_FEEDBACK.rippleDuration;
        const ease = 1 - (1 - progress) ** 3;
        drawSprite('touchShine', touchMark.x, touchMark.y,
          (reducedMotion.matches ? 24 : 16 + ease * 14) * unit, 0, (1 - progress) ** 2 * .55);
      }
      if (pointerTarget.fade <= 0) return;
      const { x, y } = pointerTarget;
      const dx = x - player.x, dy = y - player.y, length = Math.hypot(dx, dy);
      const fade = pointerTarget.fade / POINTER_FEEDBACK.arrivalFade;
      const opacity = fade * fade * (3 - 2 * fade);
      const start = CONFIG.playerRadius * .75, end = length - 24 * unit;
      // Sparse, stationary sparkles suggest direction without resembling collectibles.
      const count = Math.min(6, Math.floor((end - start) / (34 * unit)));
      ctx.save();
      // Alpha-shaped violet shadow separates pale artwork from bright scenery.
      // Canvas shadow blur uses backing pixels rather than the world transform.
      const pixelsPerCssPixel = canvas.width / Math.max(1, layoutWidth);
      ctx.shadowColor = 'rgba(76, 35, 112, .95)';
      ctx.shadowBlur = 2.5 * pixelsPerCssPixel;
      ctx.shadowOffsetY = .75 * pixelsPerCssPixel;
      for (let i = 0; i < count; i++) {
        const along = (start + (end - start) * (i + .5) / count) / length;
        drawSprite('sparkles', player.x + dx * along, player.y + dy * along,
          (16 + i / count * 5) * unit, 0, opacity * .9);
      }
      ctx.restore();
      // Keep the destination steady during drags; only the arrival fades out.
      drawSprite('touchShine', x, y, 23 * unit, 0, opacity * .22);
      drawSprite('navigationStar', x, y, 13 * unit, 0, opacity * .72);
    }
    function animatePointerFeedback(dt) {
      if (state !== 'playing') return;
      touchMark.life = Math.max(0, touchMark.life - dt);
      if (!pointerTarget.active) pointerTarget.fade = Math.max(0, pointerTarget.fade - dt);
    }
    function drawLearningTokens() {
      if (state !== 'playing') return;
      const radius = learningRadius();
      for (const token of learningTokens) {
        const bob = reducedMotion.matches ? 0 : Math.sin(elapsed * 3 + token.phase) * 3;
        const bounce = token.bounce > 0 && !reducedMotion.matches ? Math.sin((.55 - token.bounce) * 24) * token.bounce * 10 : 0;
        const y = token.y + bob - Math.abs(bounce);
        ctx.save();
        const halo = ctx.createRadialGradient(token.x, y, radius * .2, token.x, y, radius * 1.3);
        halo.addColorStop(0, token.highlight ? '#fff3a6dd' : '#e5d4ffcc');
        halo.addColorStop(.65, token.highlight ? '#ffd75a80' : '#ffffff70');
        halo.addColorStop(1, '#ffffff00');
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(token.x, y, radius * 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        drawSprite(token.sprite, token.x, y, radius, 0, token.cooldown > 0 ? .58 : 1);
      }
    }
    function draw() {
      ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
      if (!assetsReady || navigationHelp.open) return;
      drawPointerFeedback();
      drawLearningTokens();
      for (const unicorn of unicorns) {
        // A continuous 2-second turn, with independent phases for each collectible.
        const flip = Math.cos(elapsed * Math.PI + unicorn.phase);
        drawSprite('unicorn', unicorn.x, unicorn.y, CONFIG.unicornRadius, 0, 1, flip);
      }
      for (const enemy of enemies) {
        const pose = lionPose(enemy);
        drawSprite('lion', pose.x, pose.y, CONFIG.enemyRadius, pose.angle, 1, pose.sx, pose.sy);
        drawReaction(enemy, CONFIG.enemyRadius);
      }
      for (const pickup of pickups) {
        const fade = pickup.life / .5;
        drawSprite('unicorn', pickup.x, pickup.y - (1 - fade) * 16,
          CONFIG.unicornRadius * (.55 + fade * .45), 0, fade, pickup.flip);
      }
      const princess = princessPose();
      const queenOpacity = player.invulnerable > 0 && !reducedMotion.matches && Math.floor(player.invulnerable * 8) % 2 ? .48 : 1;
      drawSprite('queen', princess.x, princess.y, CONFIG.playerRadius, princess.angle, queenOpacity, princess.sx, princess.sy);
      drawReaction(player, CONFIG.playerRadius);
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
      animateReactions(delta); animatePointerFeedback(delta);
      draw(); requestAnimationFrame(frame);
    }
    applyLanguage();
    fitToViewport();
    resetWorld();
    if (!navigationHidden()) openNavigationHelp();
    const layoutObserver = new ResizeObserver(fitToViewport);
    layoutObserver.observe(arena);
    layoutObserver.observe(panel);
    window.addEventListener('resize', fitToViewport);
    requestAnimationFrame(frame);
    assetsLoaded.then(() => {
      assetsReady = true;
      ui.action.disabled = false;
      renderPanel();
      fitToViewport();
    }).catch(() => {
      assetsFailed = true; renderPanel();
    });
