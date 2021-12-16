import { PathLike, promises as fs } from 'fs'
import path from 'path'
import { renderErrors } from './render-errors'
import { renderInstruction } from './render-instruction'
import { Idl } from './types'
import { logDebug, logInfo, prepareTargetDir } from './utils'

export * from './types'

function renderIndex(modules: string[]) {
  return modules.map((x) => `export * from './${x}';`).join('\n')
}

export class SolanaIdlToApi {
  constructor(private readonly idl: Idl) {}

  renderCode() {
    const instructions: Record<string, string> = {}
    for (const ix of this.idl.instructions) {
      instructions[ix.name] = renderInstruction(ix)
    }
    const errors = renderErrors(this.idl.errors)
    return { instructions, errors }
  }

  async renderAndWriteTo(outputDir: PathLike) {
    const { instructions, errors } = this.renderCode()
    await this.writeInstructions(outputDir, instructions)
    await this.writeErrors(outputDir, errors)
  }

  private async writeInstructions(
    outputDir: PathLike,
    instructions: Record<string, string>
  ) {
    const instructionsDir = path.join(outputDir.toString(), 'instructions')
    await prepareTargetDir(instructionsDir)
    logInfo('Writing instructions to directory: %s', instructionsDir)
    for (const [name, code] of Object.entries(instructions)) {
      logDebug('Writing instruction: %s', name)
      await fs.writeFile(path.join(instructionsDir, `${name}.ts`), code, 'utf8')
    }
    logDebug('Writing index.ts exporting all instructions')
    const indexCode = renderIndex(Object.keys(instructions).sort())
    await fs.writeFile(
      path.join(instructionsDir, `index.ts`),
      indexCode,
      'utf8'
    )
  }

  private async writeErrors(outputDir: PathLike, errorsCode: string) {
    const errorsDir = path.join(outputDir.toString(), 'errors')
    await prepareTargetDir(errorsDir)
    logInfo('Writing errors to directory: %s', errorsDir)
    logDebug('Writing index.ts containing all errors')
    await fs.writeFile(path.join(errorsDir, `index.ts`), errorsCode, 'utf8')
  }
}

if (module === require.main) {
  async function main() {
    const outputDir = path.resolve(__dirname, '../../mpl/auction-house/js/src')
    const idl = require('../test/fixtures/auction_house.json')
    const solanaIdlToApi = new SolanaIdlToApi(idl)
    return solanaIdlToApi.renderAndWriteTo(outputDir)
  }

  main()
    .then(() => process.exit(0))
    .catch((err: any) => {
      console.error(err)
      process.exit(1)
    })
}
