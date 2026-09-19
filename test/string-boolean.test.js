import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typer, CODES } from '../src/index.js'

test('trims and lowercases strings', () => {
  const schema = typer({
    name: { type: 'string', trim: true, lowercase: true, required: true },
  })
  assert.equal(schema.validate({ name: '  ANA  ' }).data.name, 'ana')
})

test('required string rejects whitespace', () => {
  const schema = typer({ name: { type: 'string', required: true, desc: 'Nombre' } })
  assert.equal(schema.validate({ name: '   ' }).error.code, CODES.required)
})

test('string min max length', () => {
  const schema = typer({ name: { type: 'string', min: 2, max: 4 } })
  assert.equal(schema.validate({ name: 'a' }).error.code, CODES.too_small)
  assert.equal(schema.validate({ name: 'abcde' }).error.code, CODES.too_big)
  assert.equal(schema.validate({ name: 'ab' }).ok, true)
})

test('rejects non-strings', () => {
  const schema = typer({ name: { type: 'string' } })
  assert.equal(schema.validate({ name: 1 }).error.code, CODES.invalid_type)
})

test('boolean coercion', () => {
  const schema = typer({ on: { type: 'boolean' } })
  assert.equal(schema.validate({ on: true }).data.on, true)
  assert.equal(schema.validate({ on: 't' }).data.on, true)
  assert.equal(schema.validate({ on: 'FALSE' }).data.on, false)
  assert.equal(schema.validate({ on: 0 }).data.on, false)
  assert.equal(schema.validate({ on: 'maybe' }).ok, false)
})

test('boolean default', () => {
  const schema = typer({ on: { type: 'boolean', default: true } })
  assert.equal(schema.validate({}).data.on, true)
})
