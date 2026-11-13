# 배포하기

처음 한 번만 하면 됩니다. Supabase와 깃허브 둘 다 무료 플랜으로 충분합니다.

## 1. Supabase 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다. 예전에 만든 프로젝트가 있으면 그걸 써도 됩니다.
2. 프로젝트의 SQL Editor를 열고 `supabase-schema.sql` 내용을 전부 붙여넣어 실행합니다. 여러 번 실행해도 괜찮습니다.
3. 프로젝트의 Connect 창에서 두 값을 복사합니다.
   - 프로젝트 주소: `https://xxxx.supabase.co`
   - 공개 키: `sb_publishable_...` (예전 프로젝트라면 `anon` 키)

비밀 키(`sb_secret_...`, `service_role`)는 필요 없습니다. 복사하지 마세요.

## 2. config.js 채우기

```js
window.NOLABODA_CONFIG = {
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseKey: 'sb_publishable_...',
};
```

저장한 뒤 `index.html`을 브라우저로 열어 확인합니다. 초대 링크 칸에 `?room=room_...`이 보이고, 이름을 넣고 날짜를 찍은 뒤 새로고침해도 남아 있으면 Supabase 연결이 된 것입니다.

확인이 끝나면 `config.js`를 커밋하고 푸시합니다.

## 3. 깃허브 페이지 켜기

1. 무료 플랜에서는 공개 저장소만 깃허브 페이지를 쓸 수 있습니다. 저장소가 비공개라면 Settings에서 공개로 바꿉니다.
2. 저장소 Settings의 Pages에서 Source를 "Deploy from a branch"로, 브랜치를 `main`, 폴더를 `/ (root)`로 고르고 저장합니다.
3. 1~2분 뒤 `https://<깃허브 아이디>.github.io/appointment-scheduler/`로 접속합니다.

## 4. 친구에게 보내기

페이지를 열면 방이 자동으로 만들어집니다. 초대 링크의 "복사"를 눌러 친구에게 보내면 됩니다. 다른 사람이 고른 날짜는 5초쯤 뒤에 자동으로 반영됩니다.

## 알아둘 점

- Supabase 무료 프로젝트는 일주일쯤 사용이 거의 없으면 일시정지됩니다. 이를 줄이려고 깃허브 액션(`.github/workflows/keep-supabase-awake.yml`)이 하루 세 번 Supabase를 호출합니다. 정지 방지가 보장되지는 않습니다.
- 그래도 정지됐다면 페이지에 안내가 뜹니다. Supabase 대시보드에서 프로젝트를 다시 켜세요. 데이터는 남아 있습니다.
- 공개 저장소에서는 60일 동안 저장소 활동이 없으면 깃허브가 예약 실행을 끕니다. 꺼졌다는 메일을 받으면 저장소의 Actions 탭에서 "Keep Supabase awake" 워크플로를 다시 켜세요.
- 참여자는 페이지의 "삭제"로 지울 수 있습니다. 방은 브라우저에서 지울 수 없으니, 정리하려면 Supabase 대시보드의 Table Editor에서 `rooms`의 행을 지우세요. 참여자도 함께 지워집니다.
- `supabase-schema.sql`이 바뀐 버전을 받으면 SQL Editor에서 다시 실행해야 합니다. 여러 번 실행해도 안전합니다.
- 깃허브 페이지 대신 Cloudflare Pages, Netlify 같은 다른 정적 호스팅에 올려도 똑같이 동작합니다. 이쪽은 비공개 저장소도 연결할 수 있습니다.
