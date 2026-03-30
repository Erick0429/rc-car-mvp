import * as THREE from 'three';

export const TRACK_NAME = 'Silverstone';

// Horizontal infinity-track (lemniscate-style) centerline in XZ plane
const WAYPOINTS_2D: [number, number][] = buildInfinityWaypoints();

const TRACK_WIDTH = 3.6;
const ROAD_Y = 0.03;
const MARKING_Y = 0.05;
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

function buildInfinityWaypoints(): [number, number][] {
  // Hand-authored RC practice infinity track:
  // two large loop sections connected by smooth diagonal crossovers.
  // The center is shaped to preserve heading continuity instead of pinching into a sharp X.
  return [
    [-4.0, -3.2],
    [-7.0, -1.0],
    [-11.5, 3.5],
    [-17.5, 8.8],
    [-24.0, 9.8],
    [-29.5, 6.8],
    [-32.0, 1.0],
    [-30.8, -5.6],
    [-26.2, -10.4],
    [-19.2, -12.2],
    [-12.0, -11.4],
    [-6.8, -8.0],
    [-3.8, -4.8],
    [-1.8, -2.0],
    [0.6, 0.6],
    [3.8, 4.0],
    [7.8, 7.4],
    [13.5, 10.4],
    [20.5, 11.2],
    [27.0, 8.8],
    [31.6, 3.4],
    [32.2, -3.6],
    [28.8, -9.2],
    [22.8, -12.2],
    [15.4, -12.4],
    [8.8, -9.6],
    [4.2, -5.6],
    [1.0, -2.2],
    [-1.8, 0.4],
    [-4.6, 2.8],
    [-8.2, 5.8],
    [-12.8, 8.8],
    [-18.8, 10.2],
    [-24.8, 8.8],
    [-29.2, 4.8],
    [-30.0, -0.8],
    [-27.2, -6.4],
    [-21.8, -9.8],
    [-15.2, -10.2],
    [-9.0, -7.8],
    [-4.8, -4.8],
    [-2.0, -2.4],
    [0.8, 0.4],
    [4.6, 4.4],
    [9.8, 8.6],
    [16.2, 11.0],
    [23.0, 10.8],
    [28.4, 7.8],
    [31.6, 2.4],
    [31.2, -4.0],
    [27.6, -8.8],
    [21.6, -11.6],
    [14.6, -11.6],
    [8.6, -9.2],
    [3.8, -5.2],
    [0.0, -1.2],
  ];
}

function buildCurve(): THREE.CatmullRomCurve3 {
  const pts = WAYPOINTS_2D.map(([x, z]) => new THREE.Vector3(x, 0, z));
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.12);
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

  const roadBase = new THREE.Mesh(
    buildRoadGeometry(TRACK_WIDTH + 0.28),
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
  );
  roadBase.position.y = ROAD_Y - 0.012;
  group.add(roadBase);

  const road = new THREE.Mesh(
    buildRoadGeometry(TRACK_WIDTH),
    new THREE.MeshBasicMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide })
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
