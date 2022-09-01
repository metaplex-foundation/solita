import {
  rustbinMatch,
  RustbinConfig,
  RustbinMatchReturn,
  ConfirmInstallArgs,
} from '@metaplex-foundation/rustbin'
import { spawn, SpawnOptionsWithoutStdio } from 'child_process'
import { SolitaConfig, SolitaConfigAnchor, SolitaConfigShank } from './types'
import path from 'path'
import { enhanceIdl } from './enhance-idl'
import { generateTypeScriptSDK } from './gen-typescript'
import { logError, logInfo } from '../utils'
import { Options as PrettierOptions } from 'prettier'

export function handleAnchor(
  config: SolitaConfigAnchor,
  prettierConfig?: PrettierOptions
) {
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
    ...config.rustbin,
  }

  return handle(
    config,
    rustbinConfig,
    spawnArgs,
    spawnOpts,
    prettierConfig,
    config.anchorRemainingAccounts
  )
}

export function handleShank(
  config: SolitaConfigShank,
  prettierConfig?: PrettierOptions
) {
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

  return handle(
    config,
    rustbinConfig,
    spawnArgs,
    spawnOpts,
    prettierConfig,
    false
  )
}

async function handle(
  config: SolitaConfig,
  rustbinConfig: RustbinConfig,
  spawnArgs: string[],
  spawnOpts: SpawnOptionsWithoutStdio,
  prettierConfig?: PrettierOptions,
  anchorRemainingAccounts?: boolean
) {
  const { programName, idlDir, sdkDir } = config

  const { fullPathToBinary, binVersion, libVersion }: RustbinMatchReturn =
    await rustbinMatch(rustbinConfig, confirmAutoMessageLog)

  if (binVersion == null) {
    throw new Error(
      `rustbin was unable to determine installed version ${rustbinConfig.binaryName}, it may ` +
        `not have been installed correctly.`
    )
  }

  return new Promise<void>((resolve, reject) => {
    const idlGenerator = spawn(fullPathToBinary, spawnArgs, spawnOpts)
      .on('error', (err) => {
        logError(`${programName} idl generation failed`)
        reject(err)
      })
      .on('exit', async () => {
        logInfo('IDL written to: %s', path.join(idlDir, `${programName}.json`))
        const idl = await enhanceIdl(config, binVersion, libVersion)
        await generateTypeScriptSDK(
          idl,
          sdkDir,
          prettierConfig,
          config.typeAliases,
          config.serializers,
          anchorRemainingAccounts
        )
        resolve()
      })

    idlGenerator.stdout.on('data', (buf) => process.stdout.write(buf))
    idlGenerator.stderr.on('data', (buf) => process.stderr.write(buf))
  })
}

function confirmAutoMessageLog({
  binaryName,
  libVersion,
  libName,
  binVersion,
  fullPathToBinary,
}: ConfirmInstallArgs) {
  if (binVersion == null) {
    logInfo(`No existing version found for ${binaryName}.`)
  } else {
    logInfo(`Version for ${binaryName}: ${binVersion}`)
  }
  logInfo(
    `Will install version matching "${libName}: '${libVersion}'" to ${fullPathToBinary}`
  )
  return Promise.resolve(true)
}
