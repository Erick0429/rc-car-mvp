"""
Behavior Cloning 학습 스크립트

데이터 위치: ../datasets/episode_XXXX/
  images/frame_XXXXX.jpg  — 카메라 이미지
  actions.npy             — shape (N, 2) [steering, throttle]

실행:
  cd train
  python train_bc.py
  python train_bc.py --config ../configs/train.yaml
"""

import os, sys, argparse
import yaml
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split
import torchvision.transforms as T

from model import SmallCNN


# ── Dataset ──────────────────────────────────────────────────────────────────

class RCDataset(Dataset):
    def __init__(self, data_root, image_size=(160, 90), transform=None):
        self.samples = []
        self.transform = transform or T.Compose([
            T.Resize(image_size[::-1]),   # PIL: (W, H) → Resize(H, W) — 주의: T.Resize takes (H,W)
            T.ToTensor(),
            T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

        if not os.path.isdir(data_root):
            raise FileNotFoundError(f"데이터 폴더 없음: {data_root}")

        episodes = sorted(d for d in os.listdir(data_root) if d.startswith("episode_"))
        if not episodes:
            raise ValueError(f"에피소드가 없습니다: {data_root}")

        for ep in episodes:
            ep_dir  = os.path.join(data_root, ep)
            img_dir = os.path.join(ep_dir, "images")
            act_path = os.path.join(ep_dir, "actions.npy")

            if not os.path.isdir(img_dir) or not os.path.exists(act_path):
                continue

            actions = np.load(act_path)  # (N, 2)
            frames  = sorted(f for f in os.listdir(img_dir) if f.endswith(".jpg"))

            n = min(len(frames), len(actions))
            for i in range(n):
                self.samples.append((
                    os.path.join(img_dir, frames[i]),
                    actions[i].astype(np.float32),
                ))

        print(f"총 {len(self.samples)} 샘플 로드 ({len(episodes)} 에피소드)")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, action = self.samples[idx]
        img = Image.open(img_path).convert("RGB")
        return self.transform(img), torch.tensor(action)


# ── Training ──────────────────────────────────────────────────────────────────

def train(cfg):
    device = (
        "mps"  if torch.backends.mps.is_available() else
        "cuda" if torch.cuda.is_available()         else
        "cpu"
    )
    print(f"학습 장치: {device}")

    # 데이터셋
    image_size = tuple(cfg["dataset"]["image_size"])   # [W, H]
    dataset = RCDataset(
        data_root  = cfg["dataset"]["root"],
        image_size = image_size,
    )

    n_train = int(len(dataset) * cfg["dataset"]["train_split"])
    n_val   = len(dataset) - n_train
    train_ds, val_ds = random_split(dataset, [n_train, n_val],
                                    generator=torch.Generator().manual_seed(42))

    train_loader = DataLoader(train_ds, batch_size=cfg["dataset"]["batch_size"],
                              shuffle=True,  num_workers=0, pin_memory=False)
    val_loader   = DataLoader(val_ds,   batch_size=cfg["dataset"]["batch_size"],
                              shuffle=False, num_workers=0, pin_memory=False)

    # 모델
    model = SmallCNN().to(device)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr           = cfg["train"]["lr"],
        weight_decay = cfg["train"]["weight_decay"],
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=cfg["train"]["epochs"]
    )

    steer_w   = cfg["train"]["steering_weight"]
    throttle_w = cfg["train"]["throttle_weight"]

    best_val_loss = float("inf")
    model_dir = os.path.join(os.path.dirname(__file__), "../models")
    os.makedirs(model_dir, exist_ok=True)
    save_path = os.path.join(model_dir, "model.pth")

    for epoch in range(1, cfg["train"]["epochs"] + 1):
        # ── 학습 ──
        model.train()
        train_loss = 0.0
        for imgs, actions in train_loader:
            imgs    = imgs.to(device)
            actions = actions.to(device)

            pred = model(imgs)
            loss = (
                steer_w    * nn.functional.mse_loss(pred[:, 0], actions[:, 0]) +
                throttle_w * nn.functional.mse_loss(pred[:, 1], actions[:, 1])
            )

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        train_loss /= len(train_loader)

        # ── 검증 ──
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for imgs, actions in val_loader:
                imgs    = imgs.to(device)
                actions = actions.to(device)
                pred    = model(imgs)
                val_loss += (
                    steer_w    * nn.functional.mse_loss(pred[:, 0], actions[:, 0]) +
                    throttle_w * nn.functional.mse_loss(pred[:, 1], actions[:, 1])
                ).item()
        val_loss /= len(val_loader)

        scheduler.step()

        print(f"Epoch {epoch:3d}/{cfg['train']['epochs']}  "
              f"train={train_loss:.4f}  val={val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), save_path)
            print(f"  → 모델 저장: {save_path}")

    print(f"\n학습 완료. 최고 val loss: {best_val_loss:.4f}")
    print(f"모델 위치: {save_path}")


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="../configs/train.yaml")
    args = parser.parse_args()

    with open(args.config) as f:
        cfg = yaml.safe_load(f)

    # dataset root를 절대경로로 변환
    root = cfg["dataset"]["root"]
    if not os.path.isabs(root):
        cfg["dataset"]["root"] = os.path.join(
            os.path.dirname(__file__), "..", root
        )

    train(cfg)
