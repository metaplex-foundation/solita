import { AnchorError } from './types'

function renderError(error: AnchorError) {
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
    super('${msg}');
    Error.captureStackTrace(this, ${className});
  }
}
`
}

export function renderErrors(errors: AnchorError[]) {
  return errors.map(renderError).join('\n')
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
