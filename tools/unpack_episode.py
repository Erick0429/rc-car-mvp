"""
Three.js 시뮬레이터에서 내보낸 episode_*.json 파일을
학습용 데이터셋 구조로 변환합니다.

사용법:
  python tools/unpack_episode.py episode_1234567890.json
  python tools/unpack_episode.py episode_*.json          # 여러 파일 한번에

출력 구조:
  datasets/
    episode_0000/
      images/
        frame_00000.jpg
        frame_00001.jpg
        ...
      actions.npy    (N, 2) float32 [steering, throttle]
      meta.json
"""

import argparse
import base64
import json
import os
import sys
import numpy as np


def next_episode_num(datasets_dir: str) -> int:
    existing = [
        d for d in os.listdir(datasets_dir)
        if d.startswith('episode_') and os.path.isdir(os.path.join(datasets_dir, d))
    ]
    if not existing:
        return 0
    return max(int(d.split('_')[1]) for d in existing) + 1


def unpack(json_path: str, datasets_dir: str) -> None:
    print(f'읽는 중: {json_path}')
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    meta    = data.get('meta', {})
    actions = data['actions']       # [[steering, throttle], ...]
    images  = data.get('images', [])

    n_frames = len(actions)
    n_images = len(images)

    if n_images == 0:
        print('  [경고] 이미지가 없습니다. E 키로 내보낸 파일인지 확인하세요.')
    if n_images != n_frames:
        print(f'  [경고] 액션 {n_frames}개 vs 이미지 {n_images}개 — 짧은 쪽으로 맞춥니다.')
        n = min(n_frames, n_images)
        actions = actions[:n]
        images  = images[:n]
        n_frames = n

    ep_num  = next_episode_num(datasets_dir)
    ep_dir  = os.path.join(datasets_dir, f'episode_{ep_num:04d}')
    img_dir = os.path.join(ep_dir, 'images')
    os.makedirs(img_dir, exist_ok=True)

    # 이미지 저장
    for i, b64 in enumerate(images):
        raw = base64.b64decode(b64)
        path = os.path.join(img_dir, f'frame_{i:05d}.jpg')
        with open(path, 'wb') as f:
            f.write(raw)

    # 액션 저장
    np.save(
        os.path.join(ep_dir, 'actions.npy'),
        np.array(actions, dtype=np.float32)
    )

    # 메타 저장
    out_meta = {
        'episode':     ep_num,
        'frames':      n_frames,
        'image_size':  meta.get('image_size', [160, 90]),
        'action_keys': meta.get('action_keys', ['steering', 'throttle']),
        'source_file': os.path.basename(json_path),
        'recorded_at': meta.get('recorded_at', ''),
    }
    with open(os.path.join(ep_dir, 'meta.json'), 'w') as f:
        json.dump(out_meta, f, indent=2)

    print(f'  → datasets/episode_{ep_num:04d}/  ({n_frames} 프레임)')


def main():
    parser = argparse.ArgumentParser(description='episode_*.json → datasets/ 변환')
    parser.add_argument('files', nargs='+', help='episode_*.json 경로')
    parser.add_argument('--datasets', default='datasets', help='출력 폴더 (기본: datasets/)')
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    datasets_dir = os.path.join(root, args.datasets)
    os.makedirs(datasets_dir, exist_ok=True)

    for path in args.files:
        if not os.path.exists(path):
            print(f'[건너뜀] 파일 없음: {path}')
            continue
        unpack(path, datasets_dir)

    print('\n완료! 이제 학습을 시작하세요:')
    print('  cd train && python train_bc.py')


if __name__ == '__main__':
    main()
