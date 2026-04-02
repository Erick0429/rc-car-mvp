"""
파이프라인 테스트용 합성 데이터 생성기.

160×90 JPEG 이미지 (랜덤 노이즈 + 조향 시각화) + 액션 레이블을 만들어
datasets/episode_XXXX/ 구조로 저장합니다.

실제 에피소드를 수집하기 전에 train_bc.py가 오류 없이 돌아가는지
먼저 확인하는 데 사용합니다.

사용법:
  python tools/gen_synthetic_data.py              # 기본 500 프레임
  python tools/gen_synthetic_data.py --frames 200
"""

import argparse
import json
import os
import numpy as np
from PIL import Image, ImageDraw


def next_episode_num(datasets_dir: str) -> int:
    existing = [
        d for d in os.listdir(datasets_dir)
        if d.startswith('episode_') and os.path.isdir(os.path.join(datasets_dir, d))
    ]
    if not existing:
        return 0
    return max(int(d.split('_')[1]) for d in existing) + 1


def generate(n_frames: int, datasets_dir: str) -> None:
    ep_num  = next_episode_num(datasets_dir)
    ep_dir  = os.path.join(datasets_dir, f'episode_{ep_num:04d}')
    img_dir = os.path.join(ep_dir, 'images')
    os.makedirs(img_dir, exist_ok=True)

    rng     = np.random.default_rng(42)
    actions = []

    # Simulate a simple sinusoidal steering pattern
    for i in range(n_frames):
        t = i / n_frames
        steering = float(np.sin(t * 2 * np.pi * 3) * 0.8)   # ±0.8, 3 cycles
        throttle = float(0.7 + 0.2 * np.cos(t * 2 * np.pi))  # 0.5 ~ 0.9
        actions.append([steering, throttle])

        # Generate synthetic image: dark background + "road" stripe + steering indicator
        img_arr = np.zeros((90, 160, 3), dtype=np.uint8)

        # Sky (top third)
        img_arr[:30, :] = [50, 80, 120]

        # Ground (bottom two thirds) — dark grey
        img_arr[30:, :] = [40, 40, 40]

        # Road stripe (centered, perspective-like)
        road_left  = max(0, int(80 - 20 * (1 - steering * 0.3)))
        road_right = min(160, int(80 + 20 * (1 + steering * 0.3)))
        img_arr[30:, road_left:road_right] = [60, 60, 60]

        # Center dashes
        for y in range(35, 88, 8):
            img_arr[y:y+3, 78:82] = [200, 200, 0]

        # Steering indicator bar (bottom)
        bar_x = int(80 + steering * 40)
        img_arr[82:88, max(0, bar_x-3):min(160, bar_x+3)] = [255, 100, 0]

        # Small noise
        noise = rng.integers(-10, 10, img_arr.shape, dtype=np.int16)
        img_arr = np.clip(img_arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        img = Image.fromarray(img_arr)
        img.save(os.path.join(img_dir, f'frame_{i:05d}.jpg'), quality=85)

    np.save(os.path.join(ep_dir, 'actions.npy'), np.array(actions, dtype=np.float32))
    with open(os.path.join(ep_dir, 'meta.json'), 'w') as f:
        json.dump({
            'episode':     ep_num,
            'frames':      n_frames,
            'image_size':  [160, 90],
            'action_keys': ['steering', 'throttle'],
            'source_file': 'synthetic',
        }, f, indent=2)

    print(f'합성 데이터 생성 완료: datasets/episode_{ep_num:04d}/  ({n_frames} 프레임)')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--frames',   type=int, default=500)
    parser.add_argument('--datasets', default='datasets')
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    datasets_dir = os.path.join(root, args.datasets)
    os.makedirs(datasets_dir, exist_ok=True)
    generate(args.frames, datasets_dir)


if __name__ == '__main__':
    main()
