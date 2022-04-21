import { Idl, Solita } from '../../src/solita'
import test from 'tape'
import path from 'path'
import {
  verifySyntacticCorrectnessForGeneratedDir,
  verifyTopLevelScriptForGeneratedDir,
} from '../utils/verify-code'
import json from './fixtures/auction_house-1.1.4-anchor-0.24.0.json'

const outputDir = path.join(__dirname, 'output', 'ah-1.1.4-anchor-0.24.0')
const generatedSDKDir = path.join(outputDir, 'generated')

test('renders type correct SDK for auction house', async (t) => {
  const idl = json as Idl
  idl.metadata = {
    ...idl.metadata,
    address: 'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk',
  }
  const gen = new Solita(idl, { formatCode: true })
  await gen.renderAndWriteTo(generatedSDKDir)
  await verifySyntacticCorrectnessForGeneratedDir(t, generatedSDKDir)
  await verifyTopLevelScriptForGeneratedDir(t, generatedSDKDir)
})
