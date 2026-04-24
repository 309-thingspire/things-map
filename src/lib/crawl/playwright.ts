interface PlaywrightResult {
  name: string
  address: string
  phone: string | null
  businessHours: string | null
  category: string | null
  menus: { name: string; price: number | null }[]
  kakaoUrl: string
}

function randomDelay(min = 1500, max = 3000) {
  return new Promise((res) => setTimeout(res, Math.floor(Math.random() * (max - min) + min)))
}

export async function crawlByStoreName(storeName: string): Promise<PlaywrightResult | null> {
  // Playwright는 서버 환경에서만 동작 (Vercel Edge에서는 사용 불가)
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

    // 기본 정보 추출 (클릭 없이 목록 카드에서 직접)
    const name = await firstResult.locator('[data-id="name"]').textContent().catch(() => storeName) ?? storeName
    const addressEl = firstResult.locator('[data-id="address"]')
    const address = await addressEl.textContent().catch(() => '') ?? ''
    const phone = await firstResult.locator('[data-id="phone"]').textContent().catch(() => null)
    const category = await firstResult.locator('[data-id="subcategory"]').textContent().catch(() => null)

    // 영업시간: 목록 카드 내 .openhour div에 이미 포함됨
    const periodStatus = await firstResult.locator('[data-id="periodStatus"]').textContent().catch(() => null)
    const periodTxt = await firstResult.locator('[data-id="periodTxt"]').textContent().catch(() => null)
    const businessHours = periodStatus || periodTxt
      ? [periodStatus?.trim(), periodTxt?.trim()].filter(Boolean).join(' ')
      : null

    // 상세 페이지 URL (place.map.kakao.com/{id})
    const detailUrl = await firstResult.locator('a[data-id="moreview"]').getAttribute('href').catch(() => null)

    // kakaoUrl: 상세 페이지 URL 사용
    const kakaoUrl = detailUrl ?? ''

    // 메뉴: place.map.kakao.com 상세 페이지로 이동해서 추출
    const menus: { name: string; price: number | null }[] = []
    if (detailUrl) {
      try {
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 10000 })
        await randomDelay(1000, 2000)

        // place.map.kakao.com 메뉴 선택자
        const menuCandidates = [
          { name: '.info_menu .loss_word', price: '.info_menu .price_menu' },
          { name: '.tit_list', price: '.txt_price' },
          { name: '.list_menu .loss_word', price: '.list_menu .price_menu' },
        ]
        for (const { name: nameSel, price: priceSel } of menuCandidates) {
          const items = await page.locator(nameSel).all()
          if (items.length > 0) {
            for (const item of items.slice(0, 10)) {
              const menuName = await item.textContent().catch(() => null)
              const priceEl = await page.locator(priceSel).nth(menus.length)
              const priceText = await priceEl.textContent().catch(() => null)
              if (menuName?.trim()) {
                const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, '')) || null : null
                menus.push({ name: menuName.trim(), price })
              }
            }
            break
          }
        }
      } catch {
        // 메뉴 추출 실패는 무시 — 기본 정보만으로도 충분
      }
    }

    return {
      name: name.trim(),
      address: address.trim(),
      phone: phone?.trim() || null,
      businessHours,
      category: category?.trim() || null,
      menus,
      kakaoUrl,
    }
  } finally {
    await browser.close()
  }
}
