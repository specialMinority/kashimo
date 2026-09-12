# Web/PWA 하단 탭 글자 잘림 수정

작업일: 2026-09-13 KST. Android 1.1.1 이후 접수된 웹 전용 표시 문제.

## 재현과 원인

- 기존 배포 번들: `index-d9bde7d6d8b8928f345f7fdde4d22787.js`.
- 390×844 화면에서 Chrome과 WebKit 모두 하단 탭 이름의 아래쪽이 잘렸다.
- 탭바 68px에서 테두리 1px, 상하 여백 16px, 탭 버튼 상하 여백 10px, 아이콘 32px를 빼면 라벨에 9px만 남았다.
- React Native Web의 한 줄 Text에는 `overflow: hidden`이 적용되며, flex 자식의 기본 축소 때문에 라벨 높이가 9px가 되었다. Chrome에서 `clientHeight=9 / scrollHeight=12`, WebKit에서 `9 / 14`를 확인했다.
- 새 회귀 검사를 수정 전 실행해 `label vertically clipped (9/12)` 실패를 확인했다. 폰트 파일 누락이나 Android 아이콘 슬롯 문제와 구분된다.

## 수정

- `src/navigation/TabNavigator.tsx`: 웹에서만 탭바 높이를 76px로 확보한다. 기존 safe-area 하단 여백 계산을 유지한다.
- 웹 라벨에 `lineHeight: 16`, `flexShrink: 0`을 적용해 한 줄 전체 높이를 유지한다.
- Android는 기존 68px 탭바와 라벨 스타일을 유지한다. 이번 변경은 웹 배포이며 APK 버전 1.1.1은 그대로다.
- 수정한 프로덕션 번들: `index-96cc8834d77307dc690a96489fc283c8.js`.
- 서비스 워커 캐시: `kashimo-static-v1-4a56a33bb4f8`.

## 검증

- `npm run typecheck`, `npm run build:web` 성공.
- `npm run test:web-tabs`: Chrome/WebKit × 8개 화면 조건 × 4개 선택 탭 × 4개 라벨 = 256개 검사 통과.
- 화면 조건: 320×568, 390×844, 430×932, 844×390 가로, 768×1024, 1440×900, 390×600, 390×844에서 상단 44px/하단 34px 예약 공간 모사.
- 라벨의 실제 텍스트 범위와 모든 잘림 조상 경계, scroll/client 크기, 탭 내부 배치, 최소 터치 높이, 하단 예약 공간, 네 탭 전환 및 런타임 오류를 검증한다.
- 새 브라우저 컨텍스트를 사용하며 기록 생성·변경 없이 검사한다. WebKit/예약 공간 모사는 iPhone 실기기 시험을 의미하지 않는다.
- 결과와 원본 캡처: `test-results/web-tabs/`. 실패한 실행은 이전 성공 결과를 덮어써 오래된 결과를 사용하지 않도록 한다.
- GitHub Pages 재배포 완료. 공개 주소에서도 새 번들 `96cc8834d77307dc690a96489fc283c8` 확인 후 동일한 Chrome/WebKit 256개 검사를 통과했다. 공개 검사 결과·원본 캡처는 `test-results/web-tabs-live/`, manifest/이미지 로딩 검사는 `test-results/live-smoke.json`에 보관한다.
- README 웹 목록/일괄 삭제 스크린샷을 수정된 프로덕션 빌드에서 다시 촬영했다. Android 원본 캡처는 유지한다.

## 재실행 및 업데이트

1. `npm run build:web`
2. 별도 터미널에서 `npm run preview:web`
3. `npm run test:web-tabs`
4. 공개 배포 확인: `npm run test:web-tabs -- https://specialminority.github.io/kashimo/`

서비스 워커는 새 버전을 다운로드한 뒤 이전 웹앱 탭이 모두 닫히면 활성화된다. 기존 설치에서 이전 화면이 남으면 온라인으로 새로고침해 업데이트를 받은 뒤, 웹앱과 해당 브라우저 탭을 모두 닫고 다시 연다. 사이트 데이터 삭제는 필요하지 않으며 기존 localStorage 기록을 보존한다.
