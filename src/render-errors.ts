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

if (module === require.main) {
  async function main() {
    const errors = require('../test/fixtures/auction_house.json').errors
    console.log(renderErrors(errors))
  }

  main()
    .then(() => process.exit(0))
    .catch((err: any) => {
      console.error(err)
      process.exit(1)
    })
}

export class MyError extends Error {
  readonly code: number = 6000
  readonly name: string = 'PublicKeyMismatch'
  constructor() {
    super('PublicKeyMismatch')
  }
}
