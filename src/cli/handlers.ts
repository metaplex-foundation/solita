import {
  rustbinMatch,
  confirmAutoMessageConsole,
  RustbinConfig,
  RustbinMatchReturn,
} from '@metaplex-foundation/rustbin'
import { spawn, SpawnOptionsWithoutStdio } from 'child_process'
import { SolitaConfig, SolitaConfigAnchor, SolitaConfigShank } from './types'
import path from 'path'
import { enhanceIdl } from './enhance-idl'
import { generateTypeScriptSDK } from './gen-typescript'
import { logError, logInfo } from '../utils'

export function handleAnchor(config: SolitaConfigAnchor) {
  const { idlDir, binaryInstallDir, programDir } = config
  const spawnArgs = ['build', '--idl', idlDir]
  const spawnOpts: SpawnOptionsWithoutStdio = {
    cwd: programDir,
  }
  const rustbinConfig: RustbinConfig = {
    rootDir: binaryInstallDir,
    binaryName: 'anchor',
    binaryCrateName: 'anchor-cli',
    libName: 'anchor-lang',
    cargoToml: path.join(programDir, 'Cargo.toml'),
    dryRun: false,
  }

  return handle(config, rustbinConfig, spawnArgs, spawnOpts)
}

export function handleShank(config: SolitaConfigShank) {
  const { idlDir, binaryInstallDir, programDir } = config
  const spawnArgs = ['idl', '--out-dir', idlDir, '--crate-root', programDir]
  const spawnOpts: SpawnOptionsWithoutStdio = {
    cwd: programDir,
  }
  const rustbinConfig: RustbinConfig = {
    rootDir: binaryInstallDir,
    binaryName: 'shank',
    binaryCrateName: 'shank-cli',
    libName: 'shank',
    cargoToml: path.join(programDir, 'Cargo.toml'),
    dryRun: false,
  }

  return handle(config, rustbinConfig, spawnArgs, spawnOpts)
}

async function handle(
  config: SolitaConfig,
  rustbinConfig: RustbinConfig,
  spawnArgs: string[],
  spawnOpts: SpawnOptionsWithoutStdio
) {
  const { programName, idlDir, sdkDir } = config

  const { fullPathToBinary, binVersion }: RustbinMatchReturn =
    await rustbinMatch(rustbinConfig, confirmAutoMessageConsole)

  if (binVersion == null) {
    throw new Error(
      `rustbin was unable to determine installed version ${rustbinConfig.binaryName}, it may ` +
        `not have been installed correctly.`
    )
  }

  const idlGenerator = spawn(fullPathToBinary, spawnArgs, spawnOpts)
    .on('error', (err) => {
      logError(err)
      process.exit(1)
    })
    .on('exit', async () => {
      logInfo('IDL written to: %s', path.join(idlDir, `${programName}.json`))
      const idl = await enhanceIdl(config, binVersion)
      await generateTypeScriptSDK(idl, sdkDir)
    })

  idlGenerator.stdout.on('data', (buf) => process.stdout.write(buf))
  idlGenerator.stderr.on('data', (buf) => process.stderr.write(buf))
}
