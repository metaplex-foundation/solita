import { promises as fs } from 'fs'
import os from 'os'
import crypto from 'crypto'
import path from 'path'
import { build, BuildResult } from 'esbuild'
import { Test } from 'tape'
import spok from 'spok'
import { inspect } from 'util'
import { ESLint } from 'eslint'
import {
  extractSerdePackageFromImportStatment,
  SerdePackage,
} from '../../src/serdes'
import recursiveReaddir from 'recursive-readdir'

const eslint = new ESLint({
  overrideConfig: {
    plugins: ['@typescript-eslint'],
    parser: '@typescript-eslint/parser',
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    globals: { Buffer: true },
  },
})

const tmpdir = os.tmpdir()

function createHash(s: Buffer) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

type AnalyzedCode = {
  js: string
  ts: string
  errors: BuildResult['errors']
  warnings: BuildResult['warnings']
}

export function deepLog(obj: any) {
  console.log(inspect(obj, { depth: 15, colors: true }))
}

export async function analyzeCode(ts: string) {
  const hash = createHash(Buffer.from(ts))
  const filename = `${hash}.ts`
  const filePath = path.join(tmpdir, filename)
  await fs.writeFile(filePath, ts, 'utf8')

  const outfilePath = `${filePath}.js`
  const buildResult: BuildResult = await build({
    absWorkingDir: tmpdir,
    entryPoints: [filePath],
    outfile: outfilePath,
  })
  const js = await fs.readFile(outfilePath, 'utf8')
  return {
    js,
    ts,
    errors: buildResult.errors,
    warnings: buildResult.warnings,
  }
}

export const DEFAULT_VERIFY_IMPORTS_OPTS = {
  expectNoErrors: true,
  expectNoWarnings: true,
  logImports: false,
}

function importsFromCode(code: string): SerdePackage[] {
  return <SerdePackage[]>code
    .split('\n')
    .filter((x) => /^import .+ from/.test(x))
    .map(extractSerdePackageFromImportStatment)
    .filter((x) => x != null)
}

export function verifyImports(
  t: Test,
  analyzeCode: AnalyzedCode,
  imports: SerdePackage[],
  opts: Partial<{
    expectNoErrors: boolean
    expectNoWarnings: boolean
    logImports: boolean
  }> = DEFAULT_VERIFY_IMPORTS_OPTS
) {
  opts = { ...DEFAULT_VERIFY_IMPORTS_OPTS, ...opts }
  if (opts.expectNoErrors) {
    t.equal(analyzeCode.errors.length, 0, 'no errors')
  }
  if (opts.expectNoWarnings) {
    t.equal(analyzeCode.warnings.length, 0, 'no warnings')
  }

  const actual = importsFromCode(analyzeCode.ts)

  actual.sort()
  imports.sort()

  if (opts.logImports) {
    console.log({ imports: actual })
  }
  t.equal(actual.length, imports.length, 'imports count')
  spok(t, { ...actual, $topic: 'imports' }, imports)
}

export async function verifySyntacticCorrectness(t: Test, ts: string) {
  try {
    const results: ESLint.LintResult[] = await eslint.lintText(ts)
    for (const res of results) {
      if (res.errorCount > 0) {
        deepLog(
          res.messages.map(
            (x) => `${x.message} at ${x.line}:${x.column} (${x.nodeType})`
          )
        )
        t.fail(`Found ${res.errorCount} errors via esbuild`)
      }
    }
  } catch (err) {
    t.error(err)
  }
}

export async function verifySyntacticCorrectnessForGeneratedDir(
  t: Test,
  fullDirPath: string
) {
  const files = await recursiveReaddir(fullDirPath)
  for (const file of files) {
    t.comment(`+++ Syntactically checking ${path.relative(fullDirPath, file)}`)
    const ts = await fs.readFile(file, 'utf8')
    await verifySyntacticCorrectness(t, ts)
  }
}
