export function sanitizeAddress(address: string): string {
  let clean = address
  // Remove floor info and everything after (handles ", 4층" comma-prefixed variants too)
  clean = clean.replace(/[,\s]+(?:지하\s*\d*층?|\d+(?:[-~]\d+)*층|B\d*층?)[^\n]*/i, '')
  // Remove room/unit numbers and everything after (101호, B302호, etc.)
  clean = clean.replace(/[,\s]+[A-Za-z가-힣]?\d+호[^\n]*/i, '')
  // Remove building/place names and everything after
  clean = clean.replace(/[,\s]+(?:[가-힣A-Za-z0-9]+)?(?:빌딩|타워|건물|센터|플라자|프라자|몰|하우스|별관|상가)(?:[,\s][^\n]*)?$/i, '')
  // Remove trailing parenthetical notes
  clean = clean.replace(/[,\s]+\([^)]*\)\s*$/, '')
  // Remove trailing punctuation and whitespace
  clean = clean.replace(/[,.\s]+$/, '')
  return clean.trim()
}
