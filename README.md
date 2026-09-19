# js-data-typer

**Validate and coerce API payloads in plain JavaScript — without a fluent schema DSL and without throwing on bad input.**

```js
import { typer } from 'js-data-typer'

const createInvoice = typer({
  entity_id: { type: 'integer', required: true, notZero: true, desc: 'Customer' },
  date: { type: 'date', required: true, desc: 'Date' },
  total: { type: 'decimal', required: true, positive: true, roundTo: 2 },
})

app.post('/api/invoices', (req, res) => {
  const result = createInvoice.validate(req.body)
  if (!result.ok) {
    return res.status(400).json({
      error: result.error.message,
      field: result.error.field,
      code: result.error.code,
    })
  }

  const { entity_id, date, total } = result.data
  // entity_id is a number, date is a Date, total is rounded
})
```

Built for **Node/Express-style APIs** (and similar) where `req.body` / `req.query` arrive as strings and you want typed values before business logic.

### Why this instead of Zod / Joi / Yup?

| You want… | Use |
|---|---|
| TypeScript-first schemas + `z.infer` | [Zod](https://zod.dev) |
| Forms / Formik | [Yup](https://github.com/jquense/yup) |
| JSON Schema / OpenAPI contracts | [Ajv](https://ajv.js.org) |
| Plain JS controllers, object schemas, coercion, Result returns | **js-data-typer** |

What you get here:

- schema as a **plain object** (`type`, `required`, `desc`) — readable in a controller
- **coercion built in** (`"12"` → `12`, `"19/09/2026"` → local `Date`, `"true"` → boolean)
- bad **input** → `{ ok: false, error }` (no try/catch for validation)
- bad **schema** → throws `SchemaError`
- **zero dependencies**, ESM

If your team already lives in TypeScript + Zod, stay there. If you write Express in JavaScript and miss a small typer that feels like the rest of your code, this is for you.

## Install

```bash
npm install js-data-typer
```

ESM-only (`import`). On Node 18/20, `require()` will not work. The runtime is JavaScript; `types/index.d.ts` is only for TypeScript autocomplete.

## Usage

Define the schema once, then validate. Coerced values are in `result.data`. Validation stops at the **first** field error.

```js
import { typer } from 'js-data-typer'

const schema = typer({
  entity_id: { type: 'integer', required: true, notZero: true, desc: 'Customer' },
  date: { type: 'date', required: true, desc: 'Date' },
})

const result = schema.validate(req.body)
if (!result.ok) return result.error

const { entity_id, date } = result.data
```

Examples of coercion:

- `entity_id: '12'` → `12`
- `date: '19/09/2026'` → `Date`

On failure, `result.error` is `{ message, field, code, label }`. `validate()` does not throw for bad input.

`toStatus()` was removed in **0.2.0**. Use `validate()` and read `result.data` / `result.error`.

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

## Nested objects

`type: 'object'` (alias `json`) can take a `schema`. Fields inside that schema can themselves be `object` with another `schema` — nesting is recursive.

```js
const schema = typer({
  customer: {
    type: 'object',
    required: true,
    schema: {
      name: { type: 'string', required: true, desc: 'Name' },
      address: {
        type: 'object',
        schema: {
          city: { type: 'string', required: true, desc: 'City' },
          zip: { type: 'integer' },
        },
      },
    },
  },
})

const result = schema.validate({
  customer: {
    name: 'Ana',
    address: { city: 'Rosario', zip: '2000' },
  },
})
if (!result.ok) return result.error

result.data.customer.address.city  // 'Rosario'
result.data.customer.address.zip   // 2000
```

A nested error uses the dotted path, e.g. `customer.address.city`.

Without `schema`, an `object` field only checks that the value is a plain object and leaves it as-is.

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
| `trim`, `lowercase` / `toLowerCase`, `uppercase` / `toUpperCase` | strings (case flags run before `sanitize`) |
| `sanitize` | string transforms: named steps and/or `{ replace }` / `{ remove }` with custom regex — see below |
| `min`, `max` | numbers, string length, array length, dates / timestamps (validated at schema compile time) |
| `roundTo` | decimal places |
| `values` / `oneOf` | for `enum` |
| `items` | array item type name (`'integer'`) or nested field schema |
| `schema` | nested object / `json_array` item shape |
| `limitFromTodayPlus` / `limitFromTodayMinus` | date bounds in days from today |

## String sanitize

`sanitize` is a transform pipeline for `string` fields (it does not validate). Steps run in order after `trim` / case flags. A step is a **name** or a **custom regex** object.

| Named step | Effect |
|---|---|
| `stripAccents` | NFD + remove combining marks (`Ñ`→`N`, `á`→`a`) |
| `ascii` | Keep printable ASCII only (0x20–0x7E) |
| `stripControls` | Remove C0/C1 controls and `U+FFFD` |
| `stripDigits` | Remove `0-9` |
| `digitsOnly` | Keep digits only |
| `lettersOnly` | Keep Unicode letters only |
| `alphanumeric` | Keep letters and digits |
| `collapseWhitespace` | Collapse whitespace runs to a single space |
| `stripQuotes` | Remove `'` and `"` |
| `uppercase` / `lowercase` | Case (also usable inside the pipeline for order) |

AFIP-style / fixed-width TXT (no eñes or accents):

```js
razon_social: {
  type: 'string',
  required: true,
  trim: true,
  sanitize: ['stripAccents', 'ascii', 'collapseWhitespace', 'uppercase'],
  desc: 'Razón social',
}
```

Custom regex (`RegExp` or string; strings compile with the `g` flag):

```js
nombre: {
  type: 'string',
  sanitize: [
    'stripAccents',
    { replace: [/[^A-Za-z0-9 ./-]/g, ''] },
    { remove: /\s{2,}/g },
    'collapseWhitespace',
  ],
}
```

Unknown step names or malformed `{ replace }` / `{ remove }` throw `SchemaError` when the schema is created.

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
