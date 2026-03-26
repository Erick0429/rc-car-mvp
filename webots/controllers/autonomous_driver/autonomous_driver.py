"""
Webots RC카 자율주행 컨트롤러

학습된 SmallCNN 모델을 로드해 자율주행을 실행합니다.
모델 경로: ../../../models/model.pth
"""

from controller import Robot, Camera, Motor
import numpy as np
import cv2
import torch
import torchvision.transforms as T
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../train"))
from model import SmallCNN

TIMESTEP   = 32
MAX_SPEED  = 8.0
STEER_MAX  = 0.5
IMAGE_W    = 640
IMAGE_H    = 480
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../../models/model.pth")
DEVICE     = "mps" if torch.backends.mps.is_available() else "cpu"

robot = Robot()
camera      = robot.getDevice("camera");  camera.enable(TIMESTEP)
left_motor  = robot.getDevice("left_rear_motor")
right_motor = robot.getDevice("right_rear_motor")
left_steer  = robot.getDevice("left_steer")
right_steer = robot.getDevice("right_steer")
for m in (left_motor, right_motor):
    m.setPosition(float("inf")); m.setVelocity(0)

if not os.path.exists(MODEL_PATH):
    print(f"[오류] 모델 없음: {MODEL_PATH}")
    print("먼저 train/train_bc.py 를 실행해 학습을 완료해주세요.")
    sys.exit(1)

model = SmallCNN().to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()
print(f"모델 로드 완료 ({DEVICE}). 자율주행 시작!")

transform = T.Compose([
    T.ToPILImage(),
    T.Resize((160, 90)),
    T.ToTensor(),
    T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

while robot.step(TIMESTEP) != -1:
    raw = camera.getImage()
    img = np.frombuffer(raw, dtype=np.uint8).reshape((IMAGE_H, IMAGE_W, 4))
    rgb = cv2.cvtColor(img, cv2.COLOR_BGRA2RGB)

    with torch.no_grad():
        t = transform(rgb).unsqueeze(0).to(DEVICE)
        out = model(t).cpu().numpy()[0]

    steering = float(np.clip(out[0], -1, 1))
    throttle = float(np.clip(out[1],  0, 1))

    left_motor.setVelocity(throttle * MAX_SPEED)
    right_motor.setVelocity(throttle * MAX_SPEED)
    left_steer.setPosition(steering * STEER_MAX)
    right_steer.setPosition(steering * STEER_MAX)
