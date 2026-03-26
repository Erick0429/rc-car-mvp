import * as THREE from 'three';

export class Car {
  mesh: THREE.Group;
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
  }

  update(dt: number) {
    this.speed += this.throttle * dt;
    this.speed *= 0.98;
    this.mesh.rotation.y -= this.steering * this.speed * dt;
    this.mesh.position.x += Math.sin(this.mesh.rotation.y) * this.speed * dt;
    this.mesh.position.z += Math.cos(this.mesh.rotation.y) * this.speed * dt;
  }
}
