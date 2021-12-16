import { PathLike, promises as fs } from 'fs'
import path from 'path'
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
    return { instructions }
  }

  async renderAndWriteTo(outputDir: PathLike) {
    const instructionsDir = path.join(outputDir.toString(), 'instructions')
    await prepareTargetDir(instructionsDir)
    logInfo('Writing instructions to directory: %s', instructionsDir)
    const { instructions } = this.renderCode()
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
