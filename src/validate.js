import { SchemaError, ValidationError } from './errors.js'
import { makeTranslator } from './messages.js'
import { compileSchema, checkValue } from './types.js'

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function resolveData(compiled, data) {
  const hasData = data !== undefined
  const declaresInline = Object.values(compiled).some((field) => field.hasInline)

  if (!hasData && !declaresInline) {
    throw new SchemaError('No data provided. Pass an object to validate() or set value on each field.')
  }

  if (hasData && !isPlainObject(data)) {
    return { invalid: true }
  }

  const source = {}
  for (const key of Object.keys(compiled)) {
    const field = compiled[key]
    source[key] = field.inlineValue !== undefined
      ? field.inlineValue
      : (hasData ? data[key] : undefined)
  }
  return { invalid: false, source }
}

function run(compiled, data, t) {
  const out = {}
  for (const key of Object.keys(compiled)) {
    const field = compiled[key]
    const ctx = { t, field: key, label: field.label }
    const result = checkValue(field, data[key], ctx)
    if (!result.ok) return result
    out[key] = result.value
  }

  return { ok: true, data: out }
}

export function typer(schema, options = {}) {
  const compiled = compileSchema(schema)
  const t = makeTranslator(options)

  function validate(data) {
    const resolved = resolveData(compiled, data)
    if (resolved.invalid) {
      return {
        ok: false,
        error: {
          code: 'invalid_type',
          field: undefined,
          label: undefined,
          message: t('invalid_type', 'data'),
        },
      }
    }

    return run(compiled, resolved.source, t)
  }

  function parse(data) {
    const result = validate(data)
    if (!result.ok) throw new ValidationError(result.error)
    return result.data
  }

  return { validate, parse }
}
