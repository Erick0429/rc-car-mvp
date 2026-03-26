"""
Webots RC카 수동 조작 데이터 수집 컨트롤러

조작법:
  방향키 위/아래 : 전진 / 후진
  방향키 좌/우   : 좌회전 / 우회전
  R              : 녹화 시작
  S              : 저장 후 중지
  Q              : 종료 (녹화 중이면 자동 저장)

데이터 저장 위치: ../../../datasets/episode_XXXX/
"""

from controller import Robot, Camera, Motor, Keyboard
import numpy as np
import os
import cv2
import json
from datetime import datetime

# ── 설정 ──────────────────────────────────────
TIMESTEP    = 32        # ms
MAX_SPEED   = 8.0       # rad/s
STEER_MAX   = 0.5       # rad
IMAGE_W     = 640
IMAGE_H     = 480
SAVE_DIR    = os.path.join(os.path.dirname(__file__), "../../../datasets")
# ──────────────────────────────────────────────

robot = Robot()

camera      = robot.getDevice("camera")
camera.enable(TIMESTEP)

left_motor  = robot.getDevice("left_rear_motor")
right_motor = robot.getDevice("right_rear_motor")
left_steer  = robot.getDevice("left_steer")
right_steer = robot.getDevice("right_steer")

for m in (left_motor, right_motor):
    m.setPosition(float("inf"))
    m.setVelocity(0)

keyboard = robot.getKeyboard()
keyboard.enable(TIMESTEP)

os.makedirs(SAVE_DIR, exist_ok=True)

recording     = False
frames, acts  = [], []
episode_count = 0


def next_episode_num():
    existing = [d for d in os.listdir(SAVE_DIR) if d.startswith("episode_")]
    return max((int(d.split("_")[1]) for d in existing), default=-1) + 1


def save_episode(frames, acts, ep_num):
    ep_dir  = os.path.join(SAVE_DIR, f"episode_{ep_num:04d}")
    img_dir = os.path.join(ep_dir, "images")
    os.makedirs(img_dir, exist_ok=True)

    for i, frame in enumerate(frames):
        cv2.imwrite(os.path.join(img_dir, f"frame_{i:05d}.jpg"), frame)

    np.save(os.path.join(ep_dir, "actions.npy"), np.array(acts, dtype=np.float32))

    with open(os.path.join(ep_dir, "meta.json"), "w") as f:
        json.dump({
            "episode":      ep_num,
            "frames":       len(frames),
            "timestamp":    datetime.now().isoformat(),
            "action_keys":  ["steering", "throttle"],
            "image_size":   [IMAGE_W, IMAGE_H],
        }, f, indent=2)

    print(f"[저장완료] episode_{ep_num:04d}  —  {len(frames)} 프레임")


print("=" * 40)
print("RC카 데이터 수집기")
print("R: 녹화시작  S: 저장  Q: 종료")
print("=" * 40)

while robot.step(TIMESTEP) != -1:
    keys = set()
    k = keyboard.getKey()
    while k != -1:
        keys.add(k)
        k = keyboard.getKey()

    throttle, steering = 0.0, 0.0
    if Keyboard.UP    in keys: throttle =  1.0
    if Keyboard.DOWN  in keys: throttle = -0.5
    if Keyboard.LEFT  in keys: steering = -1.0
    if Keyboard.RIGHT in keys: steering =  1.0

    if ord("R") in keys and not recording:
        recording     = True
        frames, acts  = [], []
        episode_count = next_episode_num()
        print(f"[녹화시작] episode_{episode_count:04d}")

    if ord("S") in keys and recording:
        recording = False
        save_episode(frames, acts, episode_count)

    if ord("Q") in keys:
        if recording and frames:
            save_episode(frames, acts, episode_count)
        break

    left_motor.setVelocity(throttle * MAX_SPEED)
    right_motor.setVelocity(throttle * MAX_SPEED)
    left_steer.setPosition(steering * STEER_MAX)
    right_steer.setPosition(steering * STEER_MAX)

    if recording:
        raw  = camera.getImage()
        img  = np.frombuffer(raw, dtype=np.uint8).reshape((IMAGE_H, IMAGE_W, 4))
        bgr  = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
        frames.append(bgr)
        acts.append([steering, throttle])
        if len(frames) % 50 == 0:
            print(f"  {len(frames)} 프레임 수집중...")
