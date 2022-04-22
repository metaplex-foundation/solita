import { PathLike } from 'fs'
import path from 'path'

export class Paths {
  constructor(readonly outputDir: PathLike) {}

  get root() {
    return this.outputDir.toString()
  }

  get accountsDir() {
    return path.join(this.outputDir.toString(), 'accounts')
  }

  get relAccountsDir() {
    return path.relative(process.cwd(), this.accountsDir)
  }

  get instructionsDir() {
    return path.join(this.outputDir.toString(), 'instructions')
  }
  get relInstructionsDir() {
    return path.relative(process.cwd(), this.instructionsDir)
  }

  get typesDir() {
    return path.join(this.outputDir.toString(), 'types')
  }

  get relTypesDir() {
    return path.relative(process.cwd(), this.typesDir)
  }

  get errorsDir() {
    return path.join(this.outputDir.toString(), 'errors')
  }

  get relErrorsDir() {
    return path.relative(process.cwd(), this.errorsDir)
  }

  accountFile(name: string) {
    return path.join(this.accountsDir, `${name}.ts`)
  }

  instructionFile(name: string) {
    return path.join(this.instructionsDir, `${name}.ts`)
  }

  typeFile(name: string) {
    return path.join(this.typesDir, `${name}.ts`)
  }

  errorFile(name: string) {
    return path.join(this.errorsDir, `${name}.ts`)
  }
}
