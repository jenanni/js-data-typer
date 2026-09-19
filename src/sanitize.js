import { SchemaError } from './errors.js'

export const NAMED_SANITIZERS = Object.freeze({
  stripAccents(value) {
    return value.normalize('NFD').replace(/\p{M}/gu, '')
  },
  ascii(value) {
    return value.replace(/[^\x20-\x7E]/g, '')
  },
  stripControls(value) {
    return value.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, '')
  },
  stripDigits(value) {
    return value.replace(/\d/g, '')
  },
  digitsOnly(value) {
    return value.replace(/\D/g, '')
  },
  lettersOnly(value) {
    return value.replace(/[^\p{L}]/gu, '')
  },
  alphanumeric(value) {
    return value.replace(/[^\p{L}\p{N}]/gu, '')
  },
  collapseWhitespace(value) {
    return value.replace(/\s+/g, ' ').trim()
  },
  stripQuotes(value) {
    return value.replace(/['"]/g, '')
  },
  uppercase(value) {
    return value.toUpperCase()
  },
  lowercase(value) {
    return value.toLowerCase()
  },
})

function toGlobalRegExp(pattern, fieldKey) {
  if (pattern instanceof RegExp) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
    return new RegExp(pattern.source, flags)
  }
  if (typeof pattern === 'string') {
    try {
      return new RegExp(pattern, 'g')
    } catch (error) {
      throw new SchemaError(`Field "${fieldKey}": sanitize pattern is invalid (${error.message})`)
    }
  }
  throw new SchemaError(`Field "${fieldKey}": sanitize pattern must be a RegExp or string`)
}

function compileNamed(name, fieldKey) {
  const fn = NAMED_SANITIZERS[name]
  if (!fn) {
    throw new SchemaError(`Field "${fieldKey}": unknown sanitize step "${name}"`)
  }
  return fn
}

function compileReplace(step, fieldKey) {
  if (!Array.isArray(step.replace) || step.replace.length < 1 || step.replace.length > 2) {
    throw new SchemaError(`Field "${fieldKey}": sanitize replace must be [pattern, replacement?]`)
  }
  const [pattern, replacement = ''] = step.replace
  if (typeof replacement !== 'string') {
    throw new SchemaError(`Field "${fieldKey}": sanitize replace replacement must be a string`)
  }
  const re = toGlobalRegExp(pattern, fieldKey)
  return (value) => value.replace(re, replacement)
}

function compileRemove(step, fieldKey) {
  if (!Object.prototype.hasOwnProperty.call(step, 'remove')) {
    throw new SchemaError(`Field "${fieldKey}": sanitize remove requires a pattern`)
  }
  const re = toGlobalRegExp(step.remove, fieldKey)
  return (value) => value.replace(re, '')
}

export function compileSanitizeStep(step, fieldKey) {
  if (typeof step === 'string') {
    return compileNamed(step, fieldKey)
  }

  if (step && typeof step === 'object' && !Array.isArray(step)) {
    if (Object.prototype.hasOwnProperty.call(step, 'replace')) {
      return compileReplace(step, fieldKey)
    }
    if (Object.prototype.hasOwnProperty.call(step, 'remove')) {
      return compileRemove(step, fieldKey)
    }
  }

  throw new SchemaError(
    `Field "${fieldKey}": sanitize step must be a known name, { replace: [pattern, replacement?] }, or { remove: pattern }`,
  )
}

export function compileSanitize(sanitize, fieldKey) {
  if (sanitize === undefined) return undefined
  const steps = Array.isArray(sanitize) ? sanitize : [sanitize]
  if (steps.length === 0) {
    throw new SchemaError(`Field "${fieldKey}": sanitize must not be an empty array`)
  }
  return steps.map((step) => compileSanitizeStep(step, fieldKey))
}

export function applySanitize(value, compiledSteps) {
  if (!compiledSteps || compiledSteps.length === 0) return value
  let out = value
  for (const step of compiledSteps) {
    out = step(out)
  }
  return out
}
