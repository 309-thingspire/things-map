interface PlaywrightResult {
  name: string
  address: string
  phone: string | null
  businessHours: string | null
  category: string | null
  tags: string[]
  menus: { name: string; price: number | null }[]
  kakaoUrl: string
}

function randomDelay(min = 1500, max = 3000) {
  return new Promise((res) => setTimeout(res, Math.floor(Math.random() * (max - min) + min)))
}

/** 검색 키워드와 결과 매장명이 충분히 일치하는지 확인 */
function isNameMatch(keyword: string, resultName: string): boolean {
  const normalize = (s: string) =>
    s.replace(/\s+/g, '').replace(/[^가-힣a-zA-Z0-9]/g, '').toLowerCase()
  const kw = normalize(keyword)
  const rn = normalize(resultName)
  if (rn.includes(kw) || kw.includes(rn)) return true
  const kwCore = normalize(keyword.split(' ')[0])
  if (kwCore.length >= 2 && rn.includes(kwCore)) return true
  let common = 0
  for (let i = 0; i < Math.min(kw.length, rn.length); i++) {
    if (kw[i] === rn[i]) common++
    else break
  }
  if (kw.length > 0 && common / kw.length >= 0.7) return true
  return false
}

export async function crawlByStoreName(storeName: string): Promise<PlaywrightResult | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chromium: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const playwright = require('playwright')
    chromium = playwright.chromium
  } catch {
    throw new Error('playwright 패키지가 설치되어 있지 않습니다. npm install playwright를 실행하세요.')
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(`https://map.kakao.com/?q=${encodeURIComponent(storeName)}`, { waitUntil: 'networkidle' })
    await randomDelay()

    const firstResult = page.locator('.placelist .PlaceItem').first()
    if (!(await firstResult.isVisible())) return null

    const name = (await firstResult.locator('[data-id="name"]').textContent().catch(() => storeName) ?? storeName).trim()

    // 매장명 유사도 검증
    if (!isNameMatch(storeName, name)) return null

    const address = (await firstResult.locator('[data-id="address"]').textContent().catch(() => '') ?? '').trim()
    const phone = (await firstResult.locator('[data-id="phone"]').textContent().catch(() => null))?.trim() || null
    const category = (await firstResult.locator('[data-id="subcategory"]').textContent().catch(() => null))?.trim() || null

    const periodStatus = await firstResult.locator('[data-id="periodStatus"]').textContent().catch(() => null)
    const periodTxt = await firstResult.locator('[data-id="periodTxt"]').textContent().catch(() => null)
    const businessHours = periodStatus || periodTxt
      ? [periodStatus?.trim(), periodTxt?.trim()].filter(Boolean).join(' ')
      : null

    const detailUrl = await firstResult.locator('a[data-id="moreview"]').getAttribute('href').catch(() => null)
    const kakaoUrl = detailUrl ?? ''

    const menus: { name: string; price: number | null }[] = []
    const tags: string[] = []

    if (category) tags.push(category)

    if (detailUrl) {
      try {
        await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 15000 })
        await randomDelay(1000, 2000)

        // 태그: 홈 탭 매장정보 > 태그 섹션 (div.unit_hashtag a.link_detail)
        const tagEls = await page.locator('div.unit_hashtag a.link_detail').all()
        for (const el of tagEls) {
          const t = (await el.textContent().catch(() => null))?.trim().replace(/^#/, '')
          if (t && t.length > 0) tags.push(t)
        }

        // 메뉴 탭 클릭
        const menuTabClicked = await (async () => {
          try {
            const byHref = page.locator('a.link_tab[href="#menuInfo"]')
            if (await byHref.count() > 0) {
              await byHref.click()
              await randomDelay(800, 1500)
              return true
            }
            const byText = page.locator('a.link_tab').filter({ hasText: '메뉴' }).first()
            if (await byText.isVisible({ timeout: 2000 })) {
              await byText.click()
              await randomDelay(800, 1500)
              return true
            }
          } catch { /* ignore */ }
          return false
        })()

        if (menuTabClicked) {
          // ul.list_goods li — 확인된 실제 선택자
          // 메뉴명: strong.tit_item / 가격: p.desc_item
          const menuItems = await page.locator('ul.list_goods li').all()
          for (const li of menuItems.slice(0, 40)) {
            const menuName = (await li.locator('strong.tit_item').textContent().catch(() => null))?.trim()
            if (!menuName) continue
            const priceText = (await li.locator('p.desc_item').textContent().catch(() => null))?.trim()
            const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, '')) || null : null
            menus.push({ name: menuName, price })
          }
        }
      } catch {
        // 상세 페이지 실패 시 기본 정보만 반환
      }
    }

    return {
      name,
      address,
      phone,
      businessHours,
      category,
      tags: [...new Set(tags)].filter(Boolean),
      menus,
      kakaoUrl,
    }
  } finally {
    await browser.close()
  }
}
