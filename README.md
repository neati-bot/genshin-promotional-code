# Genshin Asia Promo Code Notifier

원신 Asia 서버에서 사용 가능한 새 프로모션 코드가 [fandom 위키](https://genshin-impact.fandom.com/wiki/Promotional_Code)에 올라오면 Discord로 알림을 보내는 GitHub Actions 봇입니다. 자체 서버나 데이터베이스 없이 cron + 리포 커밋만으로 동작합니다.

## 동작 방식

1. GitHub Actions cron(기본 30분 주기)이 발화
2. fandom MediaWiki API에서 `Promotional_Code` 페이지의 wikitext를 가져옴
3. `{{Code Row|...}}` 템플릿을 파싱해 활성 코드 목록을 추출
4. Asia 서버에서 redeem 가능한 코드만 필터링 (G / A / SEA / ASIA)
5. `state/seen-codes.json`과 비교해 새 코드만 Discord 웹훅으로 알림
6. 갱신된 state 파일을 자동으로 커밋

## 셋업

### 1. 리포 fork

이 리포를 본인 GitHub 계정으로 fork. **공개 리포로 두는 것을 권장** — GitHub Actions가 무제한 무료로 동작합니다.

### 2. Discord 웹훅 발급

알림을 받을 Discord 채널에서:

`채널 톱니바퀴 → 연동 → 웹후크 → 새 웹후크` → URL 복사

### 3. Secret 등록

fork된 리포의 `Settings → Secrets and variables → Actions → New repository secret`:

- 이름: `DISCORD_WEBHOOK_URL`
- 값: 위에서 복사한 웹훅 URL

> ⚠️ 웹훅 URL은 코드/커밋/로그 어디에도 절대 평문으로 기록하지 마세요. Secret으로 등록하면 워크플로우 로그에서도 자동으로 마스킹됩니다.

### 4. 워크플로우 활성화 + 첫 실행

1. fork 직후엔 Actions 탭이 비활성화되어 있을 수 있어요. `Actions` 탭에서 "I understand my workflows, go ahead and enable them" 클릭.
2. 좌측 메뉴에서 **Check Genshin Codes** 선택 → 우측 상단 **Run workflow** 버튼으로 즉시 실행.
3. Discord 채널에 `✅ Genshin Code Notifier — Server on` 메시지가 도착하면 정상.

이후 30분마다 자동으로 새 코드만 알림드립니다.

## 토글 가이드

| 변경하고 싶은 것 | 수정 위치 |
| --- | --- |
| 알림 주기 | `.github/workflows/check-codes.yml`의 `cron:` 한 줄 |
| 필터 범위 (예: EU/NA 코드도 받기) | `config.ts`의 `ALLOWED_SERVERS` |
| 연속 실패 알림 임계치 | `config.ts`의 `FAILURE_THRESHOLD` |
| HTTP 타임아웃 | `config.ts`의 `HTTP_TIMEOUT_MS` |

수정 후 push 하면 다음 cron부터 자동 반영됩니다.

## 로컬 개발

```bash
npm install
npm test                        # 파서/필터 회귀 테스트
npm run typecheck               # 타입 체크
DISCORD_WEBHOOK_URL=<test-webhook> npm run check   # 1회 dry-run
```

`tests/fixtures/sample-wikitext.txt`는 실제 fandom API에서 캡처한 샘플입니다. 위키 포맷이 바뀌었다고 의심되면 `npx tsx scripts/capture-fixture.ts`로 갱신.

## 알림 형식 예시

```
🎁 새 원신 코드: GENSHINGIFT
[코드 입력하기 →](https://genshin.hoyoverse.com/en/gift?code=GENSHINGIFT)

보상: 50 × Primogem, 3 × Hero's Wit
만료: 기한 없음    발견: 2020-11-10    서버: G
```

링크를 클릭하면 HoYoLAB 코드 입력 페이지가 열리고, 거기서 본인의 Asia 서버를 선택해 redeem 합니다.

## 보안

- 외부로 나가는 HTTP 요청은 fandom 위키 API와 등록된 Discord 웹훅 두 곳뿐입니다.
- 에러 메시지에서 웹훅 URL을 자동으로 `<redacted-webhook>`로 치환합니다 (`src/notify.ts`).
- 의존성은 dev 한정으로 `typescript`, `tsx`, `vitest`, `@types/node`만 사용. 런타임 의존성 0개.

## 라이선스

이 리포는 fandom 위키의 콘텐츠를 가져와 알림 용도로만 사용합니다. fandom 콘텐츠는 [CC-BY-SA](https://www.fandom.com/licensing) 라이선스를 따릅니다.
