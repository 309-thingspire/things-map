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

  // 완전 포함 또는 결과명이 키워드를 포함
  if (rn.includes(kw) || kw.includes(rn)) return true

  // 공통 접두어 길이가 키워드의 70% 이상이면 통과
  let common = 0
  for (let i = 0; i < Math.min(kw.length, rn.length); i++) {
    if (kw[i] === rn[i]) common++
    else break
  }
  if (common / kw.length >= 0.7) return true

  // 키워드 첫 단어(점 이름)만 비교
  const kwCore = normalize(keyword.split(' ')[0])
  if (rn.includes(kwCore) && kwCore.length >= 2) return true

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

    // 기본 정보 추출
    const name = (await firstResult.locator('[data-id="name"]').textContent().catch(() => storeName) ?? storeName).trim()

    // 매장명 유사도 검증 — 불일치 시 null 반환
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

    if (detailUrl) {
      try {
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
        await randomDelay(1000, 2000)

        // 태그/키워드 수집 (홈 탭 — 기본 표시됨)
        const tagEls = await page.locator('.tag_item, .list_tag .tag, .inner_tag, .tags_wrap .tag, .keyword_item').all()
        for (const el of tagEls.slice(0, 20)) {
          const t = (await el.textContent().catch(() => null))?.trim()
          if (t && t.length > 0 && t.length < 30) tags.push(t)
        }

        // 메뉴 탭으로 이동
        const menuTabSelectors = [
          'a[data-tab="menu"]',
          '.tab_menu a[href*="menu"]',
          '.wrap_tab a:has-text("메뉴")',
          'button:has-text("메뉴")',
          'a:has-text("메뉴")',
        ]
        let menuTabClicked = false
        for (const sel of menuTabSelectors) {
          try {
            const tab = page.locator(sel).first()
            if (await tab.isVisible({ timeout: 2000 })) {
              await tab.click()
              await randomDelay(800, 1500)
              menuTabClicked = true
              break
            }
          } catch { /* 다음 선택자 시도 */ }
        }

        if (menuTabClicked || true) {
          // 메뉴 아이템 추출 — 여러 선택자 시도
          const menuSelectors = [
            { name: '.info_menu .loss_word', price: '.info_menu .price_menu' },
            { name: '.list_menu .tit_item, .list_menu .name_item', price: '.list_menu .price_item' },
            { name: '.tit_list', price: '.txt_price' },
            { name: '.menu_name', price: '.menu_price' },
            { name: '.txt_name', price: '.txt_price' },
            { name: '.loss_word', price: '.price_menu' },
          ]

          for (const { name: nameSel, price: priceSel } of menuSelectors) {
            const nameEls = await page.locator(nameSel).all()
            if (nameEls.length === 0) continue

            const priceEls = await page.locator(priceSel).all()
            for (let i = 0; i < Math.min(nameEls.length, 30); i++) {
              const menuName = (await nameEls[i].textContent().catch(() => null))?.trim()
              if (!menuName || menuName.length === 0) continue
              const priceText = priceEls[i] ? (await priceEls[i].textContent().catch(() => null)) : null
              const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, '')) || null : null
              menus.push({ name: menuName, price })
            }
            if (menus.length > 0) break
          }
        }
      } catch {
        // 상세 페이지 실패는 무시 — 기본 정보만 반환
      }
    }

    return {
      name,
      address,
      phone,
      businessHours,
      category,
      tags: [...new Set(tags)],
      menus,
      kakaoUrl,
    }
  } finally {
    await browser.close()
  }
}
