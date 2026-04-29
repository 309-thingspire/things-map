export function sanitizeAddress(address: string): string {
  let clean = address

  // 1. 층 정보 제거 (지하X층, X층, BX층, 1F, B1F, B1 등) 및 이후 모든 내용
  clean = clean.replace(/[,\s]+(?:지하\s*\d*층?|\d+(?:[-~]\d+)*층|B\d+층?|\d+F|B\d+F)[^\n]*/i, '')

  // 2. 호/실 번호 제거 (101호, B302호, 2001실 등) 및 이후 모든 내용
  clean = clean.replace(/[,\s]+[A-Za-z가-힣]?\d+(?:호|실)[^\n]*/i, '')

  // 3. 동 호수 (아파트 형식: X동 X호) 제거
  clean = clean.replace(/[,\s]+\d+동\s*\d*호?[^\n]*/i, '')

  // 4. 건물명·시설명 및 이후 내용 제거
  //    빌딩·타워·센터·플라자·몰·하우스·별관·상가·오피스텔·아파트·호텔·마트·역사·로데오
  clean = clean.replace(
    /[,\s]+(?:[가-힣A-Za-z0-9]*)?(?:빌딩|타워|건물|센터|플라자|프라자|몰|하우스|별관|상가|오피스텔|아파트|호텔|마트|역사|로데오|스퀘어|갤러리아|롯데|현대|신세계|코엑스|아이파크|파크|팰리스|캐슬)(?:[,\s][^\n]*)?$/i,
    ''
  )

  // 5. 괄호 설명 제거 (예: (1층), (B동))
  clean = clean.replace(/[,\s]+\([^)]*\)\s*$/, '')

  // 6. 끝에 남은 쉼표·점·공백 제거
  clean = clean.replace(/[,.\s]+$/, '')

  return clean.trim()
}
