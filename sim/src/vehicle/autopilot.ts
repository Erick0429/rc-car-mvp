import { Car } from './car';

const TRACK_RADIUS = 5.0;
const LOOKAHEAD_ANGLE = Math.PI / 5; // ~36° ahead on circle
const STEERING_GAIN = 3.5;

/**
 * Pure-pursuit style autopilot for a circular track centered at origin.
 * Picks a lookahead point on the circle and steers toward it.
 */
export function autopilotControl(car: Car): void {
  const x = car.mesh.position.x;
  const z = car.mesh.position.z;

  // Angle of car's current position around the circle (clockwise increases)
  const carAngle = Math.atan2(x, z);
  const targetAngle = carAngle + LOOKAHEAD_ANGLE;

  const tx = TRACK_RADIUS * Math.sin(targetAngle);
  const tz = TRACK_RADIUS * Math.cos(targetAngle);

  const dx = tx - x;
  const dz = tz - z;
  const desiredHeading = Math.atan2(dx, dz);

  let headingError = desiredHeading - car.mesh.rotation.y;
  // Normalize to [-π, π]
  while (headingError > Math.PI) headingError -= 2 * Math.PI;
  while (headingError < -Math.PI) headingError += 2 * Math.PI;

  // Positive headingError → need to turn right → negative steering
  car.steering = Math.max(-1.2, Math.min(1.2, -headingError * STEERING_GAIN));
  car.throttle = 1.0;
}
