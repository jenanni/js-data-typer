# js-data-typer

Runtime validation and coercion for JavaScript. Invalid **input** returns a Result object. Invalid **schemas** throw. No dependencies. Node 18+.

The published package is JavaScript (`src/*.js`). `types/index.d.ts` is only a declaration file so TypeScript projects get autocomplete; it is not the runtime.

## Install

```bash
npm install js-data-typer
```

## Usage

Define the schema, then validate the payload. Coerced values are in `result.data`.

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

A broken schema (missing `type`, unknown type, empty enum, …) always throws `SchemaError`, including with `validate()`.

### Inline `value`

You can put the value on each field and call `validate()` with no argument:

```js
const result = typer({
  entity_id: { type: 'integer', value: req.body.entity_id, required: true, desc: 'Cliente' },
  date: { type: 'date', value: req.body.date },
}).validate()

if (!result.ok) return result.error
const { entity_id, date } = result.data
```

If you pass an object to `validate(data)`, that object is used and inline `value` is ignored.

### `toStatus()`

`validate()` always returns a Result with a nested `data` or `error` object:

```js
// success
{ ok: true, data: { entity_id: 12, date: /* Date */ } }

// failure
{
  ok: false,
  error: {
    message: 'Field Cliente is required',
    field: 'entity_id',
    code: 'required',
    label: 'Cliente',
  },
}
```

`toStatus(result)` flattens that into a single object, with `status: 'ok' | 'error'`:

```js
import { typer, toStatus } from 'js-data-typer'

const typed = toStatus(schema.validate(req.body))

if (typed.status === 'error') {
  typed.msg    // 'Field Cliente is required'
  typed.field  // 'entity_id'
  return typed
}

typed.entity_id  // 12
typed.date       // Date
```

| `validate()` | `toStatus(result)` |
|---|---|
| `{ ok: true, data: { entity_id, date } }` | `{ status: 'ok', entity_id, date }` |
| `{ ok: false, error: { message, field, code, label } }` | `{ status: 'error', msg, field }` |

`code` and `label` are not copied. Use `validate()` if you need them.

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

A nested error uses the item path, e.g. `items[0].article_id`.

A single object uses `type: 'object'` (alias `json`) with the same `schema` option.

## Field options

| Option | Notes |
|---|---|
| `type` | required |
| `label` / `desc` | used in messages (`desc` is an alias) |
| `required` / `notNull` | aliases |
| `default` | used when the value is `null` / `undefined` / blank. Dates: `'today'`. Timestamps: `'now'` |
| `positive` | rejects numbers `< 0` (zero is allowed; combine with `notZero`) |
| `negative` | rejects numbers `> 0` |
| `notZero` | rejects `0` |
| `notEmpty` | rejects empty string / array / object |
| `trim`, `lowercase` / `toLowerCase` | strings |
| `min`, `max` | numbers, string length, array length, dates |
| `roundTo` | decimal places |
| `values` / `oneOf` | for `enum` |
| `items` | array item type name (`'integer'`) or nested field schema |
| `schema` | nested object / `json_array` item shape |
| `limitFromTodayPlus` / `limitFromTodayMinus` | date bounds in days from today |

## Types

`integer`, `string`, `decimal`, `boolean`, `date`, `timestamp`, `array`, `object`, `enum`

Aliases: `oneOf` → `enum`, `json` → `object`, `json_array` → array of objects.

Coercion:

- integer / decimal from numeric strings (`"12"`, `"1.50"`). `"12abc"` is rejected.
- boolean from `true`/`false`, `"true"`/`"false"`/`"t"`/`"f"`, `1`/`0`
- date from `Date`, `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY` (local calendar day, no UTC shift)

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
