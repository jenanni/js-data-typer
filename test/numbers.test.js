import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typer, CODES } from '../src/index.js'

test('coerces integer strings and rejects dirty strings', () => {
  const schema = typer({ n: { type: 'integer' } })
  assert.equal(schema.validate({ n: '12' }).data.n, 12)
  assert.equal(schema.validate({ n: '-3' }).ok, true)
  assert.equal(schema.validate({ n: '12abc' }).ok, false)
  assert.equal(schema.validate({ n: 1.5 }).error.code, CODES.invalid_integer)
})

test('integer constraints', () => {
  const schema = typer({
    n: { type: 'integer', positive: true, notZero: true, desc: 'Monto' },
  })
  assert.equal(schema.validate({ n: -1 }).error.code, CODES.not_positive)
  assert.equal(schema.validate({ n: 0 }).error.code, CODES.not_zero)
  assert.equal(schema.validate({ n: 4 }).data.n, 4)
})

test('min and max', () => {
  const schema = typer({ n: { type: 'integer', min: 2, max: 5 } })
  assert.equal(schema.validate({ n: 1 }).error.code, CODES.too_small)
  assert.equal(schema.validate({ n: 6 }).error.code, CODES.too_big)
  assert.equal(schema.validate({ n: 2 }).ok, true)
})

test('optional integer blank becomes null or undefined', () => {
  const schema = typer({ n: { type: 'integer' } })
  assert.equal(schema.validate({}).data.n, undefined)
  assert.equal(schema.validate({ n: null }).data.n, null)
  assert.equal(schema.validate({ n: '' }).data.n, null)
})

test('default fills missing integer', () => {
  const schema = typer({ n: { type: 'integer', default: 0 } })
  assert.equal(schema.validate({}).data.n, 0)
})

test('required alias notNull', () => {
  const schema = typer({ n: { type: 'integer', notNull: true } })
  assert.equal(schema.validate({}).error.code, CODES.required)
})

test('decimal coerces and rounds', () => {
  const schema = typer({ n: { type: 'decimal', roundTo: 2 } })
  assert.equal(schema.validate({ n: '1.456' }).data.n, 1.46)
  assert.equal(schema.validate({ n: 'x' }).ok, false)
})

test('rejects unsafe integers from number and string', () => {
  const schema = typer({ n: { type: 'integer' } })
  assert.equal(schema.validate({ n: 1e21 }).error.code, CODES.invalid_integer)
  assert.equal(schema.validate({ n: '1e21' }).error.code, CODES.invalid_integer)
})
