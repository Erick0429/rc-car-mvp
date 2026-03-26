# rc-car-mvp

Three.js 기반 RC 자율주행 시뮬레이터 MVP.

## 실행 방법 (Run)

```bash
cd sim
npm install
npm run dev      # Vite dev server → http://localhost:5173
```

빌드 확인:

```bash
npm run build    # TypeScript 타입 체크 + Vite 번들
```

### 키 조작

| Key | Action |
|-----|--------|
| `A` | Autopilot 토글 (MANUAL ↔ AUTOPILOT) |
| `↑` | 수동 모드 Throttle |
| `←` / `→` | 수동 모드 조향 |
| `R` | 에피소드 녹화 시작/중지 |
| `E` | 녹화된 에피소드 JSON 다운로드 |

## 구조

- `sim/`: Three.js 시뮬레이터
  - `src/vehicle/car.ts` — 차량 모델 (카메라 리그 포함)
  - `src/vehicle/autopilot.ts` — 원형 트랙 pure-pursuit autopilot
  - `src/telemetry/recorder.ts` — 에피소드/텔레메트리 녹화
  - `src/world/track.ts` — 원형 트랙
- `server/`: 로컬 저장/API 서버
- `train/`: PyTorch 학습 코드
- `data/`: 생성 데이터/평가 결과
- `configs/`: 설정 파일
- `docs/`: 설계/로그 문서

## 목표

- [x] Three.js 시뮬레이터 골격
- [x] 차량 kinematic model
- [x] front camera rig 플레이스홀더
- [x] autopilot (원형 트랙 pure-pursuit)
- [x] 에피소드/텔레메트리 녹화 구조
- [x] HUD (모드/속도/조향/반경/프레임)
- [ ] front camera 영상 출력
- [ ] behavior cloning 학습
- [ ] closed-loop 평가
