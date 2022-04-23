#!/usr/bin/env node

import path from 'path'
import { canAccess, logDebug, logError, logInfo } from '../utils'
import { isSolitaConfigAnchor, isSolitaConfigShank } from './types'
import { handleAnchor, handleShank } from './handlers'

const SOLITA_CONFIG_RC = '.solitarc.js'
const PRETTIER_CONFIG_RC = '.prettierrc.js'

async function main() {
  const solitaConfig = await tryLoadLocalConfigRc(SOLITA_CONFIG_RC, true)
  const prettierConfig = await tryLoadLocalConfigRc(PRETTIER_CONFIG_RC)
  if (prettierConfig != null) {
    logInfo(
      'Found `.prettierrc.js` in current directory and using that to format code'
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
  rcFile: string,
  required: boolean = false
): Promise<any> {
  const configPath = path.join(process.cwd(), rcFile)
  if (await canAccess(configPath)) {
    const config = require(configPath)
    logDebug('Found `%s` in current directory', rcFile)
    return config
  } else if (required) {
    throw new Error(
      `Cannot find '${rcFile}' config in current directory. Please create one.`
    )
  }
}
