import fs from 'fs/promises'
import os from 'os'
import crypto from 'crypto'
import path from 'path'
import { build, BuildResult, Metafile } from 'esbuild'
import { Test } from 'tape'
import spok from 'spok'

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

export async function verifyImports(
  t: Test,
  analyzeCode: AnalyzedCode,
  imports: string[],
  opts: { expectNoErrors: boolean; expectNoWarnings: boolean } = {
    expectNoErrors: true,
    expectNoWarnings: true,
  }
) {
  if (opts.expectNoErrors) {
    t.equal(analyzeCode.errors.length, 0, 'no errors')
  }
  if (opts.expectNoWarnings) {
    t.equal(analyzeCode.warnings.length, 0, 'no warnings')
  }

  const actual = analyzeCode.imports.map((x) => x.path)
  actual.sort()
  imports.sort()
  spok(t, { ...actual, $topic: 'imports' }, imports)
}
