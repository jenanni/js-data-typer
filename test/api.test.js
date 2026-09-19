import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typer, SchemaError, ValidationError, CODES } from '../src/index.js'

test('throws SchemaError when schema is not an object', () => {
  assert.throws(() => typer(null), SchemaError)
  assert.throws(() => typer([]), SchemaError)
})

test('throws SchemaError when a field has no type', () => {
  assert.throws(() => typer({ age: { required: true } }), /missing type/)
})

test('throws SchemaError on unknown type', () => {
  assert.throws(() => typer({ file: { type: 'excel_buffer' } }), /Unknown type/)
})

test('throws SchemaError when enum has no values', () => {
  assert.throws(() => typer({ status: { type: 'enum' } }), /enum requires/)
})

test('validate returns ok data', () => {
  const result = typer({
    id: { type: 'integer', required: true },
  }).validate({ id: 7 })

  assert.equal(result.ok, true)
  assert.equal(result.data.id, 7)
})

test('validate returns error result for bad input', () => {
  const result = typer({
    id: { type: 'integer', required: true, desc: 'Codigo' },
  }).validate({ id: 'x' })

  assert.equal(result.ok, false)
  assert.equal(result.error.code, CODES.invalid_integer)
  assert.equal(result.error.field, 'id')
  assert.equal(result.error.message, 'Field Codigo must be an integer')
})

test('parse throws ValidationError', () => {
  const schema = typer({ id: { type: 'integer', required: true } })
  assert.throws(() => schema.parse({}), (err) => {
    assert.equal(err instanceof ValidationError, true)
    assert.equal(err.code, CODES.required)
    return true
  })
})

test('parse returns data on success', () => {
  const data = typer({ id: { type: 'integer' } }).parse({ id: '3' })
  assert.deepEqual(data, { id: 3 })
})

test('inline values work when validate is called without data', () => {
  const result = typer({
    name: { type: 'string', value: 'Ana', required: true },
  }).validate()

  assert.equal(result.ok, true)
  assert.equal(result.data.name, 'Ana')
})

test('defined inline wins over data', () => {
  const result = typer({
    name: { type: 'string', value: 'Ana' },
  }).validate({ name: 'Luis' })

  assert.equal(result.data.name, 'Ana')
})

test('undefined inline falls back to data', () => {
  const result = typer({
    name: { type: 'string', value: undefined, required: true },
  }).validate({ name: 'Luis' })

  assert.equal(result.ok, true)
  assert.equal(result.data.name, 'Luis')
})

test('mixes inline and data per key', () => {
  const result = typer({
    user_id: { type: 'integer', value: 9, required: true },
    name: { type: 'string', value: undefined, required: true },
  }).validate({ name: 'Ana', user_id: 1 })

  assert.equal(result.ok, true)
  assert.equal(result.data.user_id, 9)
  assert.equal(result.data.name, 'Ana')
})

test('undefined inline with required returns validation error', () => {
  const result = typer({
    name: { type: 'string', value: undefined, required: true, desc: 'Nombre' },
  }).validate()

  assert.equal(result.ok, false)
  assert.equal(result.error.code, CODES.required)
  assert.equal(result.error.field, 'name')
})

test('null inline wins over data', () => {
  const result = typer({
    name: { type: 'string', value: null },
  }).validate({ name: 'Ana' })

  assert.equal(result.ok, true)
  assert.equal(result.data.name, null)
})

test('throws SchemaError when no data and no inline declared', () => {
  assert.throws(
    () => typer({ name: { type: 'string', required: true } }).validate(),
    SchemaError,
  )
})

test('spanish locale', () => {
  const result = typer(
    { id: { type: 'integer', required: true, label: 'id' } },
    { locale: 'es' },
  ).validate({})

  assert.equal(result.error.message, 'El campo id no puede estar vacío')
})

test('throws SchemaError for invalid numeric min', () => {
  assert.throws(
    () => typer({ n: { type: 'integer', min: 'abc' } }),
    /min must be a finite number/,
  )
})

test('throws SchemaError when json_array has items and schema', () => {
  assert.throws(
    () => typer({
      rows: {
        type: 'json_array',
        items: 'integer',
        schema: { id: { type: 'integer' } },
      },
    }),
    /cannot combine items and schema/,
  )
})
