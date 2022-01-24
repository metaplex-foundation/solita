import { Idl, Solita } from '../../src/solita'
import test from 'tape'
import path from 'path'
import { verifySyntacticCorrectnessForGeneratedDir } from '../utils/verify-code'
import json from './fixtures/gumdrop.json'

const outputDir = path.join(__dirname, 'output', 'gumdrop')
const generatedSDKDir = path.join(outputDir, 'generated')

test('renders type correct SDK for gumdrop', async (t) => {
  const idl = json as Idl
  idl.metadata = { ...idl.metadata, address: 'gumdrop program id' }
  const gen = new Solita(idl, { formatCode: true })
  await gen.renderAndWriteTo(generatedSDKDir)
  await verifySyntacticCorrectnessForGeneratedDir(t, generatedSDKDir)
})
