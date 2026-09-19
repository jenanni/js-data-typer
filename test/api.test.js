import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typer, toStatus, SchemaError, ValidationError, CODES } from '../src/index.js'

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

test('passed data wins over inline value', () => {
  const result = typer({
    name: { type: 'string', value: 'Ana' },
  }).validate({ name: 'Luis' })

  assert.equal(result.data.name, 'Luis')
})

test('toStatus maps result to status envelope', () => {
  const schema = typer({ id: { type: 'integer', required: true, desc: 'Id' } })
  assert.deepEqual(toStatus(schema.validate({ id: 1 })), { status: 'ok', id: 1 })

  const fail = toStatus(schema.validate({}))
  assert.equal(fail.status, 'error')
  assert.equal(fail.field, 'id')
  assert.match(fail.msg, /Id/)
})

test('spanish locale', () => {
  const result = typer(
    { id: { type: 'integer', required: true, label: 'id' } },
    { locale: 'es' },
  ).validate({})

  assert.equal(result.error.message, 'El campo id no puede estar vacío')
})
