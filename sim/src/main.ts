import * as THREE from 'three';
import { createScene } from './core/scene';
import { createRenderer } from './core/renderer';
import {
  createGround,
  createTrack,
  getTrackSpawnPose,
  queryTrackAtPosition,
  TRACK_NAME,
} from './world/track';
import { Car } from './vehicle/car';
import { autopilotControl } from './vehicle/autopilot';
import { EpisodeRecorder } from './telemetry/recorder';

const app = document.getElementById('app');
if (!app) throw new Error('App root not found');

const scene = createScene();
const renderer = createRenderer();
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 64, 10);
camera.lookAt(0, 0, 0);

scene.add(createGround());
scene.add(createTrack());

const car = new Car();
const spawnPose = getTrackSpawnPose(0.015);
car.mesh.position.copy(spawnPose.position);
car.mesh.rotation.y = spawnPose.heading;
scene.add(car.mesh);

const frontCamera = new THREE.PerspectiveCamera(75, 160 / 90, 0.01, 100);
frontCamera.rotation.y = Math.PI;
car.cameraRig.add(frontCamera);

// ── Camera capture setup ────────────────────────────────────────────────────
const CAP_W = 160;
const CAP_H = 90;
const captureTarget = new THREE.WebGLRenderTarget(CAP_W, CAP_H);
const capturePixels = new Uint8Array(CAP_W * CAP_H * 4);
const captureCanvas = document.createElement('canvas');
captureCanvas.width  = CAP_W;
captureCanvas.height = CAP_H;
const captureCtx = captureCanvas.getContext('2d')!;

function captureFrame(): string {
  // Render front camera to offscreen target
  renderer.setRenderTarget(captureTarget);
  renderer.render(scene, frontCamera);
  renderer.setRenderTarget(null);

  // Read pixels (WebGL: y=0 is bottom → flip vertically)
  renderer.readRenderTargetPixels(captureTarget, 0, 0, CAP_W, CAP_H, capturePixels);

  const flipped = new Uint8ClampedArray(CAP_W * CAP_H * 4);
  for (let row = 0; row < CAP_H; row++) {
    const srcRow = CAP_H - 1 - row;
    flipped.set(
      capturePixels.subarray(srcRow * CAP_W * 4, (srcRow + 1) * CAP_W * 4),
      row * CAP_W * 4
    );
  }

  captureCtx.putImageData(new ImageData(flipped, CAP_W, CAP_H), 0, 0);
  // Return base64 JPEG without the "data:image/jpeg;base64," prefix
  return captureCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}
// ────────────────────────────────────────────────────────────────────────────

let autopilot = false;
const recorder = new EpisodeRecorder();

// HUD elements
const hudMode     = document.getElementById('hud-mode')!;
const hudSpeed    = document.getElementById('hud-speed')!;
const hudSteering = document.getElementById('hud-steering')!;
const hudTrack    = document.getElementById('hud-track')!;
const hudFrames   = document.getElementById('hud-frames')!;

function updateHUD() {
  const trackState = queryTrackAtPosition(car.mesh.position);
  const modeSpan = autopilot
    ? '<span class="mode-autopilot">AUTOPILOT</span>'
    : '<span class="mode-manual">MANUAL</span>';
  const recMark = recorder.recording ? ' <span class="rec">⬤ REC</span>' : '';

  hudMode.innerHTML     = `MODE: ${modeSpan}${recMark}`;
  hudSpeed.textContent  = `SPD: ${car.speed.toFixed(3)}`;
  hudSteering.textContent = `STR: ${car.steering.toFixed(3)}`;
  hudTrack.textContent  = `TRK: ${(trackState.progress01 * 100).toFixed(1)}% | ERR: ${trackState.nearestDistance.toFixed(2)} m`;
  hudFrames.textContent = `FRAMES: ${recorder.frameCount}`;
}

// Keyboard state
const keys: Record<string, boolean> = {};

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;

  if ((e.key === 'a' || e.key === 'A') && !e.repeat) {
    autopilot = !autopilot;
    if (!autopilot) { car.throttle = 0; car.steering = 0; }
  }

  if ((e.key === 'r' || e.key === 'R') && !e.repeat) {
    recorder.recording ? recorder.stop() : recorder.start();
  }

  // E → export with camera images
  if ((e.key === 'e' || e.key === 'E') && !e.repeat && !recorder.recording && recorder.frameCount > 0) {
    const blob = new Blob([recorder.exportJSON()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `episode_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
});

window.addEventListener('keyup', (e) => { keys[e.key] = false; });

function handleManualInput() {
  if (autopilot) return;
  car.throttle = keys['ArrowUp']    ? 1   : 0;
  car.steering = keys['ArrowLeft']  ? 1.2 : keys['ArrowRight'] ? -1.2 : 0;
}

const MAX_DT = 0.05;
let lastTime = performance.now();

document.title = `RC Car MVP Simulator - ${TRACK_NAME}`;

function renderMainAndInset() {
  const width  = window.innerWidth;
  const height = window.innerHeight;

  // Main view
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.render(scene, camera);

  // Front camera inset (top-right)
  const margin     = 8;
  const insetWidth = Math.max(120, Math.floor(width * 0.16));
  const insetHeight = Math.floor(insetWidth * 0.65);
  const insetX = width - insetWidth - margin;
  const insetY = height - insetHeight - margin;   // WebGL y=0 is bottom → top of screen

  frontCamera.aspect = insetWidth / insetHeight;
  frontCamera.updateProjectionMatrix();

  renderer.clearDepth();
  renderer.setScissorTest(true);
  renderer.setScissor(insetX, insetY, insetWidth, insetHeight);
  renderer.setViewport(insetX, insetY, insetWidth, insetHeight);
  renderer.render(scene, frontCamera);
  renderer.setScissorTest(false);
}

function animate(now: number) {
  requestAnimationFrame(animate);
  const rawDt = (now - lastTime) / 1000;
  const dt = Math.min(Math.max(rawDt, 0), MAX_DT);
  lastTime = now;

  handleManualInput();
  if (autopilot) autopilotControl(car);
  car.update(dt);

  // Capture front camera frame BEFORE main render (render target is independent)
  if (recorder.recording) {
    recorder.addImage(captureFrame());
  }

  recorder.record({
    x:        car.mesh.position.x,
    z:        car.mesh.position.z,
    heading:  car.mesh.rotation.y,
    speed:    car.speed,
    steering: car.steering,
    throttle: car.throttle,
    mode:     autopilot ? 'autopilot' : 'manual',
  });

  updateHUD();
  renderMainAndInset();
}
animate(lastTime);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
