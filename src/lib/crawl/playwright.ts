interface PlaywrightResult {
  name: string
  address: string
  phone: string | null
  businessHours: string | null
  category: string | null
  menus: { name: string; price: number | null }[]
  kakaoUrl: string
}

function randomDelay(min = 2000, max = 4000) {
  return new Promise((res) => setTimeout(res, Math.floor(Math.random() * (max - min) + min)))
}

export async function crawlByStoreName(storeName: string): Promise<PlaywrightResult | null> {
  // Playwright는 서버 환경에서만 동작 (Vercel Edge에서는 사용 불가)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chromium: any
  try {
    // playwright는 선택적 의존성 - 미설치 시 런타임 에러 발생
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

    // 첫 번째 결과 클릭
    const firstResult = page.locator('.placelist .PlaceItem').first()
    if (!(await firstResult.isVisible())) {
      return null
    }

    const name = await firstResult.locator('.head_item .link_name').textContent() ?? storeName
    const address = await firstResult.locator('.info_item .addr').first().textContent() ?? ''
    const phone = await firstResult.locator('.info_item .phone').textContent().catch(() => null)
    const category = await firstResult.locator('.category').textContent().catch(() => null)
    const kakaoUrl = (await firstResult.locator('.head_item .link_name').getAttribute('href')) ?? ''

    // DimmedLayer(쿠키/팝업 오버레이)가 클릭을 가로막는 경우 제거
    await page.evaluate(() => {
      const layer = document.getElementById('dimmedLayer')
      if (layer) (layer as HTMLElement).style.display = 'none'
    }).catch(() => {})

    await firstResult.locator('.head_item .link_name').click({ force: true })
    await randomDelay()

    // 영업시간
    const businessHours = await page.locator('.openhour_area').textContent().catch(() => null)

    // 메뉴
    const menuItems = await page.locator('.list_menu li').all()
    const menus: { name: string; price: number | null }[] = []
    for (const item of menuItems.slice(0, 10)) {
      const menuName = await item.locator('.loss_word').textContent().catch(() => null)
      const priceText = await item.locator('.price_menu').textContent().catch(() => null)
      if (menuName) {
        const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, '')) || null : null
        menus.push({ name: menuName.trim(), price })
      }
    }

    return {
      name: name.trim(),
      address: address.trim(),
      phone: phone?.trim() ?? null,
      businessHours: businessHours?.trim() ?? null,
      category: category?.trim() ?? null,
      menus,
      kakaoUrl,
    }
  } finally {
    await browser.close()
  }
}
