# rc-car-mvp

자율주행 RC카 모방학습 파이프라인 — Three.js 시뮬레이터 + Webots 물리 시뮬레이터 + PyTorch 학습

---

## 전체 파이프라인

```
[1] Webots 시뮬레이터에서 수동 주행 → 카메라 영상 + 액션 데이터 수집
[2] PyTorch (MPS/CUDA/CPU) 로 SmallCNN 모방학습
[3] 학습된 모델로 Webots 자율주행 검증
[4] Three.js 브라우저 시뮬레이터로 경량 프로토타이핑
```

---

## 프로젝트 구조

```
rc-car-mvp/
  sim/                          ← Three.js 브라우저 시뮬레이터
    src/
      main.ts                   — 앱 진입점, 입력 처리, HUD, render loop
      vehicle/car.ts            — 차량 kinematic model
      vehicle/autopilot.ts      — pure-pursuit 오토파일럿
      telemetry/recorder.ts     — 에피소드 녹화 (JSON export)
      world/track.ts            — 원형 트랙 생성
      core/renderer.ts          — WebGL renderer

  webots/                       ← Webots 물리 시뮬레이터
    worlds/rc_track.wbt         — 시뮬레이션 월드 (트랙 + RC카 + 카메라)
    controllers/
      data_collector/
        data_collector.py       — 수동 조작 데이터 수집 (R/S/Q + 방향키)
      autonomous_driver/
        autonomous_driver.py    — 학습 모델로 자율주행

  train/
    model.py                    — SmallCNN 모델 정의
    train_bc.py                 — Behavior Cloning 학습 루프
    requirements.txt

  datasets/                     ← Webots 수집 데이터 (episode_XXXX/)
  models/                       ← 학습된 모델 저장 (model.pth)
  configs/
    train.yaml                  — 학습 설정
    sim.json                    — 시뮬레이터 설정
  docs/
    roadmap.md
```

---

## 빠른 시작

### 1단계: Webots 데이터 수집

```bash
# Webots 설치: https://cyberbotics.com (R2023b 이상)
pip install opencv-python numpy

# Webots에서 webots/worlds/rc_track.wbt 열기
# 컨트롤러: data_collector 선택 후 시뮬레이션 실행
# R: 녹화시작  /  방향키: 조작  /  S: 저장  /  Q: 종료
```

수집 데이터 형식:
```
datasets/episode_0000/
  images/frame_00000.jpg  ...  (640x480 JPEG)
  actions.npy                  (N, 2) float32 [steering, throttle]
  meta.json
```

### 2단계: 모델 학습 (맥미니 M4 / MPS)

```bash
cd train
pip install -r requirements.txt
python train_bc.py
# 학습된 모델 -> models/model.pth
```

### 3단계: Webots 자율주행 검증

```
Webots에서 컨트롤러를 autonomous_driver 로 변경 후 실행
```

### Three.js 브라우저 시뮬레이터 (경량 프로토타이핑)

```bash
cd sim
npm install
npm run dev
# http://localhost:5173
```

---

## Three.js 시뮬레이터 조작법

| 키 | 동작 |
|----|------|
| `↑` | 전진 |
| `←` / `→` | 조향 |
| `A` | 오토파일럿 토글 |
| `R` | 녹화 시작/중지 |
| `E` | 에피소드 JSON 다운로드 |

---

## 두 기기 분산 활용 (맥북 M4 Pro + 맥미니 M4)

```
맥북 M4 Pro (20코어 GPU)        맥미니 M4 (32GB 메모리)
  Webots 시뮬레이션 실행    →   SSH로 학습 서버 운용
  데이터 수집                   PyTorch MPS 학습
  자율주행 검증                 models/model.pth 저장
```

Thunderbolt Bridge로 연결 시 ~40GB/s 데이터 전송 가능.

---

## QA 체크리스트

### Three.js 시뮬레이터
- [ ] `npm run dev` 정상 실행
- [ ] 트랙/차량/HUD 표시
- [ ] 수동 조작 동작
- [ ] 오토파일럿 동작
- [ ] 녹화 및 JSON export

### Webots 데이터 수집
- [ ] `rc_track.wbt` 월드 로드
- [ ] 방향키 차량 조작
- [ ] R -> S 후 datasets/ 폴더에 episode 생성
- [ ] actions.npy shape 확인: (N, 2)

### 학습
- [ ] `python train_bc.py` 오류 없이 실행
- [ ] 에포크마다 train/val loss 출력
- [ ] `models/model.pth` 생성

### 자율주행 검증
- [ ] autonomous_driver 컨트롤러 로드
- [ ] 모델 추론 후 차량 이동 확인
