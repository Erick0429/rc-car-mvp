import * as THREE from 'three';

export function createGround() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x2f6f3e })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// Silverstone-inspired circuit centerline waypoints [x, z]
// Scale: ~25×18 units
const WAYPOINTS_2D: [number, number][] = [
  // Woodcote (start, right side top)
  [ 12,  2],
  // Copse — sweeping fast right
  [ 13, -2],
  [ 12, -5],
  // Maggotts
  [  8, -8],
  [  4, -9],
  // Becketts chicane
  [  2, -8.5],
  [  0, -9.5],
  [ -1, -8.5],
  // Chapel
  [ -3, -8],
  // Hangar Straight going left
  [ -7, -6],
  [-10, -4],
  // Stowe — big sweeping left
  [-13, -2],
  [-13,  1],
  // Vale
  [-12,  4],
  // Club
  [-10,  6],
  // Abbey / Farm
  [ -5,  8.5],
  [  0,  9],
  // Loop / Aintree
  [  3,  7.5],
  [  5,  7],
  [  6,  7.5],
  [  8,  6],
  // Back to Woodcote
  [ 11,  4],
  [ 12,  2],
];

const TRACK_WIDTH = 2.5;
const ROAD_Y      = 0.01;
const LINE_Y      = 0.02;

function buildCurve(): THREE.CatmullRomCurve3 {
  const pts = WAYPOINTS_2D.map(([x, z]) => new THREE.Vector3(x, 0, z));
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
}

function buildRoadGeometry(
  curve: THREE.CatmullRomCurve3,
  width: number,
  segments = 300
): THREE.BufferGeometry {
  const pts = curve.getPoints(segments);
  const positions: number[] = [];
  const indices: number[]   = [];

  for (let i = 0; i < pts.length; i++) {
    const cur  = pts[i];
    const next = pts[(i + 1) % pts.length];
    const tan  = new THREE.Vector3().subVectors(next, cur).normalize();
    const perp = new THREE.Vector3(-tan.z, 0, tan.x);

    // left edge
    positions.push(
      cur.x + perp.x * width / 2, 0,
      cur.z + perp.z * width / 2
    );
    // right edge
    positions.push(
      cur.x - perp.x * width / 2, 0,
      cur.z - perp.z * width / 2
    );
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildEdgeLine(
  curve: THREE.CatmullRomCurve3,
  offset: number,
  segments = 300
): THREE.Line {
  const pts = curve.getPoints(segments);
  const linePts: THREE.Vector3[] = [];

  for (let i = 0; i < pts.length; i++) {
    const cur  = pts[i];
    const next = pts[(i + 1) % pts.length];
    const tan  = new THREE.Vector3().subVectors(next, cur).normalize();
    const perp = new THREE.Vector3(-tan.z, 0, tan.x);
    linePts.push(new THREE.Vector3(
      cur.x + perp.x * offset,
      LINE_Y,
      cur.z + perp.z * offset
    ));
  }
  // close the loop
  linePts.push(linePts[0].clone());

  const geo = new THREE.BufferGeometry().setFromPoints(linePts);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
  return new THREE.Line(geo, mat);
}

function buildCenterDash(
  curve: THREE.CatmullRomCurve3,
  segments = 300
): THREE.Line {
  const pts = curve.getPoints(segments);
  // keep every other pair to make dashes
  const dashPts: THREE.Vector3[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (Math.floor(i / 5) % 2 === 0) {
      dashPts.push(new THREE.Vector3(pts[i].x, LINE_Y, pts[i].z));
    } else {
      // break the line (add invisible gap by duplicating with NaN trick not available → skip)
    }
  }
  const geo = new THREE.BufferGeometry().setFromPoints(dashPts);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffaa, opacity: 0.6, transparent: true });
  return new THREE.Line(geo, mat);
}

export function createTrack(): THREE.Group {
  const group = new THREE.Group();
  const curve = buildCurve();

  // Road surface
  const roadGeo = buildRoadGeometry(curve, TRACK_WIDTH);
  const road = new THREE.Mesh(
    roadGeo,
    new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide })
  );
  road.position.y = ROAD_Y;
  group.add(road);

  // White edge lines
  group.add(buildEdgeLine(curve,  TRACK_WIDTH / 2));  // outer
  group.add(buildEdgeLine(curve, -TRACK_WIDTH / 2));  // inner

  // Yellow center dashes
  group.add(buildCenterDash(curve));

  return group;
}

// Export the curve so the car & autopilot can use it
export function getTrackCurve(): THREE.CatmullRomCurve3 {
  return buildCurve();
}
