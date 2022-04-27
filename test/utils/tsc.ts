import { writeFile } from 'fs/promises'
import path from 'path'
import packageDirectory from 'pkg-dir'

import { spawn } from 'child_process'

const config = {
  compilerOptions: {
    target: 'ES2018',
    module: 'commonjs',
    baseUrl: './',
    sourceMap: false,
    declaration: true,
    declarationMap: false,
    noEmit: true,
    preserveWatchOutput: true,
    emitDeclarationOnly: false,
    importHelpers: false,
    strict: true,
    noUnusedLocals: true,
    noFallthroughCasesInSwitch: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    incremental: false,
    types: ['node'],
    moduleResolution: 'node',
    noImplicitReturns: true,
    skipLibCheck: true,
    resolveJsonModule: false,
  },
  include: ['generated'],
}

async function resolveBin(bin: string) {
  const root = (await packageDirectory()) as string
  return path.join(root, 'node_modules', '.bin', bin)
}

async function writeTsconfig(parentToGeneratedDir: string) {
  const tsconfigPath = path.join(parentToGeneratedDir, 'tsconfig.json')
  await writeFile(tsconfigPath, JSON.stringify(config, null, 2))
}

export async function verifyTypes(fullPathToGeneratedDir: string) {
  const parent = path.dirname(fullPathToGeneratedDir)
  await writeTsconfig(parent)
  const args = ['-p', 'tsconfig.json']

  const tscExecutable = await resolveBin('tsc')
  // const cmd = `${tscExecutable} ${args.join(' ')}`

  return new Promise<void>((resolve, reject) => {
    let loggedFailure = false
    let failures = Buffer.from('')
    const tsc = spawn(tscExecutable, args, { cwd: parent })
      .on('error', (err) => {
        reject(err)
      })
      .on('exit', () => {
        return loggedFailure
          ? reject(new Error(failures.toString('utf8')))
          : resolve()
      })
    tsc.stdout.on('data', (buf) => {
      loggedFailure = true
      failures = Buffer.concat([failures, buf])
    })
    tsc.stderr.on('data', (buf) => {
      process.stderr.write(buf)
    })
  })
}
