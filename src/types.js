import { SchemaError, CODES } from './errors.js'
import { parseDate, parseTimestamp, startOfDay, addDays, compareDay } from './parse-date.js'

const TYPE_ALIASES = {
  oneOf: 'enum',
  json: 'object',
}

export const TYPES = new Set([
  'integer',
  'string',
  'decimal',
  'boolean',
  'date',
  'timestamp',
  'array',
  'object',
  'enum',
])

export function fail(ctx, code) {
  return {
    ok: false,
    error: {
      code,
      field: ctx.field,
      label: ctx.label,
      message: ctx.t(code, ctx.label),
    },
  }
}

export function ok(value) {
  return { ok: true, value }
}

function isBlank(value, type) {
  if (value === undefined || value === null) return true
  if (type !== 'string' && typeof value === 'string' && value.trim() === '') return true
  return false
}

function resolveDefault(field) {
  if (field.default === 'today' && field.type === 'date') {
    return startOfDay(new Date())
  }
  if (field.default === 'now' && field.type === 'timestamp') {
    return new Date()
  }
  return field.default
}

function applyNumberConstraints(value, field, ctx) {
  if (field.positive && value < 0) return fail(ctx, CODES.not_positive)
  if (field.negative && value > 0) return fail(ctx, CODES.not_negative)
  if (field.notZero && value === 0) return fail(ctx, CODES.not_zero)
  if (field.min !== undefined && value < field.min) return fail(ctx, CODES.too_small)
  if (field.max !== undefined && value > field.max) return fail(ctx, CODES.too_big)
  return ok(value)
}

function integer(value, field, ctx) {
  let n
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return fail(ctx, CODES.invalid_integer)
    n = value
  } else if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!/^-?\d+$/.test(trimmed)) return fail(ctx, CODES.invalid_integer)
    n = Number(trimmed)
    if (!Number.isSafeInteger(n)) return fail(ctx, CODES.invalid_integer)
  } else {
    return fail(ctx, CODES.invalid_integer)
  }

  return applyNumberConstraints(n, field, ctx)
}

function decimal(value, field, ctx) {
  let n
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fail(ctx, CODES.invalid_decimal)
    n = value
  } else if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return fail(ctx, CODES.invalid_decimal)
    n = Number(trimmed)
    if (!Number.isFinite(n)) return fail(ctx, CODES.invalid_decimal)
  } else {
    return fail(ctx, CODES.invalid_decimal)
  }

  if (field.roundTo !== undefined) {
    const factor = 10 ** field.roundTo
    n = Math.round(n * factor) / factor
  }

  return applyNumberConstraints(n, field, ctx)
}

function string(value, field, ctx) {
  if (typeof value !== 'string') return fail(ctx, CODES.invalid_type)

  let out = value
  if (field.trim) out = out.trim()
  if (field.lowercase) out = out.toLowerCase()

  if (field.required && !out.trim()) return fail(ctx, CODES.required)
  if (field.notEmpty && !out.trim()) return fail(ctx, CODES.empty)
  if (field.min !== undefined && out.length < field.min) return fail(ctx, CODES.too_small)
  if (field.max !== undefined && out.length > field.max) return fail(ctx, CODES.too_big)

  return ok(out)
}

function boolean(value, field, ctx) {
  if (typeof value === 'boolean') return ok(value)

  if (typeof value === 'number') {
    if (value === 1) return ok(true)
    if (value === 0) return ok(false)
    return fail(ctx, CODES.invalid_boolean)
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === 't' || normalized === '1') return ok(true)
    if (normalized === 'false' || normalized === 'f' || normalized === '0') return ok(false)
  }

  return fail(ctx, CODES.invalid_boolean)
}

function date(value, field, ctx) {
  const parsed = parseDate(value)
  if (!parsed) return fail(ctx, CODES.invalid_date)

  if (field.min !== undefined) {
    const min = resolveDateBound(field.min)
    if (!min || compareDay(parsed, min) < 0) return fail(ctx, CODES.too_small)
  }
  if (field.max !== undefined) {
    const max = resolveDateBound(field.max)
    if (!max || compareDay(parsed, max) > 0) return fail(ctx, CODES.too_big)
  }
  if (field.limitFromTodayPlus !== undefined) {
    const limit = addDays(startOfDay(new Date()), field.limitFromTodayPlus)
    if (compareDay(parsed, limit) > 0) return fail(ctx, CODES.too_big)
  }
  if (field.limitFromTodayMinus !== undefined) {
    const limit = addDays(startOfDay(new Date()), -field.limitFromTodayMinus)
    if (compareDay(parsed, limit) < 0) return fail(ctx, CODES.too_small)
  }

  return ok(parsed)
}

function timestamp(value, field, ctx) {
  const parsed = parseTimestamp(value)
  if (!parsed) return fail(ctx, CODES.invalid_timestamp)

  if (field.min !== undefined) {
    const min = resolveTimestampBound(field.min)
    if (!min || parsed < min) return fail(ctx, CODES.too_small)
  }
  if (field.max !== undefined) {
    const max = resolveTimestampBound(field.max)
    if (!max || parsed > max) return fail(ctx, CODES.too_big)
  }

  return ok(parsed)
}

function resolveDateBound(bound) {
  if (bound === 'today') return startOfDay(new Date())
  return parseDate(bound)
}

function resolveTimestampBound(bound) {
  if (bound === 'now') return new Date()
  if (bound === 'today') return startOfDay(new Date())
  return parseTimestamp(bound)
}

function enumeration(value, field, ctx) {
  if (!field.values.includes(value)) return fail(ctx, CODES.invalid_enum)
  return ok(value)
}

function array(value, field, ctx) {
  if (!Array.isArray(value)) return fail(ctx, CODES.invalid_array)

  if (field.notEmpty && value.length === 0) return fail(ctx, CODES.empty)
  if (field.min !== undefined && value.length < field.min) return fail(ctx, CODES.too_small)
  if (field.max !== undefined && value.length > field.max) return fail(ctx, CODES.too_big)

  if (!field.items) return ok(value)

  const items = []
  for (let i = 0; i < value.length; i++) {
    const itemCtx = {
      ...ctx,
      field: `${ctx.field}[${i}]`,
      label: `${ctx.label}[${i}]`,
    }
    const checked = checkValue(field.items, value[i], itemCtx)
    if (!checked.ok) return checked
    items.push(checked.value)
  }

  return ok(items)
}

function object(value, field, ctx) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return fail(ctx, CODES.invalid_object)
  }

  if (field.notEmpty && Object.keys(value).length === 0) return fail(ctx, CODES.empty)

  if (!field.schema) return ok(value)

  const out = {}
  for (const key of Object.keys(field.schema)) {
    const nested = field.schema[key]
    const nestedCtx = {
      t: ctx.t,
      field: `${ctx.field}.${key}`,
      label: nested.label,
    }
    const checked = checkValue(nested, value[key], nestedCtx)
    if (!checked.ok) return checked
    out[key] = checked.value
  }

  return ok(out)
}

const handlers = {
  integer,
  string,
  decimal,
  boolean,
  date,
  timestamp,
  array,
  object,
  enum: enumeration,
}

export function checkValue(field, value, ctx) {
  if (isBlank(value, field.type)) {
    if (field.default !== undefined) return ok(resolveDefault(field))
    if (!field.required) return ok(value === undefined ? undefined : null)
    return fail(ctx, CODES.required)
  }

  return handlers[field.type](value, field, ctx)
}

function assertNonNegInt(name, value, key) {
  if (!Number.isInteger(value) || value < 0) {
    throw new SchemaError(`Field "${key}": ${name} must be a non-negative integer`)
  }
}

function compileItems(key, items) {
  if (typeof items === 'string') {
    return compileField(`${key}[]`, { type: items, required: true })
  }
  if (items && typeof items === 'object') {
    return compileField(`${key}[]`, { required: true, ...items })
  }
  throw new SchemaError(`Field "${key}": items must be a type name or field schema`)
}

export function compileField(key, def) {
  if (!def || typeof def !== 'object' || Array.isArray(def)) {
    throw new SchemaError(`Field "${key}" must be an object`)
  }
  if (!def.type) {
    throw new SchemaError(`Field "${key}" is missing type`)
  }

  let type = TYPE_ALIASES[def.type] || def.type
  let items
  let schema

  if (def.type === 'json_array') {
    type = 'array'
    items = compileField(`${key}[]`, {
      type: 'object',
      required: true,
      schema: def.schema,
    })
  }

  if (!TYPES.has(type)) {
    throw new SchemaError(`Unknown type "${def.type}" for field "${key}"`)
  }

  if (type === 'enum') {
    const values = def.values || def.oneOf
    if (!Array.isArray(values) || values.length === 0) {
      throw new SchemaError(`Field "${key}": enum requires a non-empty values (or oneOf) array`)
    }
  }

  if (type === 'array' && def.items) {
    items = compileItems(key, def.items)
  }

  if (type === 'object' && def.schema) {
    schema = compileSchema(def.schema)
  }

  if (def.roundTo !== undefined) assertNonNegInt('roundTo', def.roundTo, key)
  if (def.limitFromTodayPlus !== undefined) assertNonNegInt('limitFromTodayPlus', def.limitFromTodayPlus, key)
  if (def.limitFromTodayMinus !== undefined) assertNonNegInt('limitFromTodayMinus', def.limitFromTodayMinus, key)

  return {
    type,
    key,
    label: def.label || def.desc || key,
    required: !!(def.required || def.notNull),
    default: def.default,
    inlineValue: def.value,
    positive: !!def.positive,
    negative: !!def.negative,
    notZero: !!def.notZero,
    notEmpty: !!def.notEmpty,
    trim: !!def.trim,
    lowercase: !!(def.lowercase || def.toLowerCase),
    min: def.min,
    max: def.max,
    roundTo: def.roundTo,
    values: def.values || def.oneOf,
    items,
    schema,
    limitFromTodayPlus: def.limitFromTodayPlus,
    limitFromTodayMinus: def.limitFromTodayMinus,
  }
}

export function compileSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new SchemaError('Schema must be a plain object')
  }

  const compiled = {}
  for (const key of Object.keys(schema)) {
    compiled[key] = compileField(key, schema[key])
  }
  return compiled
}

export function hasInlineValues(compiled) {
  return Object.values(compiled).some((field) => field.inlineValue !== undefined)
}

export function extractInline(compiled) {
  const data = {}
  for (const key of Object.keys(compiled)) {
    data[key] = compiled[key].inlineValue
  }
  return data
}
