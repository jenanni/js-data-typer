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

test('timestamp from Date and ISO', () => {
  const schema = typer({ t: { type: 'timestamp' } })
  const iso = '2026-09-19T15:30:00.000Z'
  assert.equal(schema.validate({ t: iso }).data.t.toISOString(), iso)
  assert.equal(schema.validate({ t: new Date(iso) }).data.t.toISOString(), iso)
})

test('timestamp default now', () => {
  const before = Date.now()
  const result = typer({ t: { type: 'timestamp', default: 'now' } }).validate({})
  const after = Date.now()
  assert.ok(result.data.t instanceof Date)
  assert.ok(result.data.t.getTime() >= before)
  assert.ok(result.data.t.getTime() <= after)
})
