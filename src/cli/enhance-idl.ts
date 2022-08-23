import path from 'path'
import { UnreachableCaseError } from '../utils'
import {
  isSolitaConfigAnchor,
  isSolitaConfigShank,
  SolitaConfig,
} from './types'
import { strict as assert } from 'assert'

import { promises as fs } from 'fs'

export async function enhanceIdl(
  config: SolitaConfig,
  binaryVersion: string,
  libVersion: string
) {
  const { idlDir, programName } = config
  const idlPath = path.join(idlDir, `${programName}.json`)

  const idl = require(idlPath)

  if (isSolitaConfigAnchor(config)) {
    idl.metadata = {
      ...idl.metadata,
      address: config.programId,
      origin: config.idlGenerator,
      binaryVersion,
      libVersion,
    }
  } else if (isSolitaConfigShank(config)) {
    idl.metadata = {
      ...idl.metadata,
      binaryVersion,
      libVersion,
    }
  } else {
    throw new UnreachableCaseError(
      // @ts-ignore this possible is when types were violated via JS
      `Unknown IDL generator ${config.idlGenerator}`
    )
  }

  // Apply Idl hook if provided
  let finalIdl = idl
  if (config.idlHook != null) {
    assert.equal(
      typeof config.idlHook,
      'function',
      `idlHook needs to be a function of the type: (idl: Idl) => idl, but is of type ${typeof config.idlHook}`
    )
    finalIdl = config.idlHook(idl)
  }

  await fs.writeFile(idlPath, JSON.stringify(finalIdl, null, 2))
  return finalIdl
}
