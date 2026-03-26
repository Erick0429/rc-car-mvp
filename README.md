# rc-car-mvp

Three.js 기반 RC 자율주행 시뮬레이터 MVP.

## 목표
- 시뮬레이터에서 전방 카메라 영상 생성
- autopilot으로 데이터 수집
- behavior cloning 학습
- policy closed-loop 평가

## 구조
- `sim/`: Three.js 시뮬레이터
- `server/`: 로컬 저장/API 서버
- `train/`: PyTorch 학습 코드
- `data/`: 생성 데이터/평가 결과
- `configs/`: 설정 파일
- `docs/`: 설계/로그 문서
