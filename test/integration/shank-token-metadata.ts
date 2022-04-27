import { Idl, Solita } from '../../src/solita'
import test from 'tape'
import { promises as fs } from 'fs'
import path from 'path'
import {
  verifySyntacticCorrectnessForGeneratedDir,
  verifyTopLevelScriptForGeneratedDir,
  verifyWithTypescriptCompiler,
} from '../utils/verify-code'
import json from './fixtures/shank_token_metadata.json'

const outputDir = path.join(__dirname, 'output', 'shank-token-metadata')
const generatedSDKDir = path.join(outputDir, 'generated')

test('renders type correct SDK for shank_token_metadata and bubbles fixables', async (t) => {
  const idl = json as Idl
  const gen = new Solita(idl, { formatCode: true })
  await gen.renderAndWriteTo(generatedSDKDir)
  await verifyWithTypescriptCompiler(t, generatedSDKDir)
  await verifySyntacticCorrectnessForGeneratedDir(t, generatedSDKDir)
  await verifyTopLevelScriptForGeneratedDir(t, generatedSDKDir)

  async function verifyCodeMatches(relPath: string, rx: RegExp) {
    const fullPath = path.join(generatedSDKDir, relPath)
    const code = await fs.readFile(fullPath, 'utf8')
    t.match(code, rx, `Code inside ${relPath} matches ${rx.toString()}`)
  }
  await verifyCodeMatches('types/Data.ts', /FixableBeetArgsStruct<\s*Data\s*>/)
  await verifyCodeMatches(
    'instructions/CreateMetadataAccount.ts',
    /FixableBeetArgsStruct<\s*CreateMetadataAccountInstructionArgs/
  )
})
