import { Idl, Solita } from '../solita'
import { Options as PrettierOptions } from 'prettier'
import { logInfo } from '../utils'

export function generateTypeScriptSDK(
  idl: Idl,
  sdkDir: string,
  prettierConfig?: PrettierOptions
) {
  logInfo('Generating TypeScript SDK to %s', sdkDir)
  const gen = new Solita(idl, { formatCode: true, formatOpts: prettierConfig })
  return gen.renderAndWriteTo(sdkDir)
}
