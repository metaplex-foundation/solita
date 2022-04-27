// @ts-check
'use strict'

const path = require('path')
const { spawn } = require('child_process')
const { Solita } = require('../../../../dist/src/solita')
const { writeFile } = require('fs/promises')
const {
  rustbinMatch,
  confirmAutoMessageConsole,
} = require('@metaplex-foundation/rustbin')
const cargoToml = path.join(__dirname, '..', 'programs', 'puppet', 'Cargo.toml')

const generatedIdlDir = path.join(__dirname, '..', 'idl')
const rootDir = path.join(__dirname, '..', '..', '.crates')
const rustbinConfig = {
  rootDir,
  binaryName: 'anchor',
  binaryCrateName: 'anchor-cli',
  libName: 'anchor-lang',
  dryRun: false,
  cargoToml,
}

async function main() {
  const { fullPathToBinary: anchorExecutable } = await rustbinMatch(
    rustbinConfig,
    confirmAutoMessageConsole
  )
  const anchor = spawn(anchorExecutable, ['build', '--idl', generatedIdlDir])
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
    .on('exit', async () => {
      console.error('IDLs written to: %s', generatedIdlDir)
      await generateTypeScriptSDK({
        programName: 'puppet',
        programId: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
      })
      await generateTypeScriptSDK({
        programName: 'puppet_master',
        programId: 'HmbTLCmaGvZhKnn1Zfa1JVnp7vkMV4DYVxPLWBVoN65L',
      })
    })

  anchor.stdout.on('data', (buf) => console.log(buf.toString('utf8')))
  anchor.stderr.on('data', (buf) => console.error(buf.toString('utf8')))

  async function generateTypeScriptSDK({ programName, programId }) {
    const generatedSDKDir = path.join(
      __dirname,
      '..',
      'src',
      'generated',
      programName
    )
    console.error('Generating TypeScript SDK to %s', generatedSDKDir)
    const generatedIdlPath = path.join(generatedIdlDir, `${programName}.json`)

    const idl = require(generatedIdlPath)
    if (idl.metadata?.address == null) {
      idl.metadata = { ...idl.metadata, address: programId }
      await writeFile(generatedIdlPath, JSON.stringify(idl, null, 2))
    }
    const gen = new Solita(idl, { formatCode: true })
    return gen.renderAndWriteTo(generatedSDKDir)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
