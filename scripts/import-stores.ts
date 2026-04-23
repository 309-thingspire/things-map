import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
import { PrismaClient } from '@prisma/client'
import { searchNaver } from '../src/lib/crawl/naver'
import { calcOfficeDistance } from '../src/lib/office'

const prisma = new PrismaClient()

const STORE_NAMES = [
  '후암쌀국수', '더필립', '미성중국관', '신청파찹쌀순대', '까치네',
  '돈까춘', '일미집', '가야해장', '베나레스', '반율',
  '양귀비짬뽕', '호랭이곳간', '비비드커피', '와우신내떡', '무자비',
  '우모에', '킷테', '부암동치킨', '정', '핵밥',
  '포라임', '테츠로', '넘버린', '온센', '오봉집',
  '남영돈', '언뎁트', '미드스트', '그라메도', '태화관',
  '서울추어탕', '할매곤드레밥', '이화수육개장', '유키사키', '한촌설렁탕',
  '갈월이골목', '우리식당', '초원', '덕순루', '금강산식당',
  '후암연립', '윤선국밥', '미성횟집', '팔팔너구리', '마루소',
  '골드버튼', '챕터남영', '육전국밥', '마루칼국수', '숙대소반',
  '유나이트', '피그가든', '마카나이', '엔와이', '러브러브',
  '고라니', '오오비', '레드우드', '라이언스', '미미파스타',
  '모모키친', '오르소', '소문난집', '퍼즈', '루온',
  '메시야', '호호돈까스', '홍철책빵', '온오프커피', '보승회관',
  '뼈탄집', '살아있네', '데일리루틴', '피기', '옥수동화덕피자',
  '보약밥상', '수산해물', '오서독스', '일일사', '개러지독', '스태커버거샵',
]

const KEYWORD_SUFFIX = ' 용산' // 지역 검색 정확도 향상

async function run() {
  const success: string[] = []
  const failed: string[] = []
  const skipped: string[] = []

  for (const name of STORE_NAMES) {
    // 이미 등록된 매장 스킵
    const existing = await prisma.store.findFirst({ where: { name } })
    if (existing) {
      console.log(`⏭  스킵 (이미 존재): ${name}`)
      skipped.push(name)
      continue
    }

    try {
      const results = await searchNaver(name + KEYWORD_SUFFIX, 1, 1)
      const r = results[0]

      if (!r) {
        console.warn(`❌ 검색 실패: ${name}`)
        failed.push(name)
        continue
      }

      const { officeDistanceM, walkingMinutes } = calcOfficeDistance(r.lat, r.lng)

      // 카테고리 매핑
      let categoryId: string | null = null
      if (r.category) {
        const cat = await prisma.category.findFirst({
          where: { name: { contains: r.category.split('>')[0].trim().slice(0, 4) } },
        })
        categoryId = cat?.id ?? null
      }

      await prisma.store.create({
        data: {
          name: r.name,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          phone: r.phone || null,
          categoryId,
          naverUrl: r.naverUrl || null,
          officeDistanceM,
          walkingMinutes,
          themeTags: [],
        },
      })

      console.log(`✅ 등록: ${r.name} — ${r.address} (도보 ${walkingMinutes}분)`)
      success.push(name)

      // API 부하 방지
      await new Promise((res) => setTimeout(res, 300))
    } catch (e) {
      console.error(`❌ 오류 (${name}):`, e)
      failed.push(name)
    }
  }

  console.log('\n=== 완료 ===')
  console.log(`✅ 성공: ${success.length}개`)
  console.log(`⏭  스킵: ${skipped.length}개`)
  console.log(`❌ 실패: ${failed.length}개${failed.length ? ' → ' + failed.join(', ') : ''}`)

  await prisma.$disconnect()
}

run().catch((e) => { console.error(e); process.exit(1) })
