import * as THREE from 'three';

export const TRACK_NAME = 'Silverstone';

// Silverstone-inspired closed-loop centerline (in XZ plane)
const WAYPOINTS_2D: [number, number][] = [
  [12.0, 2.0],
  [13.2, -2.0],
  [12.1, -5.2],
  [8.3, -8.0],
  [4.1, -9.1],
  [2.1, -8.4],
  [0.0, -9.5],
  [-1.2, -8.2],
  [-3.2, -8.0],
  [-7.4, -6.0],
  [-10.4, -4.0],
  [-13.1, -1.8],
  [-13.0, 1.2],
  [-12.0, 4.2],
  [-10.0, 6.3],
  [-5.0, 8.6],
  [0.0, 9.0],
  [3.1, 7.5],
  [5.2, 7.0],
  [6.2, 7.6],
  [8.3, 6.0],
  [11.1, 4.0],
];

const TRACK_WIDTH = 2.6;
const ROAD_Y = 0.015;
const MARKING_Y = 0.03;
const TRACK_SAMPLE_COUNT = 700;

const curve = buildCurve();
const samples = curve.getSpacedPoints(TRACK_SAMPLE_COUNT);
samples.pop(); // remove duplicated endpoint for closed-loop processing
const trackLength = curve.getLength();

export type TrackQuery = {
  nearestPoint: THREE.Vector3;
  nearestTangent: THREE.Vector3;
  nearestDistance: number;
  signedLateralError: number;
  progress01: number;
};

function buildCurve(): THREE.CatmullRomCurve3 {
  const pts = WAYPOINTS_2D.map(([x, z]) => new THREE.Vector3(x, 0, z));
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.28);
}

function wrap01(t: number): number {
  const wrapped = t % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function signedAngleDistance01(from: number, to: number): number {
  let d = wrap01(to) - wrap01(from);
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

function buildRoadGeometry(width: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const n = samples.length;

  for (let i = 0; i < n; i++) {
    const t = i / n;
    const point = samples[i];
    const tangent = curve.getTangentAt(t).normalize();
    const left = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const lx = point.x + left.x * width * 0.5;
    const lz = point.z + left.z * width * 0.5;
    const rx = point.x - left.x * width * 0.5;
    const rz = point.z - left.z * width * 0.5;

    positions.push(lx, 0, lz, rx, 0, rz);
    uvs.push(0, t * 20, 1, t * 20);
  }

  for (let i = 0; i < n; i++) {
    const ni = (i + 1) % n;
    const a = i * 2;
    const b = i * 2 + 1;
    const c = ni * 2;
    const d = ni * 2 + 1;

    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildOffsetLoopLine(offset: number): THREE.LineLoop {
  const points: THREE.Vector3[] = [];
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const point = samples[i];
    const tangent = curve.getTangentAt(t).normalize();
    const left = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    points.push(new THREE.Vector3(
      point.x + left.x * offset,
      MARKING_Y,
      point.z + left.z * offset
    ));
  }

  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
}

function buildCenterDashes(): THREE.LineSegments {
  const dashPoints: number[] = [];
  const dashLength = 0.012;
  const gapLength = 0.018;

  for (let t = 0; t < 1; t += dashLength + gapLength) {
    const t0 = wrap01(t);
    const t1 = wrap01(t + dashLength);
    const p0 = curve.getPointAt(t0);
    const p1 = curve.getPointAt(t1);
    dashPoints.push(p0.x, MARKING_Y, p0.z, p1.x, MARKING_Y, p1.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(dashPoints, 3));
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.8 })
  );
}

export function createGround() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x245532, roughness: 1.0, metalness: 0.0 })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function createTrack(): THREE.Group {
  const group = new THREE.Group();

  const road = new THREE.Mesh(
    buildRoadGeometry(TRACK_WIDTH),
    new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 1.0,
      metalness: 0.0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  road.position.y = ROAD_Y;
  group.add(road);

  group.add(buildOffsetLoopLine(TRACK_WIDTH * 0.5));
  group.add(buildOffsetLoopLine(-TRACK_WIDTH * 0.5));
  group.add(buildCenterDashes());

  return group;
}

export function getTrackCurve(): THREE.CatmullRomCurve3 {
  return curve;
}

export function getTrackLength(): number {
  return trackLength;
}

export function getTrackSpawnPose(progress01 = 0): { position: THREE.Vector3; heading: number } {
  const t = wrap01(progress01);
  const position = curve.getPointAt(t).clone();
  const tangent = curve.getTangentAt(t).normalize();
  const heading = Math.atan2(tangent.x, tangent.z);
  return { position, heading };
}

export function queryTrackAtPosition(position: THREE.Vector3): TrackQuery {
  let nearestIndex = 0;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const dx = p.x - position.x;
    const dz = p.z - position.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < nearestDistanceSq) {
      nearestDistanceSq = d2;
      nearestIndex = i;
    }
  }

  const progress01 = nearestIndex / samples.length;
  const nearestPoint = curve.getPointAt(progress01);
  const nearestTangent = curve.getTangentAt(progress01).normalize();
  const left = new THREE.Vector3(-nearestTangent.z, 0, nearestTangent.x).normalize();
  const toCar = new THREE.Vector3().subVectors(position, nearestPoint);

  return {
    nearestPoint,
    nearestTangent,
    nearestDistance: Math.sqrt(nearestDistanceSq),
    signedLateralError: toCar.dot(left),
    progress01,
  };
}

export function getTrackLookaheadProgress(progress01: number, lookaheadMeters: number): number {
  return wrap01(progress01 + lookaheadMeters / trackLength);
}

export function getTrackProgressDelta(fromProgress01: number, toProgress01: number): number {
  return signedAngleDistance01(fromProgress01, toProgress01);
}
