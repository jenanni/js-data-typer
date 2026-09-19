export class SchemaError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SchemaError'
  }
}

export class ValidationError extends Error {
  constructor({ message, field, code, label }) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.code = code
    this.label = label
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
      code: this.code,
      label: this.label,
    }
  }
}

export const CODES = Object.freeze({
  required: 'required',
  invalid_type: 'invalid_type',
  invalid_integer: 'invalid_integer',
  invalid_decimal: 'invalid_decimal',
  invalid_boolean: 'invalid_boolean',
  invalid_date: 'invalid_date',
  invalid_timestamp: 'invalid_timestamp',
  invalid_array: 'invalid_array',
  invalid_object: 'invalid_object',
  invalid_enum: 'invalid_enum',
  not_positive: 'not_positive',
  not_negative: 'not_negative',
  not_zero: 'not_zero',
  empty: 'empty',
  too_small: 'too_small',
  too_big: 'too_big',
})
