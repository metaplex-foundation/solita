import { Idl, Solita } from '../solita'
import { Options as PrettierOptions } from 'prettier'
import { logInfo } from '../utils'
import { Serializers, TypeAliases } from '../types'

export function generateTypeScriptSDK(
  idl: Idl,
  sdkDir: string,
  prettierConfig?: PrettierOptions,
  typeAliases?: TypeAliases,
  serializers?: Serializers,
  anchorRemainingAccounts?: boolean
) {
  logInfo('Generating TypeScript SDK to %s', sdkDir)
  const gen = new Solita(idl, {
    formatCode: true,
    formatOpts: prettierConfig,
    typeAliases,
    serializers,
    anchorRemainingAccounts,
  })
  return gen.renderAndWriteTo(sdkDir)
}
