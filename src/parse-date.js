function pad2(n) {
  return String(n).padStart(2, '0')
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function compareDay(a, b) {
  const da = startOfDay(a).getTime()
  const db = startOfDay(b).getTime()
  if (da === db) return 0
  return da < db ? -1 : 1
}

export function fromYMD(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

function expandYear(year) {
  if (year < 100) return year >= 70 ? 1900 + year : 2000 + year
  return year
}

/**
 * Parse a calendar date as a local Date at 00:00:00.
 * Accepts Date, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD.
 * ISO datetimes use the calendar day in local time.
 */
export function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfDay(value)
  }

  if (typeof value !== 'string') return null

  const raw = value.trim()
  if (!raw) return null

  const datePart = raw.length > 10 && raw.includes('T') ? raw.slice(0, 10) : raw.slice(0, 10)

  let match = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (match) {
    return fromYMD(Number(match[1]), Number(match[2]), Number(match[3]))
  }

  match = datePart.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/)
  if (match) {
    return fromYMD(expandYear(Number(match[3])), Number(match[2]), Number(match[1]))
  }

  return null
}

export function parseTimestamp(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime())
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value !== 'string') return null

  const raw = value.trim()
  if (!raw) return null

  const asDate = parseDate(raw)
  if (asDate && !raw.includes('T') && !raw.includes(':')) return asDate

  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export function dateToISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}
