# rc-car-mvp

자율주행 RC카 실험용 MVP 레포입니다.

현재는 **Three.js 기반 브라우저 시뮬레이터**가 동작하며,
원형 트랙 위 차량을 수동 조작하거나 오토파일럿으로 주행시키고,
텔레메트리를 JSON으로 기록/export할 수 있습니다.

추가로 이번 버전에서는 다음이 반영되었습니다:
- front camera **picture-in-picture inset**
- render loop의 **real delta time** 적용
- `A` / `R` / `E` 키의 **repeat 방지**

## 현재 포함된 기능

- 원형 트랙 + 지면 렌더링
- 간단한 차량 kinematic model
- 수동 주행 (`↑`, `←`, `→`)
- 원형 트랙 pure-pursuit 기반 오토파일럿 (`A`)
- HUD 표시
  - MODE
  - SPD
  - STR
  - RAD
  - FRAMES
- front camera inset 표시
- 에피소드 녹화 (`R`) 및 JSON export (`E`)
- camera rig mount point

## 빠른 시작

### 요구사항
- Node.js 20+
- npm 10+

### 실행

```bash
cd sim
npm install
npm run dev
```

브라우저에서 보통 아래 주소로 확인할 수 있습니다.
- <http://localhost:5173>

### 빌드 확인

```bash
npm run build
```

## 조작법

| Key | Action |
|-----|--------|
| `A` | Autopilot 토글 (repeat 방지) |
| `↑` | 수동 모드 전진 |
| `←` / `→` | 수동 모드 조향 |
| `R` | 에피소드 녹화 시작 / 중지 (repeat 방지) |
| `E` | 녹화된 에피소드 JSON 다운로드 (repeat 방지) |

## 화면 구성

- **메인 뷰**: 기존 외부/world 카메라 시점
- **우하단 inset 뷰**: 차량 front camera 시점
- **좌상단 HUD**: 모드, 속도, 조향, 반경, 프레임 수
- **좌하단 힌트 바**: 키 조작 안내

## 프로젝트 구조

- `sim/`: Three.js 시뮬레이터
  - `src/main.ts` — 앱 진입점, 입력 처리, HUD 업데이트, render loop, front camera inset
  - `src/vehicle/car.ts` — 차량 모델 및 front camera rig mount
  - `src/vehicle/autopilot.ts` — 원형 트랙 pure-pursuit autopilot
  - `src/telemetry/recorder.ts` — 에피소드/텔레메트리 녹화
  - `src/world/track.ts` — 원형 트랙/지면 생성
  - `src/core/renderer.ts` — WebGL renderer 설정
- `server/`: 로컬 저장/API 서버
- `train/`: PyTorch 학습 코드
- `data/`: 생성 데이터/평가 결과
- `configs/`: 설정 파일
- `docs/`: 설계/로그 문서

## QA 체크리스트

### 1) 실행
- [ ] `npm run dev`로 서버가 정상 실행된다
- [ ] 브라우저에서 페이지가 에러 없이 열린다
- [ ] 원형 트랙, 차량, HUD가 정상 표시된다
- [ ] 우하단 front camera inset이 표시된다

### 2) 초기 상태
- [ ] 차량이 트랙 위에 정상 위치한다
- [ ] 차량이 트랙 진행 방향을 바라본다
- [ ] HUD에 MODE / SPD / STR / RAD / FRAMES가 표시된다

### 3) 수동 조작
- [ ] `↑` 누르면 차량이 전진한다
- [ ] `←` / `→` 누르면 차량이 좌우로 회전한다
- [ ] HUD의 `SPD`, `STR` 값이 조작에 맞춰 변한다
- [ ] front camera inset 시점도 차량 움직임에 맞춰 변한다

### 4) 오토파일럿
- [ ] `A` 누르면 MANUAL ↔ AUTOPILOT 전환된다
- [ ] AUTOPILOT에서 차량이 원형 트랙을 따라 주행한다
- [ ] `A` 키를 길게 눌러도 반복 토글되지 않는다

### 5) 녹화
- [ ] `R` 누르면 녹화 시작/중지가 된다
- [ ] 녹화 중 REC 표시가 뜬다
- [ ] `FRAMES` 숫자가 증가한다
- [ ] `R` 키를 길게 눌러도 반복 토글되지 않는다

### 6) Export
- [ ] 녹화 종료 후 `E` 누르면 JSON 파일이 다운로드된다
- [ ] `E` 키를 길게 눌러도 중복 다운로드되지 않는다
- [ ] JSON에 `step`, `timestamp`, `x`, `z`, `heading`, `speed`, `steering`, `throttle`, `mode`가 기록된다

## 구현 메모

### Real delta time
이전에는 `dt = 0.016` 고정값을 사용했지만,
현재는 `requestAnimationFrame` timestamp 기반으로 실제 경과 시간을 계산합니다.

안정성을 위해 프레임 간격은 상한(`MAX_DT = 0.05`)으로 clamp합니다.

### Key repeat 방지
브라우저의 `keydown` repeat로 인해 토글 키가 여러 번 입력되는 문제를 막기 위해:
- `A`
- `R`
- `E`

는 `event.repeat === false`일 때만 처리합니다.

반면 화살표 키 주행 입력은 기존처럼 지속 입력이 가능합니다.

## 현재 한계

- front camera는 inset 표시까지이며, 별도 recording/render target 파이프라인은 아직 없음
- 차량 물리 모델은 단순화된 MVP 버전임
- 오토파일럿은 원형 트랙 데모용 pure-pursuit 수준임
- behavior cloning 학습 파이프라인은 아직 연결 전 단계임

## 다음 단계

- [ ] front camera frame export / dataset 연결
- [ ] 속도 clamp / 브레이크 / 더 현실적인 vehicle model
- [ ] 오토파일럿 복귀 안정성 개선
- [ ] behavior cloning 학습 파이프라인 연결
- [ ] closed-loop 평가

## 목표

- [x] Three.js 시뮬레이터 골격
- [x] 차량 kinematic model
- [x] front camera rig mount
- [x] autopilot (원형 트랙 pure-pursuit)
- [x] 에피소드/텔레메트리 녹화 구조
- [x] HUD (모드/속도/조향/반경/프레임)
- [x] front camera inset 표시
- [x] real delta time 적용
- [x] key repeat 방지
- [ ] front camera frame export
- [ ] behavior cloning 학습
- [ ] closed-loop 평가
