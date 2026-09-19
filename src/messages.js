const es = {
  required: 'El campo {field} no puede estar vacío',
  invalid_type: 'El campo {field} es incorrecto',
  invalid_integer: 'El campo {field} debe ser un entero',
  invalid_decimal: 'El campo {field} debe ser un número',
  invalid_boolean: 'El campo {field} es incorrecto',
  invalid_date: 'La fecha {field} es inválida',
  invalid_timestamp: 'La fecha y hora {field} es inválida',
  invalid_array: 'El listado {field} está vacío o es incorrecto',
  invalid_object: 'El objeto {field} es incorrecto',
  invalid_enum: 'El campo {field} es incorrecto',
  not_positive: 'El campo {field} no puede ser negativo',
  not_negative: 'El campo {field} no puede ser positivo',
  not_zero: 'El campo {field} no puede ser cero',
  empty: 'El campo {field} no puede estar vacío',
  too_small: 'El campo {field} es menor al mínimo permitido',
  too_big: 'El campo {field} es mayor al máximo permitido',
}

const en = {
  required: 'Field {field} is required',
  invalid_type: 'Field {field} is invalid',
  invalid_integer: 'Field {field} must be an integer',
  invalid_decimal: 'Field {field} must be a number',
  invalid_boolean: 'Field {field} is invalid',
  invalid_date: 'Date {field} is invalid',
  invalid_timestamp: 'Timestamp {field} is invalid',
  invalid_array: 'List {field} is empty or invalid',
  invalid_object: 'Object {field} is invalid',
  invalid_enum: 'Field {field} is invalid',
  not_positive: 'Field {field} cannot be negative',
  not_negative: 'Field {field} cannot be positive',
  not_zero: 'Field {field} cannot be zero',
  empty: 'Field {field} cannot be empty',
  too_small: 'Field {field} is below the minimum',
  too_big: 'Field {field} is above the maximum',
}

export const LOCALES = { es, en }

export function formatMessage(template, { field }) {
  return template.replaceAll('{field}', field)
}

export function makeTranslator({ locale = 'en', messages } = {}) {
  const base = LOCALES[locale] || LOCALES.en
  const table = messages ? { ...base, ...messages } : base

  return (code, label) => {
    const template = table[code] || LOCALES.en[code] || code
    return formatMessage(template, { field: label })
  }
}
