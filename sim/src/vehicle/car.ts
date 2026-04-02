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

    // Body — wider to be ~33% of track width (3.6)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.45, 1.9),
      new THREE.MeshStandardMaterial({ color: 0xff6b35 })
    );
    body.position.y = 0.28;
    this.mesh.add(body);

    // Roof / cabin hint
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.28, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xcc4400 })
    );
    cabin.position.set(0, 0.67, -0.1);
    this.mesh.add(cabin);

    // Camera rig: front of car, just above hood level
    this.cameraRig = new THREE.Object3D();
    this.cameraRig.position.set(0, 0.58, 0.88);  // height 0.58, near front bumper
    this.mesh.add(this.cameraRig);

    // Small blue camera indicator
    const camBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 0.10),
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
