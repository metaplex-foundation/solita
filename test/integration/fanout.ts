import { Idl, Solita } from '../../src/solita'
import test from 'tape'
import path from 'path'
import {
  verifySyntacticCorrectnessForGeneratedDir,
  verifyTopLevelScriptForGeneratedDir,
} from '../utils/verify-code'
import json from './fixtures/fanout.json'

const outputDir = path.join(__dirname, 'output', 'fanout')
const generatedSDKDir = path.join(outputDir, 'generated')

test('renders type correct SDK for fanout', async (t) => {
  const idl = json as Idl
  idl.metadata = { ...idl.metadata, address: 'fanout program id' }
  const gen = new Solita(idl, { formatCode: true })
  await gen.renderAndWriteTo(generatedSDKDir)
  await verifySyntacticCorrectnessForGeneratedDir(t, generatedSDKDir)
  await verifyTopLevelScriptForGeneratedDir(t, generatedSDKDir)
})
