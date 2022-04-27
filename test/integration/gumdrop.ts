import { Idl, Solita } from '../../src/solita'
import test from 'tape'
import path from 'path'
import {
  verifySyntacticCorrectnessForGeneratedDir,
  verifyTopLevelScriptForGeneratedDir,
  verifyWithTypescriptCompiler,
} from '../utils/verify-code'
import json from './fixtures/gumdrop.json'

const outputDir = path.join(__dirname, 'output', 'gumdrop')
const generatedSDKDir = path.join(outputDir, 'generated')

test('renders type correct SDK for gumdrop', async (t) => {
  const idl = json as Idl
  idl.metadata = {
    ...idl.metadata,
    address: 'gdrpGjVffourzkdDRrQmySw4aTHr8a3xmQzzxSwFD1a',
  }
  const gen = new Solita(idl, { formatCode: true })
  await gen.renderAndWriteTo(generatedSDKDir)
  await verifyWithTypescriptCompiler(t, generatedSDKDir)
  await verifySyntacticCorrectnessForGeneratedDir(t, generatedSDKDir)
  await verifyTopLevelScriptForGeneratedDir(t, generatedSDKDir)
})
