import { Idl, Solita } from '../solita'

export function generateTypeScriptSDK(idl: Idl, sdkDir: string) {
  console.error('Generating TypeScript SDK to %s', sdkDir)
  const gen = new Solita(idl, { formatCode: true })
  return gen.renderAndWriteTo(sdkDir)
}
