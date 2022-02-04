import { PathLike, promises as fs } from 'fs'
import debug from 'debug'
import path from 'path'
import { sha256 } from 'js-sha256'
import camelcase from 'camelcase'
import { snakeCase } from 'snake-case'
import { IdlTypeArray } from './types'
import { TypeMapper } from './type-mapper'

export const logError = debug('solita:error')
export const logInfo = debug('solita:info')
export const logDebug = debug('solita:debug')
export const logTrace = debug('solita:trace')

/**
 * Ensures that the given directory exists by creating it recursively when necessary.
 * It also removes all existing files from the directory (non-recursively).
 *
 * @throws Error if the path already exists and is not a directory
 * @category utils
 * @private
 */
export async function prepareTargetDir(dir: PathLike) {
  await ensureDir(dir)
  await cleanDir(dir)
}

async function ensureDir(dir: PathLike) {
  if (!(await canAccess(dir))) {
    await fs.mkdir(dir, { recursive: true })
    return
  }
  // dir already exists, make sure it isn't a file
  const stat = await fs.stat(dir)
  if (!stat.isDirectory()) {
    throw new Error(`'${dir}' is not a directory`)
  }
}

async function cleanDir(dir: PathLike) {
  const files = await fs.readdir(dir)
  const unlinks = files.map((filename) =>
    fs.unlink(path.join(dir.toString(), filename))
  )
  return Promise.all(unlinks)
}

async function canAccess(p: PathLike) {
  try {
    await fs.access(p)
    return true
  } catch (_) {
    return false
  }
}

export class UnreachableCaseError extends Error {
  constructor(value: never) {
    super(`Unreachable case: ${value}`)
  }
}

// -----------------
// Discriminators
// -----------------

/**
 * Number of bytes of the account discriminator.
 */
export const ACCOUNT_DISCRIMINATOR_SIZE = 8

/**
 * Calculates and returns a unique 8 byte discriminator prepended to all
 * accounts.
 *
 * @param name The name of the account to calculate the discriminator.
 */
export function accountDiscriminator(name: string): Buffer {
  return Buffer.from(
    sha256.digest(`account:${camelcase(name, { pascalCase: true })}`)
  ).slice(0, ACCOUNT_DISCRIMINATOR_SIZE)
}

/**
 * Namespace for global instruction function signatures (i.e. functions
 * that aren't namespaced by the state or any of its trait implementations).
 */
export const SIGHASH_GLOBAL_NAMESPACE = 'global'

/**
 * Calculates and returns a unique 8 byte discriminator prepended to all instruction data.
 *
 * @param name The name of the instruction to calculate the discriminator.
 */
export function instructionDiscriminator(name: string): Buffer {
  return sighash(SIGHASH_GLOBAL_NAMESPACE, name)
}

function sighash(nameSpace: string, ixName: string): Buffer {
  let name = snakeCase(ixName)
  let preimage = `${nameSpace}:${name}`
  return Buffer.from(sha256.digest(preimage)).slice(0, 8)
}

export function anchorDiscriminatorField(name: string) {
  const ty: IdlTypeArray = { array: ['u8', 8] }
  return { name, type: ty }
}

export function anchorDiscriminatorType(
  typeMapper: TypeMapper,
  context: string
) {
  const ty: IdlTypeArray = { array: ['u8', 8] }
  return typeMapper.map(ty, context)
}
