import fs from 'fs/promises'
import os from 'os'
import crypto from 'crypto'
import path from 'path'
import { build, BuildResult, Metafile } from 'esbuild'
import { Test } from 'tape'
import spok from 'spok'
import { inspect } from 'util'
import { ESLint } from 'eslint'

const eslint = new ESLint({
  overrideConfig: {
    plugins: ['@typescript-eslint'],
    parser: '@typescript-eslint/parser',
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
    ],
  },
})

const tmpdir = os.tmpdir()

function createHash(s: Buffer) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

type AnalyzedCode = {
  js: string
  errors: BuildResult['errors']
  warnings: BuildResult['warnings']
  imports: Metafile['inputs'][0]['imports']
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
  const buildResult: BuildResult & { metafile: Metafile } = await build({
    absWorkingDir: tmpdir,
    entryPoints: [filePath],
    outfile: outfilePath,
    metafile: true,
  })
  const js = await fs.readFile(outfilePath, 'utf8')
  const meta = buildResult.metafile
  return {
    js,
    errors: buildResult.errors,
    imports: meta.inputs[filename].imports,
    warnings: buildResult.warnings,
  }
}

export const DEFAULT_VERIFY_IMPORTS_OPTS = {
  expectNoErrors: true,
  expectNoWarnings: true,
  logImports: false,
}

function importsFromCode(code: string) {
  return code
    .split('\n')
    .filter((x) => /^import .+ from/.test(x))
    .map((x) => x.replace(/;$/, ''))
}

export function verifyImports(
  t: Test,
  analyzeCode: AnalyzedCode,
  imports: string[],
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

  const fromCode = importsFromCode(analyzeCode.js)
  const actual = Array.from(
    new Set([...analyzeCode.imports.map((x) => x.path), ...fromCode])
  )

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
