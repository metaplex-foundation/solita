#!/usr/bin/env node

import path from 'path'
import { canAccess, logDebug, logError } from '../utils'
import { isSolitaConfigAnchor, isSolitaConfigShank } from './types'
import { handleAnchor, handleShank } from './handlers'

async function main() {
  const solitaConfig = await tryLoadLocalConfigRc()
  if (isSolitaConfigAnchor(solitaConfig)) {
    await handleAnchor(solitaConfig)
  }
  if (isSolitaConfigShank(solitaConfig)) {
    await handleShank(solitaConfig)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: any) => {
    logError(err)
    process.exit(1)
  })

async function tryLoadLocalConfigRc() {
  const configPath = path.join(process.cwd(), '.solitarc.js')
  if (await canAccess(configPath)) {
    const config = require(configPath)
    logDebug(
      'Found `.solitarc.js` in current directory and using that as config'
    )
    return config
  } else {
    throw new Error(
      'Cannot find `.solitarc.js` config in current directory. Please create one.'
    )
  }
}
