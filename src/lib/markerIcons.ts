// lucide 아이콘명 → SVG 경로 데이터 (NaverMap HTML 마커용)
// 각 아이콘은 [tagName, attributes][] 형식

type SvgNode = [string, Record<string, string>]

const ICON_NODES: Record<string, SvgNode[]> = {
  utensils: [
    ['path', { d: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2' }],
    ['path', { d: 'M7 2v20' }],
    ['path', { d: 'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7' }],
  ],
  coffee: [
    ['path', { d: 'M10 2v2' }],
    ['path', { d: 'M14 2v2' }],
    ['path', { d: 'M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1' }],
    ['path', { d: 'M6 2v2' }],
  ],
  beer: [
    ['path', { d: 'M17 11h1a3 3 0 0 1 0 6h-1' }],
    ['path', { d: 'M9 12v6' }],
    ['path', { d: 'M13 12v6' }],
    ['path', { d: 'M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z' }],
    ['path', { d: 'M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8' }],
  ],
  pizza: [
    ['path', { d: 'm12 14-1 1' }],
    ['path', { d: 'm13.75 18.25-1.25 1.42' }],
    ['path', { d: 'M17.775 5.654a15.68 15.68 0 0 0-12.121 12.12' }],
    ['path', { d: 'M18.8 9.3a1 1 0 0 0 2.1 7.7' }],
    ['path', { d: 'M21.964 20.732a1 1 0 0 1-1.232 1.232l-18-5a1 1 0 0 1-.695-1.232A19.68 19.68 0 0 1 15.732 2.037a1 1 0 0 1 1.232.695z' }],
  ],
  fish: [
    ['path', { d: 'M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z' }],
    ['path', { d: 'M18 12v.5' }],
    ['path', { d: 'M16 17.93a9.77 9.77 0 0 1 0-11.86' }],
    ['path', { d: 'M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33' }],
  ],
  soup: [
    ['path', { d: 'M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z' }],
    ['path', { d: 'M7 21h10' }],
    ['path', { d: 'M19.5 12 22 6' }],
  ],
  sandwich: [
    ['path', { d: 'm2.37 11.223 8.372-6.777a2 2 0 0 1 2.516 0l8.371 6.777' }],
    ['path', { d: 'M21 15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5.25' }],
    ['path', { d: 'M3 15a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h9' }],
    ['rect', { width: '20', height: '4', x: '2', y: '11', rx: '1' }],
  ],
  cake: [
    ['path', { d: 'M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8' }],
    ['path', { d: 'M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1' }],
    ['path', { d: 'M2 21h20' }],
    ['path', { d: 'M7 8v3' }],
    ['path', { d: 'M12 8v3' }],
    ['path', { d: 'M17 8v3' }],
  ],
  star: [
    ['path', { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' }],
  ],
  store: [
    ['path', { d: 'M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5' }],
    ['path', { d: 'M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244' }],
    ['path', { d: 'M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05' }],
  ],
  flame: [
    ['path', { d: 'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4' }],
  ],
  wine: [
    ['path', { d: 'M8 22h8' }],
    ['path', { d: 'M7 10h10' }],
    ['path', { d: 'M12 15v7' }],
    ['path', { d: 'M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z' }],
  ],
  heart: [
    ['path', { d: 'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5' }],
  ],
  leaf: [
    ['path', { d: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z' }],
    ['path', { d: 'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12' }],
  ],
  zap: [
    ['path', { d: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z' }],
  ],
  cookie: [
    ['path', { d: 'M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5' }],
    ['path', { d: 'M8.5 8.5v.01' }],
    ['path', { d: 'M16 15.5v.01' }],
    ['path', { d: 'M12 12v.01' }],
  ],
  wheat: [
    ['path', { d: 'M2 22 16 8' }],
    ['path', { d: 'M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z' }],
    ['path', { d: 'M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z' }],
  ],
  egg: [
    ['path', { d: 'M12 2C8 2 4 8 4 14a8 8 0 0 0 16 0c0-6-4-12-8-12' }],
  ],
  beef: [
    ['path', { d: 'M16.4 13.7A6.5 6.5 0 1 0 6.28 6.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3' }],
  ],
  'shopping-bag': [
    ['path', { d: 'M16 10a4 4 0 0 1-8 0' }],
    ['path', { d: 'M3.103 6.034h17.794' }],
    ['path', { d: 'M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z' }],
  ],
  'ancient-gate': [
    ['path', { d: 'M3 22h18' }],
    ['path', { d: 'M5 22v-9' }],
    ['path', { d: 'M19 22v-9' }],
    ['path', { d: 'M9 22v-5a3 3 0 0 1 6 0v5' }],
    ['path', { d: 'M2 13h20' }],
    ['path', { d: 'M5 13Q12 5 19 13' }],
    ['path', { d: 'M1 15Q12 6 23 15' }],
  ],
  'map-pin': [
    ['path', { d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' }],
    ['circle', { cx: '12', cy: '10', r: '3' }],
  ],
}

function buildSvgContent(nodes: SvgNode[]): string {
  return nodes.map(([tag, attrs]) => {
    const attrStr = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')
    return `<${tag} ${attrStr}/>`
  }).join('')
}

export function getMarkerSvgHtml(iconName: string, color: string, size = 36): string {
  const nodes = ICON_NODES[iconName]
  const svgContent = nodes ? buildSvgContent(nodes) : ''

  return `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;">
    <svg viewBox="0 0 24 24" width="${Math.round(size * 0.5)}" height="${Math.round(size * 0.5)}" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgContent}</svg>
  </div>`
}

export function getIconSvgHtml(iconName: string, color: string, size = 18): string {
  const nodes = ICON_NODES[iconName]
  if (!nodes) return ''
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block">${buildSvgContent(nodes)}</svg>`
}

export const AVAILABLE_ICONS = Object.keys(ICON_NODES)
