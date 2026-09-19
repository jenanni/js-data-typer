import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typer, SchemaError, CODES } from '../src/index.js'

test('stripAccents turns Ñ and accents into ASCII letters', () => {
  const schema = typer({
    name: { type: 'string', sanitize: 'stripAccents' },
  })
  assert.equal(schema.validate({ name: 'Ñandú José' }).data.name, 'Nandu Jose')
})

test('ascii removes non-printable-ascii after stripAccents', () => {
  const schema = typer({
    name: {
      type: 'string',
      sanitize: ['stripAccents', 'ascii', 'collapseWhitespace', 'uppercase'],
    },
  })
  assert.equal(
    schema.validate({ name: '  Sociedad Ñandú S.A.  ' }).data.name,
    'SOCIEDAD NANDU S.A.',
  )
})

test('stripDigits and digitsOnly', () => {
  const strip = typer({ s: { type: 'string', sanitize: 'stripDigits' } })
  const only = typer({ s: { type: 'string', sanitize: 'digitsOnly' } })
  assert.equal(strip.validate({ s: 'AB12CD' }).data.s, 'ABCD')
  assert.equal(only.validate({ s: 'AB12CD' }).data.s, '12')
})

test('stripQuotes and stripControls', () => {
  const schema = typer({
    s: { type: 'string', sanitize: ['stripQuotes', 'stripControls'] },
  })
  assert.equal(schema.validate({ s: "O'Brien\u0001" }).data.s, 'OBrien')
})

test('custom replace regex keeps allowed chars', () => {
  const schema = typer({
    name: {
      type: 'string',
      sanitize: [
        'stripAccents',
        { replace: [/[^A-Za-z0-9 ./-]/g, ''] },
        'collapseWhitespace',
      ],
    },
  })
  assert.equal(schema.validate({ name: 'José #Ñandú!' }).data.name, 'Jose Nandu')
})

test('custom remove and string pattern', () => {
  const schema = typer({
    s: {
      type: 'string',
      sanitize: [{ remove: '\\d+' }, { replace: ['\\s+', '-'] }],
    },
  })
  assert.equal(schema.validate({ s: 'ab 12 cd' }).data.s, 'ab-cd')
})

test('sanitize runs before required check', () => {
  const schema = typer({
    s: { type: 'string', required: true, sanitize: 'ascii' },
  })
  const result = schema.validate({ s: 'Ñ' })
  // stripAccents not applied — Ñ is non-ascii so ascii wipes it
  assert.equal(result.ok, false)
  assert.equal(result.error.code, CODES.required)
})

test('unknown sanitize step throws SchemaError', () => {
  assert.throws(
    () => typer({ s: { type: 'string', sanitize: 'nope' } }),
    /unknown sanitize step/,
  )
})

test('invalid replace shape throws SchemaError', () => {
  assert.throws(
    () => typer({ s: { type: 'string', sanitize: { replace: 'x' } } }),
    SchemaError,
  )
})

test('uppercase flag and lowercase conflict', () => {
  assert.throws(
    () => typer({ s: { type: 'string', uppercase: true, lowercase: true } }),
    /cannot set both uppercase and lowercase/,
  )
})

test('sanitize only on string fields', () => {
  assert.throws(
    () => typer({ n: { type: 'integer', sanitize: 'ascii' } }),
    /only supported on string/,
  )
})
