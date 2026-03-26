import * as THREE from 'three';
import { Car } from './car';
import { getTrackCurve } from '../world/track';

const LOOKAHEAD_DIST = 2.5;   // metres ahead on the curve
const STEERING_GAIN  = 2.5;
const THROTTLE_BASE  = 0.85;
const THROTTLE_BRAKE = 0.3;   // slow down on tight corners

const curve = getTrackCurve();

/**
 * Pure-pursuit autopilot for the Silverstone-style track.
 * Finds the nearest point on the CatmullRom curve, then looks LOOKAHEAD_DIST
 * ahead and steers toward that target.
 */
export function autopilotControl(car: Car): void {
  const pos = car.mesh.position;

  // ── 1. Find closest point on curve ──────────────────────────────────────
  let bestT  = 0;
  let bestD2 = Infinity;
  const SAMPLES = 400;

  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = curve.getPoint(t);
    const d2 = (p.x - pos.x) ** 2 + (p.z - pos.z) ** 2;
    if (d2 < bestD2) { bestD2 = d2; bestT = t; }
  }

  // ── 2. Step ahead by LOOKAHEAD_DIST along the curve ─────────────────────
  const totalLen = curve.getLength();
  const lookaheadT = (bestT + LOOKAHEAD_DIST / totalLen) % 1;
  const target = curve.getPoint(lookaheadT);

  // ── 3. Steer toward target ───────────────────────────────────────────────
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const desiredHeading = Math.atan2(dx, dz);

  let err = desiredHeading - car.mesh.rotation.y;
  while (err >  Math.PI) err -= 2 * Math.PI;
  while (err < -Math.PI) err += 2 * Math.PI;

  car.steering = Math.max(-1.2, Math.min(1.2, -err * STEERING_GAIN));

  // ── 4. Throttle: slow down on sharp corners ──────────────────────────────
  const absSteering = Math.abs(car.steering);
  car.throttle = absSteering > 0.6
    ? THROTTLE_BRAKE
    : THROTTLE_BASE - absSteering * 0.4;
}
