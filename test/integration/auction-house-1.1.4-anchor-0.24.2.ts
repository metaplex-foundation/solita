import { Idl, Solita } from '../../src/solita'
import test from 'tape'
import path from 'path'
import {
  verifySyntacticCorrectnessForGeneratedDir,
  verifyTopLevelScriptForGeneratedDir,
  verifyWithTypescriptCompiler,
} from '../utils/verify-code'
import json from './fixtures/auction_house-1.1.4-anchor-0.24.2.json'
import { sync as rmrf } from 'rimraf'

const outputDir = path.join(__dirname, 'output', 'ah-1.1.4-anchor-0.24.2')
const generatedSDKDir = path.join(outputDir, 'generated')

test('renders type correct SDK for auction house 1.1.4 using anchor-0.24.2', async (t) => {
  rmrf(outputDir)

  const idl = json as Idl
  idl.metadata = {
    ...idl.metadata,
    address: 'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk',
  }
  const gen = new Solita(idl, { formatCode: true })
  await gen.renderAndWriteTo(generatedSDKDir)
  await verifyWithTypescriptCompiler(t, generatedSDKDir)
  await verifySyntacticCorrectnessForGeneratedDir(t, generatedSDKDir)
  await verifyTopLevelScriptForGeneratedDir(t, generatedSDKDir)
})
