'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = import('../source/aim/aim-core.mjs');

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test('camera projection keeps 103 degrees horizontally across portrait and ultrawide viewports', async () => {
  const { verticalFov } = await core;
  for (const aspect of [9 / 16, 1, 4 / 3, 16 / 9, 21 / 9, 32 / 9, 24]) {
    const verticalDegrees = verticalFov(aspect);
    assert.ok(Number.isFinite(verticalDegrees) && verticalDegrees > 0 && verticalDegrees < 180);
    const horizontalDegrees = 2 * Math.atan(Math.tan(verticalDegrees * Math.PI / 360) * aspect) * 180 / Math.PI;
    close(horizontalDegrees, 103);
  }
  close(verticalFov(16 / 9), 70.5328, 1e-6);
});

test('VAL sensitivity converts mouse counts to angles without a second DPI multiplier', async () => {
  const { radiansPerCount } = await core;
  const radians = radiansPerCount(0.35);
  close(400 * radians * 180 / Math.PI, 9.8);
  close(radiansPerCount(0.7), 2 * radians);
  const countsPerTurn = 360 / (0.07 * 0.35);
  close(countsPerTurn * radians, 2 * Math.PI);
  const centimetersPerTurnAt800Dpi = countsPerTurn / 800 * 2.54;
  close(centimetersPerTurnAt800Dpi, 46.6530612244898);
  // An integer count nearest a complete turn remains within one count of 360 degrees.
  close(14694 * radians * 180 / Math.PI, 360, 0.07 * 0.35);
});

test('sensitivity validation rejects missing, nonnumeric and out-of-range settings', async () => {
  const { validSensitivity } = await core;
  for (const value of [0.001, 0.35, 10]) assert.equal(validSensitivity(value), true);
  for (const value of [0, -0.35, 0.0009, 10.001, NaN, Infinity, '0.35', '', null, undefined]) {
    assert.equal(validSensitivity(value), false, String(value));
  }
});

test('pausing stops the timer and rejects shots until the same round resumes', async () => {
  const { AimRound } = await core;
  const round = new AimRound(30);
  assert.equal(round.state, 'ready');
  assert.equal(round.shoot(true, 500), false);
  assert.equal(round.remainingMs, 30000);
  round.start(1000);
  assert.equal(round.shoot(true, 2000), true);
  round.pause(8500);
  assert.equal(round.state, 'paused');
  assert.equal(round.elapsedMs, 7500);
  round.update(80000);
  round.pause(80000);
  assert.equal(round.shoot(true, 80000), false);
  assert.equal(round.remainingMs, 22500);
  assert.equal(round.hits, 1);
  assert.equal(round.shots, 1);
  round.resume(90000);
  round.update(91250);
  assert.equal(round.state, 'running');
  assert.equal(round.elapsedMs, 8750);
  assert.equal(round.remainingMs, 21250);
  round.pause(92000);
  round.resume(100000);
  round.update(100500);
  assert.equal(round.elapsedMs, 10000);
});

test('the exact deadline finishes a round and rejects shots before the next animation frame', async () => {
  const { AimRound } = await core;
  for (const lateTime of [31000, 31001, 1000000]) {
    const round = new AimRound(30);
    round.start(1000);
    assert.equal(round.shoot(true, 30999), true);
    assert.equal(round.shoot(true, lateTime), false);
    assert.equal(round.state, 'finished');
    assert.equal(round.elapsedMs, 30000);
    assert.equal(round.remainingMs, 0);
    assert.equal(round.hits, 1);
    assert.equal(round.shots, 1);
    round.resume(2000000);
    round.pause(2000000);
    round.update(2000000);
    assert.equal(round.state, 'finished');
    assert.equal(round.shoot(false, 2000000), false);
    assert.equal(round.shots, 1);
  }
});

test('resumed rounds finish after active time only and restart clears prior results', async () => {
  const { AimRound } = await core;
  const round = new AimRound(60);
  round.start(1000);
  round.shoot(true, 2000);
  round.pause(21000);
  round.resume(100000);
  round.update(139999);
  assert.equal(round.remainingMs, 1);
  assert.equal(round.shoot(false, 140000), false);
  assert.equal(round.state, 'finished');
  round.start(200000);
  assert.equal(round.state, 'running');
  assert.equal(round.elapsedMs, 0);
  assert.equal(round.remainingMs, 60000);
  assert.equal(round.hits, 0);
  assert.equal(round.shots, 0);
  assert.equal(round.accuracy, 0);
  assert.equal(round.hitsPerMinute, 0);
  round.update(200500);
  assert.equal(round.elapsedMs, 500);
});

test('accuracy counts both misses and hits while speed uses active elapsed time', async () => {
  const { AimRound } = await core;
  const round = new AimRound(30);
  round.start(1000);
  assert.equal(round.accuracy, 0);
  assert.equal(round.hitsPerMinute, 0);
  round.shoot(false, 2000);
  assert.equal(round.accuracy, 0);
  round.shoot(true, 3000);
  assert.equal(round.accuracy, 50);
  round.shoot(true, 4000);
  assert.equal(round.hits, 2);
  assert.equal(round.shots, 3);
  assert.equal(round.accuracy, 67);
  round.pause(16000);
  assert.equal(round.hitsPerMinute, 8);
  round.update(999999);
  assert.equal(round.hitsPerMinute, 8);
});

test('successive target spawns stay visible, separate and displaced from the previous position', async () => {
  const { targetPosition, TARGET_DEPTH, TARGET_RADIUS } = await core;
  for (const aspect of [9 / 16, 1, 16 / 9, 32 / 9, 6, 24]) {
    const random = seededRandom(7);
    const targets = [];
    const visibleHalfWidth = TARGET_DEPTH * Math.tan(103 * Math.PI / 360);
    const visibleHalfHeight = visibleHalfWidth / aspect;
    const assertPosition = (position, others, previous) => {
      assert.ok(Math.abs(position.x) <= 5.2);
      assert.ok(Math.abs(position.x) + TARGET_RADIUS <= visibleHalfWidth);
      assert.ok(Math.abs(position.y) + TARGET_RADIUS <= visibleHalfHeight,
        `target at y=${position.y} clips for aspect=${aspect}`);
      for (const other of others) assert.ok(Math.hypot(position.x - other.x, position.y - other.y) > 1.05);
      if (previous) assert.ok(Math.hypot(position.x - previous.x, position.y - previous.y) > 1.2);
    };
    for (let index = 0; index < 3; index += 1) {
      const position = targetPosition(targets, null, aspect, random);
      assertPosition(position, targets, null);
      targets.push(position);
    }
    for (let index = 0; index < 300; index += 1) {
      const slot = index % 3;
      const previous = targets[slot];
      const others = targets.filter((_, otherSlot) => otherSlot !== slot);
      const position = targetPosition(others, previous, aspect, random);
      assertPosition(position, others, previous);
      targets[slot] = position;
    }
  }
});

test('a repeating RNG falls back after bounded attempts and still respects target clearance', async () => {
  const { targetPosition } = await core;
  const others = [{ x: 0, y: 0 }, { x: 2.6, y: 0 }];
  const previous = { x: -2.6, y: 0 };
  let calls = 0;
  const position = targetPosition(others, previous, 16 / 9, () => { calls += 1; return 0.5; });
  assert.equal(calls, 96);
  assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y));
  for (const other of others) assert.ok(Math.hypot(position.x - other.x, position.y - other.y) > 1.05);
  assert.ok(Math.hypot(position.x - previous.x, position.y - previous.y) > 1.2);
});
