// Camera/input conventions adapted from VALOTRAINER (MIT).
// Upstream attribution and full notices: ./licenses/ and ./THIRD_PARTY.txt.
export const HORIZONTAL_FOV = 103;
export const VAL_YAW = 0.07;
export const TARGET_RADIUS = 0.26;
export const TARGET_DEPTH = 12;

export function verticalFov(aspect) {
  return 2 * Math.atan(Math.tan(HORIZONTAL_FOV * Math.PI / 360) / aspect) * 180 / Math.PI;
}

export function radiansPerCount(sensitivity) {
  return sensitivity * VAL_YAW * Math.PI / 180;
}

export function validSensitivity(value) {
  return Number.isFinite(value) && value >= 0.001 && value <= 10;
}

// Keep all three stationary targets separate and inside the neutral camera view.
export function targetPosition(others, previous, aspect, random = Math.random) {
  const halfHeight = Math.max(0, Math.min(2.2,
    TARGET_DEPTH * Math.tan(HORIZONTAL_FOV * Math.PI / 360) / aspect * 0.64 - TARGET_RADIUS));
  const fits = point => others.every(other => Math.hypot(point.x - other.x, point.y - other.y) > 1.05)
    && (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 1.2);
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const point = { x: (random() * 2 - 1) * 5.2, y: (random() * 2 - 1) * halfHeight };
    if (fits(point)) return point;
  }
  for (const y of [-halfHeight, 0, halfHeight]) {
    for (const x of [-5.2, -2.6, 0, 2.6, 5.2]) {
      if (fits({ x, y })) return { x, y };
    }
  }
  return { x: 5.2, y: halfHeight };
}

export class AimRound {
  constructor(duration = 60) {
    this.durationMs = duration * 1000;
    this.state = 'ready';
    this.elapsedMs = 0;
    this.hits = 0;
    this.shots = 0;
  }

  start(now) {
    this.elapsedMs = 0;
    this.elapsedBefore = 0;
    this.segmentStart = now;
    this.hits = 0;
    this.shots = 0;
    this.state = 'running';
  }

  update(now) {
    if (this.state !== 'running') return;
    this.elapsedMs = Math.min(this.durationMs,
      this.elapsedBefore + Math.max(0, now - this.segmentStart));
    if (this.elapsedMs >= this.durationMs) this.state = 'finished';
  }

  pause(now) {
    this.update(now);
    if (this.state !== 'running') return;
    this.elapsedBefore = this.elapsedMs;
    this.state = 'paused';
  }

  resume(now) {
    if (this.state !== 'paused') return;
    this.segmentStart = now;
    this.state = 'running';
  }

  shoot(hit, now) {
    this.update(now);
    if (this.state !== 'running') return false;
    this.shots += 1;
    if (hit) this.hits += 1;
    return true;
  }

  get remainingMs() { return this.durationMs - this.elapsedMs; }
  get accuracy() { return this.shots ? Math.round(this.hits / this.shots * 100) : 0; }
  get hitsPerMinute() { return this.elapsedMs ? Math.round(this.hits * 60000 / this.elapsedMs) : 0; }
}
