export class SchemaError extends Error {
  constructor(message: string)
  name: 'SchemaError'
}

export class ValidationError extends Error {
  constructor(error: ValidationIssue)
  name: 'ValidationError'
  field?: string
  code: string
  label?: string
  toJSON(): ValidationIssue & { name: 'ValidationError' }
}

export const CODES: {
  readonly required: 'required'
  readonly invalid_type: 'invalid_type'
  readonly invalid_integer: 'invalid_integer'
  readonly invalid_decimal: 'invalid_decimal'
  readonly invalid_boolean: 'invalid_boolean'
  readonly invalid_date: 'invalid_date'
  readonly invalid_timestamp: 'invalid_timestamp'
  readonly invalid_array: 'invalid_array'
  readonly invalid_object: 'invalid_object'
  readonly invalid_enum: 'invalid_enum'
  readonly not_positive: 'not_positive'
  readonly not_negative: 'not_negative'
  readonly not_zero: 'not_zero'
  readonly empty: 'empty'
  readonly too_small: 'too_small'
  readonly too_big: 'too_big'
}

export type Locale = 'es' | 'en'

export type FieldType =
  | 'integer'
  | 'string'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'array'
  | 'object'
  | 'enum'
  | 'oneOf'
  | 'json'
  | 'json_array'

export interface FieldSchema {
  type: FieldType
  /** Human label used in error messages. Alias: `desc`. */
  label?: string
  desc?: string
  /** Alias: `notNull`. */
  required?: boolean
  notNull?: boolean
  default?: unknown
  /** Inline value when `validate()` is called without data. */
  value?: unknown
  positive?: boolean
  negative?: boolean
  notZero?: boolean
  notEmpty?: boolean
  trim?: boolean
  lowercase?: boolean
  toLowerCase?: boolean
  min?: number | string | Date | 'today' | 'now'
  max?: number | string | Date | 'today' | 'now'
  roundTo?: number
  values?: unknown[]
  oneOf?: unknown[]
  items?: FieldType | FieldSchema
  schema?: Schema
  limitFromTodayPlus?: number
  limitFromTodayMinus?: number
}

export type Schema = Record<string, FieldSchema>

export interface TyperOptions {
  /** Message language. Defaults to `'en'`. */
  locale?: Locale
  messages?: Partial<Record<keyof typeof CODES, string>>
}

export interface ValidationIssue {
  message: string
  field?: string
  code: string
  label?: string
}

export type Result<T = Record<string, unknown>> =
  | { ok: true; data: T }
  | { ok: false; error: ValidationIssue }

export interface Typer<T = Record<string, unknown>> {
  validate(data?: unknown): Result<T>
  parse(data?: unknown): T
}

export function typer<T = Record<string, unknown>>(
  schema: Schema,
  options?: TyperOptions,
): Typer<T>

export function toStatus<T extends Record<string, unknown>>(
  result: Result<T>,
):
  | ({ status: 'ok' } & T)
  | { status: 'error'; msg: string; field?: string }

export const LOCALES: Record<Locale, Record<string, string>>

export default typer
