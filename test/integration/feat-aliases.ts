import { Idl, Solita } from '../../src/solita'
import test from 'tape'
import path from 'path'
import {
  verifySyntacticCorrectnessForGeneratedDir,
  verifyTopLevelScriptForGeneratedDir,
  verifyWithTypescriptCompiler,
} from '../utils/verify-code'
import json from './fixtures/feat-aliases.json'
import { sync as rmrf } from 'rimraf'

const outputDir = path.join(__dirname, 'output', 'feat-aliases')
const generatedSDKDir = path.join(outputDir, 'generated')

test('renders type correct SDK for feat-aliases', async (t) => {
  rmrf(outputDir)
  const { comment, ...withoutComment } = json
  const idl = withoutComment as Idl
  idl.metadata = {
    ...idl.metadata,
    address: 'A1BvUFMKzoubnHEFhvhJxXyTfEN6r2DqCZxJFF9hfH3x',
  }
  const gen = new Solita(idl, {
    formatCode: true,
    typeAliases: { UnixTimestamp: 'i64' },
  })
  await gen.renderAndWriteTo(generatedSDKDir)
  await verifyWithTypescriptCompiler(t, generatedSDKDir)
  await verifySyntacticCorrectnessForGeneratedDir(t, generatedSDKDir)
  await verifyTopLevelScriptForGeneratedDir(t, generatedSDKDir)
})
