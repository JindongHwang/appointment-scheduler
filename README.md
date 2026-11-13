# 노라보자 (Nolaboda)

친구들과 약속 날짜를 정하는 작은 웹앱입니다. 각자 가능한 날짜를 달력에 찍으면 가장 많이 겹치는 날을 보여주고, 날짜를 확정할 수 있습니다.

## 구조

서버가 없습니다. 정적 파일(HTML·CSS·JS)을 깃허브 페이지 같은 곳에 올리면, 브라우저가 Supabase에 직접 저장하고 읽습니다.

| 파일 | 역할 |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | 화면 |
| `scheduler.js` | 겹치는 날짜 계산 |
| `roomSession.js` | 초대 링크(`?room=...`) 처리 |
| `roomApi.js` | Supabase 함수 호출 |
| `config.js` | Supabase 주소와 공개 키 (직접 채워야 함) |
| `supabase-schema.sql` | Supabase에 한 번 실행할 테이블·함수 |

## 배포

`DEPLOY.md`를 순서대로 따라 하세요. 요약하면 이렇습니다.

1. Supabase 프로젝트를 만들고 `supabase-schema.sql`을 실행합니다.
2. `config.js`에 프로젝트 주소와 공개 키를 넣습니다.
3. 깃허브 페이지를 켭니다.

## 내 컴퓨터에서 열어 보기

`index.html`을 브라우저로 열면 됩니다. `config.js`가 비어 있으면 이 브라우저에만 저장되는 체험 모드로 열리고, 채워져 있으면 실제 Supabase에 저장됩니다.

## 접근 방식

- 로그인이 없습니다. 초대 링크(방 주소)를 아는 사람은 누구나 그 방을 보고 수정할 수 있습니다.
- 방 주소는 추측할 수 없는 긴 무작위 값이고, 방 목록을 조회하는 방법은 없습니다.
- 브라우저는 `supabase-schema.sql`의 함수 5개만 호출하며, 테이블을 직접 읽으면 아무것도 나오지 않습니다.
- `config.js`의 공개 키는 웹페이지에 넣어도 되는 키입니다. 비밀 키(`sb_secret_...`, `service_role`)는 이 프로젝트 어디에도 넣지 마세요.

## 테스트

```text
npm test
```

설치할 패키지는 없습니다. Node만 있으면 됩니다.
