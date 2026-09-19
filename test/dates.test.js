import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typer, CODES } from '../src/index.js'
import { startOfDay, addDays } from '../src/parse-date.js'

test('parses DD/MM/YYYY as local calendar date', () => {
  const result = typer({ d: { type: 'date' } }).validate({ d: '19/09/2026' })
  assert.equal(result.ok, true)
  assert.equal(result.data.d.getFullYear(), 2026)
  assert.equal(result.data.d.getMonth(), 8)
  assert.equal(result.data.d.getDate(), 19)
})

test('parses ISO date without UTC shift', () => {
  const result = typer({ d: { type: 'date' } }).validate({ d: '2026-09-19' })
  assert.equal(result.data.d.getDate(), 19)
  assert.equal(result.data.d.getMonth(), 8)
})

test('rejects invalid calendar dates', () => {
  const schema = typer({ d: { type: 'date' } })
  assert.equal(schema.validate({ d: '31/02/2026' }).error.code, CODES.invalid_date)
  assert.equal(schema.validate({ d: 'nope' }).ok, false)
})

test('rejects date strings with trailing junk', () => {
  const schema = typer({ d: { type: 'date' } })
  assert.equal(schema.validate({ d: '19/09/2026basura' }).error.code, CODES.invalid_date)
  assert.equal(schema.validate({ d: '2026-09-19hola' }).error.code, CODES.invalid_date)
})

test('default today', () => {
  const result = typer({ d: { type: 'date', default: 'today' } }).validate({})
  const today = startOfDay(new Date())
  assert.equal(result.data.d.getTime(), today.getTime())
})

test('limitFromTodayPlus rejects future dates beyond the window', () => {
  const schema = typer({ d: { type: 'date', limitFromTodayPlus: 1 } })
  const tooFar = addDays(startOfDay(new Date()), 3)
  const day = `${String(tooFar.getDate()).padStart(2, '0')}/${String(tooFar.getMonth() + 1).padStart(2, '0')}/${tooFar.getFullYear()}`
  assert.equal(schema.validate({ d: day }).error.code, CODES.too_big)
})

test('date min now accepts today', () => {
  const schema = typer({ d: { type: 'date', min: 'now' } })
  const today = startOfDay(new Date())
  const day = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
  assert.equal(schema.validate({ d: day }).ok, true)
})

test('timestamp from Date and ISO', () => {
  const schema = typer({ t: { type: 'timestamp' } })
  const iso = '2026-09-19T15:30:00.000Z'
  assert.equal(schema.validate({ t: iso }).data.t.toISOString(), iso)
  assert.equal(schema.validate({ t: new Date(iso) }).data.t.toISOString(), iso)
})

test('timestamp and date share DD/MM day order with time', () => {
  const dateResult = typer({ d: { type: 'date' } }).validate({ d: '09/10/2026' })
  const tsResult = typer({ t: { type: 'timestamp' } }).validate({ t: '09/10/2026 10:00' })

  assert.equal(dateResult.data.d.getMonth(), 9)
  assert.equal(dateResult.data.d.getDate(), 9)
  assert.equal(tsResult.data.t.getMonth(), 9)
  assert.equal(tsResult.data.t.getDate(), 9)
  assert.equal(tsResult.data.t.getHours(), 10)
  assert.equal(tsResult.data.t.getMinutes(), 0)
})

test('timestamp default now', () => {
  const before = Date.now()
  const result = typer({ t: { type: 'timestamp', default: 'now' } }).validate({})
  const after = Date.now()
  assert.ok(result.data.t instanceof Date)
  assert.ok(result.data.t.getTime() >= before)
  assert.ok(result.data.t.getTime() <= after)
})
