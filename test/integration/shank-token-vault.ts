import { Idl, Solita } from '../../src/solita'
import test from 'tape'
import path from 'path'
import { verifySyntacticCorrectnessForGeneratedDir } from '../utils/verify-code'
import json from './fixtures/shank_token_vault.json'

const outputDir = path.join(__dirname, 'output', 'shank-token-vault')
const generatedSDKDir = path.join(outputDir, 'generated')

test('renders type correct SDK for shank_token_vault', async (t) => {
  const idl = json as Idl
  const gen = new Solita(idl, { formatCode: true })
  await gen.renderAndWriteTo(generatedSDKDir)
  await verifySyntacticCorrectnessForGeneratedDir(t, generatedSDKDir)
})
