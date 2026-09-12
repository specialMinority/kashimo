# Kashimo 디자인 및 일괄 삭제 작업 기록

## 요청과 범위
- 2026-09-12: GitHub `specialMinority/kashimo`의 기존 기능을 유지하면서 디자인 개편 및 거래 목록 일괄 삭제 구현.
- 사용자 제공 고양이 사진으로 AI 캐릭터 아이콘 생성. 실제 고양이 사진을 화면 배경으로 사용.
- Android 네이티브 앱과 iPhone 홈 화면에 설치하는 웹앱 지원.
- 소스, 빌드 산출물, 검증 결과와 재현 방법을 함께 납품.

## 시작 상태
- 원격 기본 브랜치: `master`. 작업 브랜치: `feature/cat-design-bulk-delete`.
- React Native 0.81.5 / Expo SDK 54 / React 19 / TypeScript.
- 일본어 사용자 화면, JPY 기반 개인 간 대여·차입 기록 앱.
- Android SQLite, 웹 localStorage 어댑터. 기존 데이터 키와 스키마를 유지한다.
- 기존 GitHub Pages `/kashimo/` 배포 및 EAS Android 프로젝트가 존재한다.
- 기존 CONTEXT.md의 색상 고정 규칙은 이번 사용자의 디자인 변경 요청에 따라 새 테마로 갱신한다.

## 구현 방향
- 크림색 바탕, 차분한 녹색 액션, 고양이 실사 배경과 AI 마스코트.
- 목록 선택 모드, 항목별 선택, 현재 필터 결과 전체 선택, 개수 명시 삭제 확인.
- 일괄 삭제는 저장소 단위 원자적 처리 및 삭제 대상 알림 취소를 포함한다.
- 취소, 오류, 빈 목록, 필터 변경, 재시작 후 영속성까지 검증한다.
- 기존 등록/수정/완료/정산 취소/백업 기능을 보존한다. 기존 README의 부분상환 설명은 코드상 별도 기능이 없어 완료로 주장하지 않는다.

## 진행 및 디버깅
- 저장소 복제 및 기존 문서/앱 설정 확인 완료.
- 디자인·기능 구현과 자동 검증 완료. 실기기 시험 범위는 최종 검증 문서에 별도 기록한다.

## 검증 결과
- TypeScript 검사 통과.
- 저장소/알림/날짜 자동 테스트 15개 통과.
- 웹 프로덕션 export 성공, PWA manifest/서비스 워커 생성 성공.
- Chrome 통합 테스트 11개 항목 통과. 선택/전체 삭제, 취소, 저장 실패/재시도, 영속성 및 합계, 등록/수정, 완료/취소, JSON 백업/복원, 오프라인, 4개 화면 폭, 런타임 오류 검증.
- 실제 GitHub Pages 게시 및 공개 URL 스모크 검증 성공.
- GitHub Actions Android APK 컴파일 및 업로드 성공 (첫 빌드 34701981116).
- 실기기 Android/iPhone 설치 테스트는 수행하지 않았다.

## 납품
- 웹: https://specialminority.github.io/kashimo/
- APK·소스·웹 패키지: https://github.com/specialMinority/kashimo/releases/tag/v1.1.0-preview
- 최종 빌드·서명·WebKit 검증: [FINAL_VERIFICATION.md](FINAL_VERIFICATION.md).

## 2026-09-13 디버깅 메모
- npm 의존성 다운로드는 샌드박스 네트워크 제한으로 중단 후 승인된 네트워크 실행으로 완료.
- ImageBackground의 자동 크기가 웹 화면 밖으로 넘침 → 명시적인 백분율 크기의 Image와 루트 overflow 처리.
- 작은 화면의 일본어 헤드라인 줄바꿈 → 뷰포트별 글자 크기 조정.
- Ionicons index import가 모든 폰트를 내보냄 → 직접 Ionicons 모듈 import로 33개 자산을 15개로, JS 번들은 약 2.34 MB에서 1.40 MB로 축소.
- 쓰지 않는 Reanimated 3 및 구버전 Android 패치 제거. 기존 Swipeable은 React Native Animated를 사용하므로 기능 유지.
- 테스트용 TypeScript 로더의 default import 해석 오류 → esModuleInterop 활성화. 실제 앱 오류와 구분.
- 화면 읽기 도구에서 아이콘 글리프가 버튼 이름에 포함됨 → 웹 aria-hidden 및 네이티브 접근성 제외 속성 추가.
- EAS CLI는 로컬 상태 파일의 계정명과 달리 실제 조회 결과 Not logged in. 사용자 로그인 변경 없이 GitHub Actions preview 빌드 경로 채택.
- GitHub Actions APK는 Expo 개발 키로 서명하는 설치/검증용 산출물. Play 배포 서명이나 스토어 제출을 완료한 것으로 주장하지 않는다.

## 기술 참조
- [Expo PWA](https://docs.expo.dev/guides/progressive-web-apps/): manifest 및 서비스 워커 구성을 확인.
- [Expo SQLite SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/): 독점 트랜잭션 API와 롤백 사용.
- 설치된 Expo config 타입에서 experiments.baseUrl 지원을 확인하고 /kashimo 하위 경로에 적용.

## 납품 직전 마무리
- 최종 화면 캡처는 전환 애니메이션 종료 후 생성. 테스트 데이터는 격리된 브라우저에서만 사용.
- 화면 읽기 도구의 체크 상태도 aria-checked로 노출.
- 탭 라벨을 아이콘 아래로 통일하여 넓은 화면에서 겹침 제거.
- 기존 완료/취소와 JSON 백업/복원까지 브라우저에서 추가 검증 완료.
- 자세한 설치 방법, 검증 범위 및 기존 OAuth 제한은 DELIVERY.md 참고.

## 최종 납품 검증 (2026-09-13 KST)
- 최종 앱 소스 `7ea2ef0cdc2697cfcdb44c47d91802c53fcf585d`에서 GitHub Actions `34702734430`의 웹 검증과 Android 빌드 모두 성공.
- 내려받은 APK의 ZIP CRC와 Android v2 서명을 공식 apksig 라이브러리로 검증. 서명 주체는 Android Debug.
- WebKit 26.5/Windows에서 삭제·등록·수정·정산·백업/복원 8개 시나리오 통과.
- WebKit의 context.setOffline(true) 뒤 reload에서 내부 오류가 발생하여 테스트 도구의 에뮬레이션과 실제 통신 중단을 구분. 독립 로컬 서버를 종료하고 네트워크 실패를 확인한 상태에서는 캐시를 사용한 재시작·저장 기록 표시 및 네 가지 화면 폭 검증이 모두 통과. 이 결과를 실제 iPhone 기기 시험과 동일시하지 않는다.
- 최종 문서 갱신은 검증된 앱 소스에 기능 변경을 추가하지 않는다.

## Android 하단 아이콘 잘림 수정 (1.1.1, 2026-09-13)
- 사용자 실기기 사진에서 홈/설정 아이콘은 세로 조각으로, 기록/추가는 배경만 표시되는 문제 접수.
- React Navigation의 기본 아이콘 슬롯 31×28 안에 좌우 padding 28px를 적용해 Android Text 글리프에 약 3px만 남는 것이 원인. 화면 상단 아이콘은 정상으로, 폰트 누락과 구분했다.
- 슬롯과 배경을 50×32로 고정하고 padding 대신 중앙 정렬을 적용. 글리프 영역을 24×24로 확보하고 Android 기본 글꼴 패딩/아이콘 글자 확대를 해제.
- 앱 버전 1.1.1, Android versionCode 2. 기존 APK와 동일한 개발 서명으로 업데이트 설치 가능 여부를 검증한다.
- Android 에뮬레이터에서 기존 APK 재현, 새 APK 덮어쓰기 설치, 네 탭 및 시스템 글꼴 1.3배 화면을 확인하는 CI 단계를 추가한다.
- 최종 결과: APK 서명·버전·무결성 통과, 기존 APK 위 업데이트 설치 성공, Android 에뮬레이터 12개 화면 캡처 및 직접 검토 통과. [원인·수정 전후 화면](ANDROID_TAB_FIX.md).

- 설정의 고정 버전 문자열을 app.json 참조로 변경해 설치 파일과 화면에 같은 버전이 표시되게 했다.
