import * as THREE from 'three';
import { createScene } from './core/scene';
import { createRenderer } from './core/renderer';
import { createGround, createTrack } from './world/track';
import { Car } from './vehicle/car';
import { autopilotControl } from './vehicle/autopilot';
import { EpisodeRecorder } from './telemetry/recorder';

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
car.mesh.rotation.y = Math.PI / 2; // face clockwise tangent at (0, 5)
scene.add(car.mesh);

let autopilot = false;
const recorder = new EpisodeRecorder();

// HUD elements
const hudMode    = document.getElementById('hud-mode')!;
const hudSpeed   = document.getElementById('hud-speed')!;
const hudSteering = document.getElementById('hud-steering')!;
const hudRadius  = document.getElementById('hud-radius')!;
const hudFrames  = document.getElementById('hud-frames')!;

function updateHUD() {
  const x = car.mesh.position.x;
  const z = car.mesh.position.z;
  const radius = Math.sqrt(x * x + z * z);
  const modeSpan = autopilot
    ? '<span class="mode-autopilot">AUTOPILOT</span>'
    : '<span class="mode-manual">MANUAL</span>';
  const recMark = recorder.recording ? ' <span class="rec">⬤ REC</span>' : '';
  hudMode.innerHTML    = `MODE: ${modeSpan}${recMark}`;
  hudSpeed.textContent  = `SPD: ${car.speed.toFixed(3)}`;
  hudSteering.textContent = `STR: ${car.steering.toFixed(3)}`;
  hudRadius.textContent = `RAD: ${radius.toFixed(2)} m`;
  hudFrames.textContent = `FRAMES: ${recorder.frameCount}`;
}

// Keyboard state
const keys: Record<string, boolean> = {};

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;

  if (e.key === 'a' || e.key === 'A') {
    autopilot = !autopilot;
    if (!autopilot) { car.throttle = 0; car.steering = 0; }
  }

  if (e.key === 'r' || e.key === 'R') {
    recorder.recording ? recorder.stop() : recorder.start();
  }

  if ((e.key === 'e' || e.key === 'E') && !recorder.recording && recorder.frameCount > 0) {
    const blob = new Blob([recorder.export()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `episode_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
});

window.addEventListener('keyup', (e) => { keys[e.key] = false; });

function handleManualInput() {
  if (autopilot) return;
  car.throttle = keys['ArrowUp']    ? 1   : 0;
  car.steering  = keys['ArrowLeft'] ? 1.2 : keys['ArrowRight'] ? -1.2 : 0;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = 0.016;

  handleManualInput();
  if (autopilot) autopilotControl(car);

  car.update(dt);

  recorder.record({
    x: car.mesh.position.x,
    z: car.mesh.position.z,
    heading: car.mesh.rotation.y,
    speed: car.speed,
    steering: car.steering,
    throttle: car.throttle,
    mode: autopilot ? 'autopilot' : 'manual',
  });

  updateHUD();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
