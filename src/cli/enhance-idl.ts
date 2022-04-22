import path from 'path'
import { UnreachableCaseError } from '../utils'
import {
  isSolitaConfigAnchor,
  isSolitaConfigShank,
  SolitaConfig,
} from './types'

import { promises as fs } from 'fs'

export async function enhanceIdl(config: SolitaConfig, binaryVersion: string) {
  const { idlDir, programName } = config
  const idlPath = path.join(idlDir, `${programName}.json`)

  const idl = require(idlPath)

  if (isSolitaConfigAnchor(config)) {
    idl.metadata = {
      ...idl.metadata,
      address: config.programId,
      origin: config.idlGenerator,
      version: binaryVersion,
    }
  } else if (isSolitaConfigShank(config)) {
    idl.metadata = {
      ...idl.metadata,
      version: binaryVersion,
    }
  } else {
    throw new UnreachableCaseError(
      // @ts-ignore this possible is when types were violated via JS
      `Unknown IDL generator ${config.idlGenerator}`
    )
  }
  await fs.writeFile(idlPath, JSON.stringify(idl, null, 2))
  return idl
}
