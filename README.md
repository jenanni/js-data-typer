# js-data-typer

Runtime validation and coercion for JavaScript. Invalid **input** returns a Result object. Invalid **schemas** throw. No dependencies. Node 18+.

The published package is JavaScript (`src/*.js`). `types/index.d.ts` is only a declaration file so TypeScript projects get autocomplete; it is not the runtime.

The package is **ESM-only** (`import`). On Node 18 and 20, `require()` will not work. Node 22+ can require ESM in some cases, but the supported API is `import`.

`toStatus()` was removed in **0.2.0**. Use `validate()` and read `result.data` / `result.error`.

## Install

```bash
npm install js-data-typer
```

## Usage

Define the schema, then validate the payload. Coerced values are in `result.data`. Validation stops at the **first** field error.

```js
import { typer } from 'js-data-typer'

const schema = typer({
  entity_id: { type: 'integer', required: true, notZero: true, desc: 'Cliente' },
  date: { type: 'date', required: true, desc: 'Fecha' },
})

const result = schema.validate(req.body)
if (!result.ok) return result.error

const { entity_id, date } = result.data
```

Examples of coercion:

- `entity_id: '12'` → `12`
- `date: '19/09/2026'` → `Date`

On failure, `result.error` is `{ message, field, code, label }`. `validate()` does not throw for bad input.

### `parse()`

Same schema, but bad input throws `ValidationError` (`message`, `field`, `code`) instead of returning a Result:

```js
const { entity_id, date } = schema.parse(req.body)
```

A broken schema (missing `type`, unknown type, empty enum, invalid `min`/`max`, …) always throws `SchemaError`, including with `validate()`.

### Inline `value` (merge with `validate(data)`)

Each field can declare an inline `value`. Values are resolved **per key**:

1. If the inline value is **defined** (including `null`), it wins.
2. If the inline value is **`undefined`**, the value from `validate(data)` is used.
3. You can mix both sources in the same schema.

```js
const result = typer({
  // fixed from the session — wins over body.user_id
  user_id: { type: 'integer', value: payload.us, required: true, desc: 'Usuario' },
  // taken from the body when present
  name: { type: 'string', value: undefined, required: true, desc: 'Nombre' },
  date: { type: 'date', value: undefined },
}).validate(req.body)

if (!result.ok) return result.error
const { user_id, name, date } = result.data
```

Only inline, no argument:

```js
typer({
  name: { type: 'string', value: req.body.name, required: true },
}).validate()
```

If you call `validate()` with no data and **no** field declares `value`, that throws `SchemaError` (missing argument). If a field declares `value: undefined` and is `required`, you get a normal `{ ok: false, error: { code: 'required' } }`.

## Arrays of objects

`json_array` validates a list of objects against a nested `schema`. Each item is coerced the same way as a top-level field.

```js
const schema = typer({
  items: {
    type: 'json_array',
    notEmpty: true,
    desc: 'Items',
    schema: {
      article_id: { type: 'integer', required: true, desc: 'Artículo' },
      qty: { type: 'decimal', required: true, positive: true, notZero: true, desc: 'Cantidad' },
      observ: { type: 'string', trim: true },
    },
  },
})

const result = schema.validate({
  items: [
    { article_id: '10', qty: '2.5' },
    { article_id: 11, qty: 1 },
  ],
})
if (!result.ok) return result.error

result.data.items
// [
//   { article_id: 10, qty: 2.5, observ: undefined },
//   { article_id: 11, qty: 1, observ: undefined },
// ]
```

Equivalent form, without the alias:

```js
typer({
  items: {
    type: 'array',
    notEmpty: true,
    items: {
      type: 'object',
      schema: {
        article_id: { type: 'integer', required: true },
        qty: { type: 'decimal', required: true },
      },
    },
  },
})
```

Do not pass both `items` and `schema` on a `json_array` field — that throws `SchemaError`.

A nested error uses the item path, e.g. `items[0].article_id`.

A single object uses `type: 'object'` (alias `json`) with the same `schema` option.

## Field options

| Option | Notes |
|---|---|
| `type` | required |
| `label` / `desc` | used in messages (`desc` is an alias) |
| `required` / `notNull` | aliases |
| `default` | used when the value is `null` / `undefined` / blank (`''`). Dates: `'today'`. Timestamps: `'now'` |
| `value` | inline value; see merge rules above |
| `positive` | rejects numbers `< 0` (zero is allowed; combine with `notZero`) |
| `negative` | rejects numbers `> 0` |
| `notZero` | rejects `0` |
| `notEmpty` | rejects empty string / array / object |
| `trim`, `lowercase` / `toLowerCase` | strings |
| `min`, `max` | numbers, string length, array length, dates / timestamps (validated at schema compile time) |
| `roundTo` | decimal places |
| `values` / `oneOf` | for `enum` |
| `items` | array item type name (`'integer'`) or nested field schema |
| `schema` | nested object / `json_array` item shape |
| `limitFromTodayPlus` / `limitFromTodayMinus` | date bounds in days from today |

## Types

`integer`, `string`, `decimal`, `boolean`, `date`, `timestamp`, `array`, `object`, `enum`

Aliases: `oneOf` → `enum`, `json` → `object`, `json_array` → array of objects.

Coercion:

- integer / decimal from numeric strings (`"12"`, `"1.50"`). `"12abc"` is rejected. Integers must be safe integers.
- boolean from `true`/`false`, `"true"`/`"false"`/`"t"`/`"f"`, `1`/`0`
- date from `Date`, `YYYY-MM-DD`, `YYYY/MM/DD`, `DD/MM/YYYY`, `DD-MM-YYYY`, and two-digit years (`19/09/26` → 2026). Local calendar day; trailing junk is rejected.
- timestamp from `Date`, epoch milliseconds, ISO (`2026-09-19T15:30:00Z`), or the same day formats as `date` with an optional local time (`09/10/2026 10:00`). Day order matches `date` (`DD/MM`).

```js
typer({
  tags: { type: 'array', items: 'string', notEmpty: true },
  address: {
    type: 'object',
    schema: {
      city: { type: 'string', required: true, desc: 'Ciudad' },
      zip: { type: 'integer' },
    },
  },
  status: { type: 'enum', values: ['open', 'closed'] },
})
```

## Locales

Default messages are English. Pass `locale: 'es'` for Spanish, or override templates (`{field}` is replaced by the field label):

```js
typer(schema, { locale: 'es' })
typer(schema, {
  messages: { required: '{field} is missing' },
})
```

## License

MIT
