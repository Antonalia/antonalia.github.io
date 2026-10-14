import {
  AimRound, HORIZONTAL_FOV, TARGET_DEPTH, TARGET_RADIUS,
  radiansPerCount, targetPosition, validSensitivity, verticalFov
} from './aim-core.mjs';

// Minimal camera/orb trainer inspired by VALOTRAINER, Copyright (c) 2026 Anas T.
// See licenses/VALOTRAINER.txt for the complete MIT notice.
const $ = id => document.getElementById(id);
const arena = $('arena');
const menu = $('menu');
const start = $('start');
const sensField = $('sensitivity');
const durationField = $('duration');
const status = $('status');
const storageKey = 'lele:aim:settings:v1';

let sensitivity = 0.35;
let duration = 60;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && validSensitivity(saved.sensitivity)) sensitivity = saved.sensitivity;
  if (saved && [30, 60].includes(saved.duration)) duration = saved.duration;
} catch { /* Storage is optional; training still works in private browsers. */ }
sensField.value = sensitivity;
durationField.value = duration;

if (!arena.requestPointerLock || !matchMedia('(any-pointer: fine)').matches) {
  $('start-label').textContent = '请用电脑和鼠标打开';
  status.textContent = '练枪需要鼠标和浏览器指针锁定，触屏设备暂不支持。';
} else {
  try {
    const THREE = await import('./vendor/three.module.min.js');
    initialize(THREE);
  } catch (error) {
    start.disabled = true;
    $('start-label').textContent = '暂时无法开始';
    status.textContent = '练枪场加载失败，请刷新页面，并检查浏览器是否支持 WebGL。';
    console.error('Aim trainer initialization failed:', error);
  }
}

function initialize(THREE) {
  const renderer = new THREE.WebGLRenderer({ canvas: arena, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10171e');
  scene.fog = new THREE.Fog('#10171e', 16, 40);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 80);
  camera.position.set(0, 3.2, 0);
  camera.rotation.order = 'YXZ';
  scene.add(new THREE.HemisphereLight(0xcfe6f6, 0x293039, 2.3));
  const light = new THREE.DirectionalLight(0xffffff, 2.1);
  light.position.set(-4, 8, 2);
  scene.add(light);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60),
    new THREE.MeshLambertMaterial({ color: 0x141e27 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new THREE.GridHelper(60, 60, 0x34434f, 0x263440);
  grid.position.y = 0.01;
  scene.add(grid);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 14),
    new THREE.MeshLambertMaterial({ color: 0x18232c }));
  wall.position.set(0, 7, -14);
  scene.add(wall);
  const wallGrid = new THREE.GridHelper(40, 40, 0x34434f, 0x263440);
  wallGrid.rotation.x = Math.PI / 2;
  wallGrid.position.set(0, 7, -13.98);
  scene.add(wallGrid);

  const geometry = new THREE.SphereGeometry(TARGET_RADIUS, 18, 12);
  const material = new THREE.MeshLambertMaterial({ color: 0xff6673, emissive: 0x5a1521, emissiveIntensity: 0.32 });
  const targets = Array.from({ length: 3 }, () => {
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return mesh;
  });
  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  const intersections = [];
  let round = new AimRound(duration);
  let yaw = 0;
  let pitch = 0;
  let frameId = 0;
  let lockPending = false;
  let lockRequest = 0;
  let promiseLock = false;
  let rawAvailable = true;
  let inputMode = 'unknown';
  let hitUntil = 0;
  let hudSecond = -1;
  let disposed = false;

  function spawn(target, previous = null) {
    const others = targets.filter(other => other !== target).map(other => ({ x: other.position.x, y: other.position.y - 3.2 }));
    const position = targetPosition(others, previous, camera.aspect);
    target.position.set(position.x, position.y + 3.2, -TARGET_DEPTH);
    target.updateMatrixWorld();
  }

  function resetTargets() {
    yaw = 0;
    pitch = 0;
    camera.rotation.set(0, 0, 0, 'YXZ');
    hitUntil = 0;
    $('crosshair').classList.remove('hit');
    targets[0].position.set(0, 3.2, -TARGET_DEPTH);
    targets[1].position.set(-3.2, 4.6, -TARGET_DEPTH);
    targets[2].position.set(3.2, 2, -TARGET_DEPTH);
    spawn(targets[1]);
    spawn(targets[2]);
    scene.updateMatrixWorld(true);
  }

  function resize() {
    camera.aspect = Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight);
    camera.fov = verticalFov(camera.aspect);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    targets.forEach(target => spawn(target));
    renderer.render(scene, camera);
  }

  function updateHud(force = false) {
    const second = Math.ceil(round.remainingMs / 1000);
    if (force || second !== hudSecond) {
      $('time-left').innerHTML = `${second}<span class="unit">s</span>`;
      $('hud').classList.toggle('ending', second <= 10);
      hudSecond = second;
    }
    if (force) {
      $('hit-count').textContent = round.hits;
      $('accuracy').innerHTML = `${round.accuracy}<span class="unit">%</span>`;
    }
  }

  function showMenu() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    document.body.classList.remove('playing');
    menu.hidden = false;
    $('hud').hidden = true;
    $('crosshair').hidden = true;
    $('play-hint').hidden = true;
    const paused = round.state === 'paused';
    const finished = round.state === 'finished';
    $('menu-title').innerHTML = paused ? '稍作休息，<br><span>手感还在。</span>' : finished ? '热身完成。<br><span>再来一局？</span>' : '瞄准，<br><span>下一颗。</span>';
    $('menu-description').textContent = paused ? '本局已暂停，点击继续练习。计时会从暂停处恢复。' : finished ? '每一次稳稳命中，都算进步。' : '三个小球，一次专注。移动鼠标瞄准，左键命中后刷新目标。';
    $('results').hidden = !paused && !finished;
    $('result-hits').textContent = round.hits;
    $('result-shots').textContent = round.shots;
    $('result-accuracy').textContent = `${round.accuracy}%`;
    $('result-speed').textContent = round.hitsPerMinute;
    sensField.disabled = paused;
    durationField.disabled = paused;
    $('restart').hidden = !paused;
    $('restart').disabled = false;
    start.disabled = false;
    $('start-label').textContent = paused ? '继续练习' : finished ? '再来一局' : '开始练习';
    status.textContent = '';
    renderer.render(scene, camera);
    if (paused || finished) start.focus({ preventScroll: true });
  }

  function finish() {
    showMenu();
    if (document.pointerLockElement === arena) document.exitPointerLock();
  }

  function animate(now) {
    if (disposed || round.state !== 'running') return;
    round.update(now);
    updateHud();
    if (round.state === 'finished') { finish(); return; }
    $('crosshair').classList.toggle('hit', now < hitUntil);
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }

  function play() {
    if (round.state === 'paused') round.resume(performance.now());
    else {
      round = new AimRound(duration);
      round.start(performance.now());
      resetTargets();
    }
    menu.hidden = true;
    $('hud').hidden = false;
    $('crosshair').hidden = false;
    $('play-hint').hidden = false;
    document.body.classList.add('playing');
    const inputLabel = inputMode === 'raw' ? '原始输入' : inputMode === 'adjusted' ? '普通输入' : '浏览器输入';
    $('input-status').textContent = `${HORIZONTAL_FOV}° HFOV · VAL Sens ${sensitivity.toFixed(3)} · ${inputLabel}`;
    $('input-note').textContent = inputMode === 'raw' ? '本浏览器已启用原始鼠标输入。' : '当前使用浏览器鼠标输入，手感可能受系统鼠标加速影响。';
    updateHud(true);
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(animate);
  }

  function lockFailure(error, request = lockRequest) {
    if (request !== lockRequest || !lockPending) return;
    lockPending = false;
    start.disabled = false;
    $('restart').disabled = false;
    status.textContent = '未能锁定鼠标。请再点击一次开始，并允许浏览器锁定指针。';
    console.warn('Pointer lock unavailable:', error);
  }

  function acceptLock(request) {
    if (request !== lockRequest || !lockPending) {
      // A late request must not start a round or release a newer active session.
      if (round.state !== 'running' && document.pointerLockElement === arena) document.exitPointerLock();
      return;
    }
    if (document.hidden || disposed) {
      lockPending = false;
      lockRequest += 1;
      start.disabled = disposed;
      $('restart').disabled = false;
      if (document.pointerLockElement === arena) document.exitPointerLock();
      return;
    }
    lockPending = false;
    play();
  }

  function requestLock(raw = rawAvailable) {
    const request = ++lockRequest;
    lockPending = true;
    promiseLock = false;
    start.disabled = true;
    $('restart').disabled = true;
    status.textContent = '';
    const failed = error => {
      if (request !== lockRequest || !lockPending) return;
      if (raw && (error?.name === 'NotSupportedError' || error?.name === 'TypeError')) {
        rawAvailable = false;
        requestLock(false);
      } else lockFailure(error, request);
    };
    try {
      inputMode = raw ? 'raw' : 'adjusted';
      const result = raw ? arena.requestPointerLock({ unadjustedMovement: true }) : arena.requestPointerLock();
      if (result?.then) {
        promiseLock = true;
        result.then(() => acceptLock(request), failed);
      }
      else inputMode = 'unknown';
    } catch (error) { failed(error); }
  }

  $('settings').addEventListener('submit', event => {
    event.preventDefault();
    if (lockPending || disposed) return;
    if (round.state !== 'paused') {
      const value = Number(sensField.value);
      if (!validSensitivity(value)) {
        status.textContent = '请填写 0.001–10 之间的 VAL 灵敏度。';
        sensField.focus();
        return;
      }
      sensitivity = value;
      duration = durationField.value === '30' ? 30 : 60;
      try { localStorage.setItem(storageKey, JSON.stringify({ sensitivity, duration })); } catch { /* Optional. */ }
    }
    requestLock();
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === arena) {
      // Promise success carries the request ID; an acquire event alone does not.
      if (promiseLock || round.state === 'running') return;
      acceptLock(lockRequest);
    } else if (round.state === 'running') {
      round.pause(performance.now());
      showMenu();
    }
  });
  document.addEventListener('pointerlockerror', () => {
    // Promise-based errors are handled by requestLock, including raw-input fallback.
    if (lockPending && !promiseLock) {
      const request = lockRequest;
      setTimeout(() => { if (document.pointerLockElement !== arena) lockFailure(undefined, request); }, 0);
    }
  });
  document.addEventListener('mousemove', event => {
    if (round.state !== 'running' || document.pointerLockElement !== arena) return;
    const factor = radiansPerCount(sensitivity);
    yaw = (yaw - event.movementX * factor) % (Math.PI * 2);
    pitch = Math.max(-85 * Math.PI / 180, Math.min(85 * Math.PI / 180, pitch - event.movementY * factor));
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  });
  document.addEventListener('mousedown', event => {
    if (event.button !== 0 || round.state !== 'running' || document.pointerLockElement !== arena) return;
    event.preventDefault();
    camera.updateMatrixWorld();
    raycaster.setFromCamera(center, camera);
    intersections.length = 0;
    raycaster.intersectObjects(targets, false, intersections);
    const hit = intersections[0]?.object;
    if (!round.shoot(Boolean(hit), performance.now())) { finish(); return; }
    if (hit) {
      const previous = { x: hit.position.x, y: hit.position.y - 3.2 };
      spawn(hit, previous);
      hitUntil = performance.now() + 100;
    }
    updateHud(true);
  });
  document.addEventListener('keydown', event => {
    if (event.code !== 'KeyR' || event.repeat || round.state !== 'running' || document.pointerLockElement !== arena) return;
    event.preventDefault();
    round.start(performance.now());
    resetTargets();
    updateHud(true);
  });
  function pauseForFocus() {
    if (lockPending) {
      lockPending = false;
      lockRequest += 1;
      start.disabled = disposed;
      $('restart').disabled = false;
    }
    if (round.state !== 'running') return;
    round.pause(performance.now());
    showMenu();
    if (document.pointerLockElement === arena) document.exitPointerLock();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseForFocus(); });
  window.addEventListener('blur', pauseForFocus);
  $('restart').textContent = '结束本局，返回设置';
  $('restart').addEventListener('click', () => {
    if (lockPending) return;
    round = new AimRound(duration);
    resetTargets();
    showMenu();
  });
  arena.addEventListener('contextmenu', event => event.preventDefault());
  arena.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    pauseForFocus();
    disposed = true;
    cancelAnimationFrame(frameId);
    start.disabled = true;
    $('restart').hidden = true;
    status.textContent = '图形渲染已中断，请刷新页面后继续练习。';
  });
  window.addEventListener('resize', resize);
  resize();
  resetTargets();
  showMenu();
}
