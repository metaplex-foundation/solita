// @ts-check
'use strict'

const PROGRAM_NAME = 'basic_2'
const PROGRAM_ID = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'

const path = require('path')
const generatedIdlDir = path.join(__dirname, '..', 'idl')
const generatedSDKDir = path.join(__dirname, '..', 'src', 'generated')
const { spawn } = require('child_process')
const { SolanaIdlToApi } = require('../../../../dist/src/solana-idl-to-api')
const { writeFile } = require('fs/promises')

const anchor = spawn('anchor', ['build', '--idl', generatedIdlDir])
  .on('error', (err) => {
    console.error(err)
    // @ts-ignore this err does have a code
    if (err.code === 'ENOENT') {
      console.error(
        'Ensure that `anchor` is installed and in your path, see:\n  https://project-serum.github.io/anchor/getting-started/installation.html#install-anchor\n'
      )
    }
    process.exit(1)
  })
  .on('exit', () => {
    console.error(
      'IDL written to: %s',
      path.join(generatedIdlDir, `${PROGRAM_NAME}.json`)
    )
    generateTypeScriptSDK()
  })

anchor.stdout.on('data', (buf) => console.log(buf.toString('utf8')))
anchor.stderr.on('data', (buf) => console.error(buf.toString('utf8')))

async function generateTypeScriptSDK() {
  console.error('Generating TypeScript SDK to %s', generatedSDKDir)
  const generatedIdlPath = path.join(generatedIdlDir, `${PROGRAM_NAME}.json`)

  const idl = require(generatedIdlPath)
  if (idl.metadata?.address == null) {
    idl.metadata = { ...idl.metadata, address: PROGRAM_ID }
    await writeFile(generatedIdlPath, JSON.stringify(idl, null, 2))
  }
  const gen = new SolanaIdlToApi(idl, { formatCode: true })
  await gen.renderAndWriteTo(generatedSDKDir)

  console.error('Success!')

  process.exit(0)
}
