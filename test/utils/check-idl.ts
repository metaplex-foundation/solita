import { Idl, Solita, SolitaOpts } from '../../src/solita'
import test from 'tape'
import path from 'path'
import {
  verifySyntacticCorrectnessForGeneratedDir,
  verifyTopLevelScriptForGeneratedDir,
  verifyWithTypescriptCompiler,
} from '../utils/verify-code'
import { sync as rmrf } from 'rimraf'

export async function checkIdl(
  t: test.Test,
  idl: Idl,
  label: string,
  opts?: SolitaOpts
) {
  const outputDir = path.join(__dirname, 'output', label)
  const generatedSDKDir = path.join(outputDir, 'generated')
  rmrf(outputDir)

  opts ??= { formatCode: true }
  const gen = new Solita(idl, opts)
  await gen.renderAndWriteTo(generatedSDKDir)
  await verifyWithTypescriptCompiler(t, generatedSDKDir)
  await verifySyntacticCorrectnessForGeneratedDir(t, generatedSDKDir)
  await verifyTopLevelScriptForGeneratedDir(t, generatedSDKDir)

  return { outputDir, generatedSDKDir }
}
