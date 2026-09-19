import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typer, CODES } from '../src/index.js'

test('enum values', () => {
  const schema = typer({ status: { type: 'enum', values: ['open', 'closed'] } })
  assert.equal(schema.validate({ status: 'open' }).data.status, 'open')
  assert.equal(schema.validate({ status: 'nope' }).error.code, CODES.invalid_enum)
})

test('oneOf alias', () => {
  const schema = typer({ status: { type: 'oneOf', oneOf: ['a', 'b'] } })
  assert.equal(schema.validate({ status: 'b' }).ok, true)
})

test('array of integers', () => {
  const schema = typer({ ids: { type: 'array', items: 'integer', notEmpty: true } })
  assert.deepEqual(schema.validate({ ids: ['1', '2'] }).data.ids, [1, 2])
  assert.equal(schema.validate({ ids: [] }).error.code, CODES.empty)
  assert.equal(schema.validate({ ids: ['x'] }).ok, false)
  assert.equal(schema.validate({ ids: ['x'] }).error.field, 'ids[0]')
})

test('nested object schema', () => {
  const schema = typer({
    address: {
      type: 'object',
      schema: {
        city: { type: 'string', required: true, desc: 'Ciudad' },
        zip: { type: 'integer' },
      },
    },
  })

  const ok = schema.validate({ address: { city: 'Rosario', zip: '2000' } })
  assert.equal(ok.ok, true)
  assert.equal(ok.data.address.city, 'Rosario')
  assert.equal(ok.data.address.zip, 2000)

  const fail = schema.validate({ address: { zip: 2000 } })
  assert.equal(fail.ok, false)
  assert.equal(fail.error.field, 'address.city')
})

test('json and json_array aliases', () => {
  const schema = typer({
    meta: { type: 'json' },
    rows: {
      type: 'json_array',
      schema: { id: { type: 'integer', required: true } },
    },
  })

  const result = schema.validate({
    meta: { a: 1 },
    rows: [{ id: '3' }],
  })
  assert.equal(result.ok, true)
  assert.deepEqual(result.data.meta, { a: 1 })
  assert.deepEqual(result.data.rows, [{ id: 3 }])
})
