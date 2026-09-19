import { SchemaError, ValidationError } from './errors.js'
import { makeTranslator } from './messages.js'
import { compileSchema, checkValue, extractInline, hasInlineValues } from './types.js'

function resolveData(compiled, data) {
  if (data !== undefined) return data
  if (hasInlineValues(compiled)) return extractInline(compiled)
  throw new SchemaError('No data provided. Pass an object to validate() or set value on each field.')
}

function run(compiled, data, t) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
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
    const source = resolveData(compiled, data)
    const result = run(compiled, source, t)
    return result.ok ? result : { ok: false, error: result.error }
  }

  function parse(data) {
    const result = validate(data)
    if (!result.ok) throw new ValidationError(result.error)
    return result.data
  }

  return { validate, parse }
}

export function toStatus(result) {
  if (result.ok) return { status: 'ok', ...result.data }
  return {
    status: 'error',
    msg: result.error.message,
    field: result.error.field,
  }
}
