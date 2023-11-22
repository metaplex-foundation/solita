import {
  rustbinMatch,
  RustbinConfig,
  RustbinMatchReturn,
  ConfirmInstallArgs,
} from '@metaplex-foundation/rustbin'
import { spawn, SpawnOptionsWithoutStdio } from 'child_process'
import {
  SolitaConfig,
  SolitaConfigAnchor,
  SolitaConfigShank,
  SolitaHandlerResult,
} from './types'
import path from 'path'
import { enhanceIdl } from './enhance-idl'
import { generateTypeScriptSDK } from './gen-typescript'
import { logDebug, logError, logInfo } from '../utils'
import { Options as PrettierOptions } from 'prettier'

import { red } from 'ansi-colors'

const handlerErrorRx = /^Error\:/

export function handleAnchor(
  config: SolitaConfigAnchor,
  prettierConfig?: PrettierOptions
) {
  const { idlDir, binaryInstallDir, programDir } = config
  const binaryArgs = config.binaryArgs?.split(' ') ?? []
  const spawnArgs = ['build', '--idl', idlDir, ...binaryArgs]
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
    ...config.rustbin,
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

  return new Promise<SolitaHandlerResult>((resolve, reject) => {
    const tool = path.basename(fullPathToBinary)
    const idlGenerator = spawn(fullPathToBinary, spawnArgs, spawnOpts)
      .on('error', (err) => {
        logError(`${programName} idl generation failed`)
        reject(err)
      })
      .on('exit', async (exitCode) => {
        exitCode ??= 0

        logDebug(`${tool} completed with code ${exitCode}`)
        if (exitCode == 0) {
          logInfo(
            'IDL written to: %s',
            path.join(idlDir, `${programName}.json`)
          )
          const idl = await enhanceIdl(config, binVersion, libVersion)
          await generateTypeScriptSDK(
            idl,
            sdkDir,
            prettierConfig,
            config.typeAliases,
            config.serializers,
            anchorRemainingAccounts
          )
          resolve({ exitCode })
        } else {
          const errorMsg = red(
            `${tool} returned with non-zero exit code. Please review the output above to diagnose the issue.`
          )
          resolve({ exitCode, errorMsg })
        }
      })

    idlGenerator.stdout.on('data', (buf) => process.stdout.write(buf))
    idlGenerator.stderr.on('data', (buf) => {
      const dataStr = buf.toString()
      if (handlerErrorRx.test(dataStr)) {
        logError(red(dataStr))
      } else {
        process.stderr.write(buf)
      }
    })
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
