# things-map API 설계

## 인증 규칙
- 🔓 공개 (비로그인 가능)
- 🔐 로그인 필요
- 🛡️ 관리자 전용

---

## AUTH

### POST /api/auth/login 🔓
승인코드로 로그인

**Request**
```json
{ "name": "홍길동", "approvalCode": "uuid-xxxx" }
```
**Response**
```json
{ "user": { "id", "name", "team", "role" } }
```
→ httpOnly 쿠키에 JWT 설정 (30일)

---

### POST /api/auth/logout 🔐
로그아웃 (쿠키 삭제)

---

### GET /api/auth/me 🔐
내 정보 반환
```json
{ "id", "name", "team", "role", "isActive" }
```

---

## STORES

### GET /api/stores 🔓
매장 목록 (지도/리스트 뷰)

**Query params**
| 파라미터 | 설명 | 기본값 |
|---|---|---|
| `lat`, `lng` | 중심 좌표 | 서울 시청 |
| `radius` | 반경 (m) | 3000 |
| `category` | 카테고리 ID | - |
| `theme` | 테마 태그 | - |
| `minRating` | 최소 평점 | - |
| `sort` | distance / rating / latest | distance |
| `page` | 페이지 | 1 |
| `limit` | 개수 | 20 |

**Response**
```json
{
  "stores": [{
    "id", "name", "address", "lat", "lng",
    "category": { "id", "name", "icon" },
    "themeTags": [],
    "internalRating": { "avgTotal", "reviewCount" }
  }],
  "total": 120,
  "page": 1
}
```

---

### GET /api/stores/search 🔓
검색 + 자동완성

**Query**: `?q=성수&limit=5`

**Response**
```json
{
  "results": [{ "id", "name", "address", "category" }]
}
```

---

### POST /api/stores 🛡️
매장 생성 (관리자)

**Request**
```json
{
  "name": "성수 카페",
  "address": "서울 성동구 ...",
  "lat": 37.544,
  "lng": 127.055,
  "phone": "02-000-0000",
  "businessHours": "{\"mon\": \"09:00-22:00\"}",
  "categoryId": "cuid",
  "themeTags": ["데이트", "주차"],
  "naverUrl": "https://...",
  "kakaoUrl": "https://...",
  "googleUrl": "https://...",
  "menus": [{ "name": "아메리카노", "price": 5000, "isRepresentative": true }]
}
```

---

### GET /api/stores/:id 🔓
매장 상세

**Response**
```json
{
  "id", "name", "address", "lat", "lng", "phone", "businessHours",
  "category": { "id", "name" },
  "themeTags": [],
  "menus": [],
  "internalRating": {
    "avgTotal", "avgTaste", "avgPrice", "avgService", "avgAmbiance", "avgCleanliness",
    "reviewCount"
  },
  "naverUrl", "kakaoUrl", "googleUrl"
}
```

---

### PUT /api/stores/:id 🛡️
매장 수정 (관리자)

---

### DELETE /api/stores/:id 🛡️
매장 삭제 (관리자)

---

## REVIEWS

### GET /api/stores/:id/reviews 🔓
리뷰 목록

**Query**: `?page=1&limit=10&sort=latest`

**Response**
```json
{
  "reviews": [{
    "id", "user": { "name", "team" },
    "scoreTotal", "scoreTaste", "scorePrice", "scoreService", "scoreAmbiance", "scoreCleanliness",
    "content", "visitedAt", "likes", "status", "createdAt"
  }]
}
```

---

### POST /api/stores/:id/reviews 🔐
리뷰 작성 (로그인 사용자)

**Request**
```json
{
  "scoreTotal": 4.5,
  "scoreTaste": 5,
  "scorePrice": 4,
  "scoreService": 4,
  "scoreAmbiance": 5,
  "scoreCleanliness": 4,
  "content": "맛있어요!",
  "visitedAt": "2026-04-15"
}
```
→ 작성 후 InternalRating 자동 재집계

---

### POST /api/reviews/:id/like 🔐
리뷰 좋아요 토글

---

### POST /api/reviews/:id/report 🔐
리뷰 신고 → status: REPORTED

---

### PUT /api/reviews/:id 🛡️
리뷰 상태 변경 (관리자: HIDDEN/ACTIVE)

---

## STORE REQUESTS

### POST /api/requests 🔐
매장 등록 요청

**Request**
```json
{
  "requestType": "NEW",
  "payload": {
    "name": "맛있는 식당",
    "address": "서울 ...",
    "categoryId": "cuid",
    "themeTags": ["혼밥"],
    "menus": []
  }
}
```

---

### GET /api/requests 🛡️
요청 목록 (관리자)

**Query**: `?status=PENDING&page=1`

---

### PUT /api/requests/:id 🛡️
요청 처리 (관리자)

**Request**
```json
{
  "status": "APPROVED",   // or REJECTED
  "adminNote": "반려 사유"
}
```
→ APPROVED 시 Store 테이블에 자동 생성

---

## USERS (관리자)

### GET /api/users 🛡️
사용자 목록

---

### POST /api/users 🛡️
승인코드 발급

**Request**
```json
{ "name": "홍길동", "team": "개발팀", "role": "USER" }
```
**Response**
```json
{ "approvalCode": "uuid-xxxx" }
```

---

### PUT /api/users/:id 🛡️
계정 활성화/비활성화

**Request**
```json
{ "isActive": false }
```

---

## CRAWL (관리자)

### POST /api/crawl/api 🛡️
공식 API 수집 실행

**Request**
```json
{ "platform": "KAKAO", "keyword": "성수동 카페" }
```
→ 카카오/네이버 API 호출 → StagingStore에 저장

---

### POST /api/crawl/playwright 🛡️
Playwright 단건 조회

**Request**
```json
{ "storeName": "성수동 XX카페", "platform": "KAKAO" }
```
**Response**
```json
{
  "stagingId": "cuid",
  "preview": {
    "name", "address", "phone", "businessHours",
    "category", "menus": []
  }
}
```

---

### GET /api/crawl/staging 🛡️
임시 저장 목록

**Query**: `?status=PENDING`

---

### POST /api/crawl/staging/:id/approve 🛡️
승인 → Store 테이블로 이동

**Request** (라벨 지정)
```json
{
  "categoryId": "cuid",
  "themeTags": ["데이트", "주차"],
  "menus": [{ "name": "아메리카노", "price": 5000, "isRepresentative": true }]
}
```

---

### DELETE /api/crawl/staging/:id 🛡️
임시 저장 항목 버림

---

### GET /api/crawl/jobs 🛡️
수집 작업 이력

---

## CRON

### GET /api/cron/crawl
Vercel Cron Job (2주 1회 자동 실행)
- CRON_SECRET 헤더 검증
- 카카오/네이버 API로 키워드별 수집 실행
- 결과를 StagingStore에 적재

**vercel.json**
```json
{
  "crons": [{
    "path": "/api/cron/crawl",
    "schedule": "0 2 1,15 * *"
  }]
}
```
