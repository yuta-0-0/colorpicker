export interface ImportedColor {
  hex: string
  name: string
  alpha: number
  memo?: string
  spot_color?: string
}

export interface ImportResult {
  colors: ImportedColor[]
  errors: string[]
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

// ---- JSON インポート ----

export function parseImportJSON(jsonText: string): ImportResult {
  const errors: string[] = []
  const colors: ImportedColor[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { colors: [], errors: ['JSON のパースに失敗しました'] }
  }

  const data = parsed as { colors?: unknown[] }
  if (!Array.isArray(data?.colors)) {
    return { colors: [], errors: ['colors 配列が見つかりません'] }
  }

  for (const [i, item] of data.colors.entries()) {
    const c = item as Record<string, unknown>
    const hex = (typeof c.hex === 'string' ? c.hex : '').toUpperCase()
    if (!isValidHex(hex)) {
      errors.push(`行 ${i + 1}: 不正な HEX 値 "${c.hex}"`)
      continue
    }
    colors.push({
      hex,
      name: typeof c.name === 'string' ? c.name : hex,
      alpha: typeof c.alpha === 'number' ? c.alpha : 1.0,
      memo: typeof c.memo === 'string' ? c.memo : undefined,
      spot_color: typeof c.spot_color === 'string' ? c.spot_color : undefined,
    })
  }

  return { colors, errors }
}

// ---- CSV インポート ----

export function parseImportCSV(csvText: string): ImportResult {
  const errors: string[] = []
  const colors: ImportedColor[] = []
  const lines = csvText.trim().split('\n')

  // ヘッダー行をスキップ
  const dataLines = lines[0].startsWith('HEX') ? lines.slice(1) : lines

  for (const [i, line] of dataLines.entries()) {
    if (!line.trim()) continue
    // CSV 簡易パース（クォート内のカンマは無視する簡易版）
    const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g) ?? []
    const clean = (s: string) => s.replace(/^"|"$/g, '').trim()

    const hex = clean(cols[0] ?? '').toUpperCase()
    if (!isValidHex(hex)) {
      errors.push(`行 ${i + 2}: 不正な HEX 値 "${cols[0]}"`)
      continue
    }

    const alpha = parseFloat(clean(cols[5] ?? '1'))
    colors.push({
      hex,
      name: clean(cols[1] ?? hex),
      alpha: isNaN(alpha) ? 1.0 : alpha,
      memo: clean(cols[6] ?? '') || undefined,
      spot_color: clean(cols[7] ?? '') || undefined,
    })
  }

  return { colors, errors }
}

// ---- ASE インポート（RGB スウォッチのみ対応） ----

export function parseImportASE(buffer: ArrayBuffer): ImportResult {
  const errors: string[] = []
  const colors: ImportedColor[] = []
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // シグネチャ確認 "ASEF"
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  if (sig !== 'ASEF') {
    return { colors: [], errors: ['ASE ファイルのシグネチャが不正です'] }
  }

  let offset = 8
  while (offset < buffer.byteLength - 6) {
    const blockType = view.getUint16(offset, false)
    const blockLen = view.getUint32(offset + 2, false)
    offset += 6

    if (blockType !== 0x0001) {
      offset += blockLen
      continue
    }

    const nameLen = view.getUint16(offset, false)
    offset += 2
    let name = ''
    for (let i = 0; i < nameLen - 1; i++) {
      name += String.fromCharCode(view.getUint16(offset + i * 2, false))
    }
    offset += nameLen * 2

    // カラーモデル 4 bytes
    const model = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])
    offset += 4

    if (model === 'RGB ') {
      const r = Math.round(view.getFloat32(offset, false) * 255)
      const g = Math.round(view.getFloat32(offset + 4, false) * 255)
      const b = Math.round(view.getFloat32(offset + 8, false) * 255)
      offset += 14 // 3 floats + color type (2 bytes)
      const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
      colors.push({ hex, name: name || hex, alpha: 1.0 })
    } else {
      errors.push(`非 RGB スウォッチ（${model.trim()}）はスキップされました`)
      offset += blockLen - 2 - nameLen * 2 - 4
    }
  }

  return { colors, errors }
}
