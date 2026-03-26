import * as THREE from 'three';

export function createGround() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x2f6f3e })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function createTrack() {
  const group = new THREE.Group();
  const road = new THREE.Mesh(
    new THREE.RingGeometry(4, 6, 64),
    new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide })
  );
  road.rotation.x = -Math.PI / 2;
  group.add(road);

  const innerLine = new THREE.Mesh(
    new THREE.RingGeometry(4.95, 5.05, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  innerLine.rotation.x = -Math.PI / 2;
  group.add(innerLine);

  const outerLine = new THREE.Mesh(
    new THREE.RingGeometry(5.95, 6.05, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  outerLine.rotation.x = -Math.PI / 2;
  group.add(outerLine);

  return group;
}
