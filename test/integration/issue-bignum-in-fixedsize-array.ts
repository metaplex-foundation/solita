import { Idl, Solita } from '../../src/solita'
import test from 'tape'
import path from 'path'
import {
  verifySyntacticCorrectnessForGeneratedDir,
  verifyTopLevelScriptForGeneratedDir,
  verifyWithTypescriptCompiler,
} from '../utils/verify-code'
import json from './fixtures/issue-bignum-in-fixedsize-array.json'
import { sync as rmrf } from 'rimraf'

const outputDir = path.join(
  __dirname,
  'output',
  'issue-bignum-in-fixedsize-array'
)
const generatedSDKDir = path.join(outputDir, 'generated')

test('renders type correct SDK for issue-bignum-in-fixedsize-array', async (t) => {
  rmrf(outputDir)
  const idl = json as Idl
  idl.metadata = {
    ...idl.metadata,
    address: 'onWsq9BVjet8HQWn5rNqpx59po791P3u6PLvNRvSU9p',
  }
  const gen = new Solita(idl, { formatCode: true })
  await gen.renderAndWriteTo(generatedSDKDir)
  await verifyWithTypescriptCompiler(t, generatedSDKDir)
  await verifySyntacticCorrectnessForGeneratedDir(t, generatedSDKDir)
  await verifyTopLevelScriptForGeneratedDir(t, generatedSDKDir)
})
