import * as THREE from 'three';
import { createScene } from './core/scene';
import { createRenderer } from './core/renderer';
import { createGround, createTrack } from './world/track';
import { Car } from './vehicle/car';

const app = document.getElementById('app');
if (!app) throw new Error('App root not found');

const scene = createScene();
const renderer = createRenderer();
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);

scene.add(createGround());
scene.add(createTrack());

const car = new Car();
car.mesh.position.set(0, 0, 5);
scene.add(car.mesh);

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') car.throttle = 1;
  if (e.key === 'ArrowLeft') car.steering = 1.2;
  if (e.key === 'ArrowRight') car.steering = -1.2;
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp') car.throttle = 0;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') car.steering = 0;
});

function animate() {
  requestAnimationFrame(animate);
  car.update(0.016);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
