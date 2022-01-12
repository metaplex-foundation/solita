import { Solita } from '../src/solita'
import test from 'tape'
import path from 'path'

const outputDir = path.join(__dirname, 'output', 'ncm')
const generatedSDKDir = path.join(outputDir, 'generated')

test('renders type correct SDK for nft-candy-machine', async (t) => {
  const idl = require('./fixtures/nft_candy_machine.json')
  idl.metadata = { ...idl.metadata, address: 'candymachine program id' }
  const gen = new Solita(idl, { formatCode: true })
  await gen.renderAndWriteTo(generatedSDKDir)
})
