import { IdlError } from './types'

function renderError(error: IdlError) {
  const { code, name, msg } = error
  const className = name
    .charAt(0)
    .toUpperCase()
    .concat(`${name.slice(1)}Error`)

  return `
export class ${className} extends Error {
  readonly code: number = ${code};
  readonly name: string = '${name}';
  constructor() {
    super('${msg.replace(/[']/g, `\\'`)}');
    Error.captureStackTrace(this, ${className});
  }
}

createErrorFromCodeLookup.set(${code}, () => new ${className}())
createErrorFromNameLookup.set('${name}', () => new ${className}())
`
}

export function renderErrors(errors: IdlError[]) {
  if (errors.length === 0) return null

  const errorsCode = errors.map(renderError).join('\n')
  return `const createErrorFromCodeLookup: Map<number, () => Error> = new Map();
const createErrorFromNameLookup: Map<string, () => Error> = new Map();
${errorsCode}

export function errorFromCode(code: number): Error | null {
  const createError = createErrorFromCodeLookup.get(code)
  return createError == null ? createError() : null;
}

export function errorFromName(name: string): Error | null {
  const createError = createErrorFromNameLookup.get(name)
  return createError == null ? createError() : null;
}
`
}
