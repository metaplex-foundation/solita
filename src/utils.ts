import { PathLike, promises as fs } from 'fs'
import debug from 'debug'
import path from 'path'

export const logError = debug('idl-ts:error')
export const logInfo = debug('idl-ts:info')
export const logDebug = debug('idl-ts:debug')
export const logTrace = debug('idl-ts:trace')

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
