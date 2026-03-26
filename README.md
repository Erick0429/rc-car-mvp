# rc-car-mvp

Three.js 기반 RC 자율주행 시뮬레이터 MVP입니다.

브라우저에서 원형 트랙 위 차량을 직접 조작하거나 오토파일럿으로 주행시키고, 에피소드 텔레메트리를 JSON으로 기록/export할 수 있습니다.

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
- 에피소드 녹화 (`R`) 및 JSON export (`E`)
- front camera rig placeholder

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

Vite dev server가 뜨면 브라우저에서 보통 아래 주소로 확인할 수 있습니다.

- <http://localhost:5173>

### 빌드 확인

```bash
npm run build
```

## 조작법

| Key | Action |
|-----|--------|
| `A` | Autopilot 토글 (MANUAL ↔ AUTOPILOT) |
| `↑` | 수동 모드 전진 |
| `←` / `→` | 수동 모드 조향 |
| `R` | 에피소드 녹화 시작 / 중지 |
| `E` | 녹화된 에피소드 JSON 다운로드 |

## 프로젝트 구조

- `sim/`: Three.js 시뮬레이터
  - `src/main.ts` — 앱 진입점, 입력 처리, HUD 업데이트, render loop
  - `src/vehicle/car.ts` — 차량 모델 및 camera rig placeholder
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

### 2) 초기 상태
- [ ] 차량이 트랙 위에 정상 위치한다
- [ ] 차량이 트랙 진행 방향을 바라본다
- [ ] HUD에 MODE / SPD / STR / RAD / FRAMES가 표시된다

### 3) 수동 조작
- [ ] `↑` 누르면 차량이 전진한다
- [ ] `←` / `→` 누르면 차량이 좌우로 회전한다
- [ ] HUD의 `SPD`, `STR` 값이 조작에 맞춰 변한다

### 4) 오토파일럿
- [ ] `A` 누르면 MANUAL ↔ AUTOPILOT 전환된다
- [ ] AUTOPILOT에서 차량이 원형 트랙을 따라 주행한다
- [ ] HUD의 MODE 표시가 정상 변경된다

### 5) 녹화
- [ ] `R` 누르면 녹화 시작/중지가 된다
- [ ] 녹화 중 REC 표시가 뜬다
- [ ] `FRAMES` 숫자가 증가한다

### 6) Export
- [ ] 녹화 종료 후 `E` 누르면 JSON 파일이 다운로드된다
- [ ] JSON에 `step`, `timestamp`, `x`, `z`, `heading`, `speed`, `steering`, `throttle`, `mode`가 기록된다

## 현재 한계

- front camera는 아직 placeholder이며 실제 영상 출력은 없음
- delta time이 고정값 기반이라 프레임레이트 변화에 민감할 수 있음
- 차량 물리 모델은 단순화된 MVP 버전임
- 키 repeat 방지 로직은 아직 없음

## 다음 단계

- [ ] front camera 실제 출력
- [ ] delta time 실시간 계산 적용
- [ ] 토글 키 repeat 방지
- [ ] behavior cloning 학습 파이프라인 연결
- [ ] closed-loop 평가

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
