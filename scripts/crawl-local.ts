/**
 * 로컬 크롤러 — Playwright로 매장 정보를 긁어서 서버 staging으로 업로드
 *
 * 사용법:
 *   npx ts-node scripts/crawl-local.ts "매장명1" "매장명2" ...
 *   npx ts-node scripts/crawl-local.ts --file stores.txt   (한 줄에 매장명 하나)
 *
 * 환경변수 (.env.local):
 *   CRON_SECRET       서버 인증 토큰
 *   CRAWL_SERVER_URL  업로드 대상 서버 (기본: https://things-map.vercel.app)
 */

import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })

import fs from 'fs'
import path from 'path'
import { crawlByStoreName } from '../src/lib/crawl/playwright'

const SERVER_URL = process.env.CRAWL_SERVER_URL ?? 'https://things-map.vercel.app'
const CRON_SECRET = process.env.CRON_SECRET

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET이 .env.local에 없습니다.')
  process.exit(1)
}

async function upload(storeName: string, result: object) {
  const res = await fetch(`${SERVER_URL}/api/crawl/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ storeName, result }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`업로드 실패 (${res.status}): ${err}`)
  }
  const json = await res.json()
  return json.data
}

async function run() {
  const args = process.argv.slice(2)

  let storeNames: string[] = []

  if (args[0] === '--file' && args[1]) {
    const filePath = path.resolve(args[1])
    const content = fs.readFileSync(filePath, 'utf-8')
    storeNames = content.split('\n').map(l => l.trim()).filter(Boolean)
  } else if (args.length > 0) {
    storeNames = args
  } else {
    console.error('사용법: npx ts-node scripts/crawl-local.ts "매장명" ...')
    console.error('        npx ts-node scripts/crawl-local.ts --file stores.txt')
    process.exit(1)
  }

  console.log(`\n🔍 총 ${storeNames.length}개 매장 크롤링 시작 → ${SERVER_URL}\n`)

  const results = { ok: 0, fail: 0, skip: 0 }

  for (const storeName of storeNames) {
    process.stdout.write(`  ⏳ ${storeName} ... `)
    try {
      const result = await crawlByStoreName(storeName)
      if (!result) {
        console.log('❌ 검색 결과 없음')
        results.skip++
        continue
      }
      const data = await upload(storeName, result)
      console.log(`✅ 업로드 완료 (staging: ${data.stagingId}) — ${result.name} / ${result.address}`)
      results.ok++
    } catch (err) {
      console.log(`❌ 실패: ${String(err)}`)
      results.fail++
    }

    // 카카오 봇 탐지 방지 딜레이
    if (storeNames.indexOf(storeName) < storeNames.length - 1) {
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500))
    }
  }

  console.log(`\n📊 결과: ✅ ${results.ok}개 성공  ❌ ${results.fail}개 실패  ⏭ ${results.skip}개 스킵\n`)
  console.log(`👉 어드민에서 확인: ${SERVER_URL}/admin/staging\n`)
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
