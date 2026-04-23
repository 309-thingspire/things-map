export function sanitizeAddress(address: string): string {
  let clean = address
  // Remove floor info and everything after
  // Handles: "2층", "B1층", "지하1층", "1~2층", "1,2층", "1, 2층"
  // Uses (?:[-~]|,\s*) separator to avoid greedily consuming building numbers
  clean = clean.replace(/\s+(?:지하\s*\d*층?|\d+(?:(?:[-~]|,\s*)\d+)*층|B\d*층?)[^\n]*/i, '')
  // Remove building/place names and everything after
  // Handles: "OO빌딩", "상가", "상가 C동", etc.
  clean = clean.replace(/\s+(?:[가-힣A-Za-z0-9]*)?(?:빌딩|타워|건물|센터|플라자|프라자|몰|하우스|별관|상가)(?:\s[^\n]*)?$/i, '')
  // Remove trailing parenthetical notes
  clean = clean.replace(/\s+\([^)]*\)\s*$/, '')
  // Remove trailing punctuation and whitespace
  clean = clean.replace(/[,.\s]+$/, '')
  return clean.trim()
}
