import { Idl, Solita } from '../solita'
import { Options as PrettierOptions } from 'prettier'
import { logInfo } from '../utils'
import { TypeAliases } from '../types'

export function generateTypeScriptSDK(
  idl: Idl,
  sdkDir: string,
  prettierConfig?: PrettierOptions,
  typeAliases?: TypeAliases
) {
  logInfo('Generating TypeScript SDK to %s', sdkDir)
  const gen = new Solita(idl, {
    formatCode: true,
    formatOpts: prettierConfig,
    typeAliases,
  })
  return gen.renderAndWriteTo(sdkDir)
}
