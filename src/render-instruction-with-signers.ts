import { ProcessedAccountKey, SOLANA_WEB3_EXPORT_NAME } from './types'

const TSIGNER = 'TSigner'

class InstructionWithSignersRenderer {
  constructor(
    private readonly accounts: ProcessedAccountKey[],
    private readonly instructionArgsType: string,
    private readonly instructionName: string
  ) {}

  renderAccounts() {
    // TODO (thlorenz): what about doc comments?
    const renderedAccounts = this.accounts.map((x) => {
      const ty = x.isSigner ? TSIGNER : `${SOLANA_WEB3_EXPORT_NAME}.PublicKey`
      return `${x.name}: ${ty}`
    })
    return `
  accounts: {
    ${renderedAccounts.join('\n    ')}
  }
`
  }

  render() {
    const accounts = this.renderAccounts()
    return `
export type CreateCreateMetadataAccountV2InstructionWithSignersParams<${TSIGNER}> = {
  programId?: web3.PublicKey

  ${accounts}

  args: ${this.instructionArgsType} 

  // Instruction Key.
  // Defaults to the name of the instruction in camelCase.
  instructionKey?: string
}
`
  }
}

function main() {
  const accounts: ProcessedAccountKey[] = [
    {
      name: 'nonSigner',
      isMut: false,
      isSigner: false,
      optional: false,
    },
    {
      name: 'signer',
      isMut: false,
      isSigner: true,
      optional: false,
    },
  ]
  const renderer = new InstructionWithSignersRenderer(
    accounts,
    'TestInstructionArgs',
    'testInstruction'
  )
  const code = renderer.render()
  console.log(code)
}

main()
