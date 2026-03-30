import { Car } from './car';
import {
  getTrackCurve,
  getTrackLookaheadProgress,
  getTrackLength,
  getTrackProgressDelta,
  queryTrackAtPosition,
} from '../world/track';

const LOOKAHEAD_METERS = 2.8;
const STEERING_GAIN = 3.6;
const CROSS_TRACK_GAIN = 0.28;
const THROTTLE_BASE = 0.92;
const THROTTLE_CURVE_BRAKE_GAIN = 0.8;

/**
 * Spline-track autopilot for the Silverstone circuit.
 * Uses nearest-point + lookahead steering on a closed loop.
 */
export function autopilotControl(car: Car): void {
  const trackState = queryTrackAtPosition(car.mesh.position);
  const lookaheadProgress = getTrackLookaheadProgress(trackState.progress01, LOOKAHEAD_METERS);
  const lookaheadPoint = getTrackCurve().getPointAt(lookaheadProgress);

  const dx = lookaheadPoint.x - car.mesh.position.x;
  const dz = lookaheadPoint.z - car.mesh.position.z;
  const desiredHeading = Math.atan2(dx, dz);

  let headingError = desiredHeading - car.mesh.rotation.y;
  while (headingError > Math.PI) headingError -= 2 * Math.PI;
  while (headingError < -Math.PI) headingError += 2 * Math.PI;

  const steeringCmd =
    -headingError * STEERING_GAIN -
    trackState.signedLateralError * CROSS_TRACK_GAIN;

  car.steering = Math.max(-1.2, Math.min(1.2, steeringCmd));

  const aheadDelta = Math.abs(
    getTrackProgressDelta(trackState.progress01, lookaheadProgress)
  ) * getTrackLength();
  const curvatureProxy = Math.abs(headingError) / Math.max(0.6, aheadDelta);
  car.throttle = Math.max(0.55, THROTTLE_BASE - curvatureProxy * THROTTLE_CURVE_BRAKE_GAIN);
}
