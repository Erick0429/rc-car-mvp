import * as THREE from 'three';

export class Car {
  mesh: THREE.Group;
  /** Front camera rig mount point */
  cameraRig: THREE.Object3D;
  speed = 0;
  steering = 0;
  throttle = 0;

  constructor() {
    this.mesh = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.18, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xff6b35 })
    );
    body.position.y = 0.14;
    this.mesh.add(body);

    // Camera rig mount point at front of car
    this.cameraRig = new THREE.Object3D();
    this.cameraRig.position.set(0, 0.26, 0.36); // front, slightly elevated
    this.mesh.add(this.cameraRig);

    // Small visual indicator so the camera mount is visible in the scene
    const camBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.07, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x00aaff })
    );
    this.cameraRig.add(camBox);
  }

  update(dt: number) {
    this.speed += this.throttle * dt;
    this.speed *= 0.98;
    this.mesh.rotation.y -= this.steering * this.speed * dt;
    this.mesh.position.x += Math.sin(this.mesh.rotation.y) * this.speed * dt;
    this.mesh.position.z += Math.cos(this.mesh.rotation.y) * this.speed * dt;
  }
}
