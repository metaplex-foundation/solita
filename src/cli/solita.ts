#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import { canAccess, logDebug, logError, logInfo } from '../utils'
import { isSolitaConfigAnchor, isSolitaConfigShank } from './types'
import { handleAnchor, handleShank } from './handlers'

enum Loader {
  JSON,
  JS,
}
function loaderString(loader: Loader) {
  switch (loader) {
    case Loader.JSON:
      return 'JSON'
    case Loader.JS:
      return 'JavaScript'
  }
}
type Loadable = [string, Loader]

const SOLITA_CONFIG_RCS: Loadable[] = [['.solitarc.js', Loader.JS]]
const PRETTIER_CONFIG_RCS: Loadable[] = [
  ['.prettierrc', Loader.JSON],
  ['.prettierrc.js', Loader.JS],
  ['.prettierrc.json', Loader.JSON],
]

async function main() {
  const solitaConfig = (await tryLoadLocalConfigRc(SOLITA_CONFIG_RCS, true))
    ?.config

  if (solitaConfig == null) {
    throw new Error(
      `Unable to find solita config '.solitarc.js' in the current directory (${process.cwd()} `
    )
  }
  const prettierRes = await tryLoadLocalConfigRc(PRETTIER_CONFIG_RCS)
  const prettierConfig = prettierRes?.config
  if (prettierConfig != null) {
    logInfo(
      `Found '${prettierRes.rcFile}' in current directory and using that to format code`
    )
  }
  if (isSolitaConfigAnchor(solitaConfig)) {
    await handleAnchor(solitaConfig, prettierConfig)
  }
  if (isSolitaConfigShank(solitaConfig)) {
    await handleShank(solitaConfig, prettierConfig)
  }
  logInfo('Success!')
}

main()
  .then(() => process.exit(0))
  .catch((err: any) => {
    logError(err)
    process.exit(1)
  })

async function tryLoadLocalConfigRc(
  rcFiles: Loadable[],
  required: boolean = false
): Promise<any> {
  for (const [rcFile, loader] of rcFiles) {
    const configPath = path.join(process.cwd(), rcFile)
    if (await canAccess(configPath)) {
      try {
        const config = load(configPath, loader)
        logDebug('Found `%s` in current directory', rcFile)
        return { config, rcFile }
      } catch (err) {
        logError(
          `Failed to load '${rcFile}', ` +
            `it should be a ${loaderString(loader)} file.`
        )
        logError(err)
      }
    }
  }
  if (required) {
    throw new Error(
      `Cannot find any of '${rcFiles.join(',')}' ` +
        `config in current directory. Please create one.`
    )
  }
}

function load(configPath: string, loader: Loader): any {
  switch (loader) {
    case Loader.JSON:
      return JSON.parse(fs.readFileSync(configPath, 'utf8'))
    case Loader.JS:
      return require(configPath)
  }
}
