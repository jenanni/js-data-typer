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
 * ISO datetimes use only the calendar day before the T.
 */
export function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfDay(value)
  }

  if (typeof value !== 'string') return null

  const raw = value.trim()
  if (!raw) return null

  const datePart = raw.includes('T') ? raw.slice(0, raw.indexOf('T')) : raw

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

function parseClock(timePart) {
  const match = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = match[3] !== undefined ? Number(match[3]) : 0
  const millis = match[4] !== undefined ? Number(match[4].padEnd(3, '0')) : 0

  if (hours > 23 || minutes > 59 || seconds > 59) return null
  return { hours, minutes, seconds, millis }
}

function applyLocalTime(day, clock) {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    clock.hours,
    clock.minutes,
    clock.seconds,
    clock.millis,
  )
}

/**
 * Parse a timestamp.
 * Accepts Date, epoch ms, ISO strings, and DD/MM/YYYY[ HH:mm[:ss]] (same day order as parseDate).
 */
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

  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const date = new Date(raw)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const spaceSplit = raw.match(/^(.+?)\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?)$/)
  if (spaceSplit) {
    const day = parseDate(spaceSplit[1])
    const clock = parseClock(spaceSplit[2])
    if (!day || !clock) return null
    return applyLocalTime(day, clock)
  }

  const asDate = parseDate(raw)
  if (asDate) return asDate

  return null
}
