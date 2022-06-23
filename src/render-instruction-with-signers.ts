import { ProcessedAccountKey, SOLANA_WEB3_EXPORT_NAME } from './types'

const TSIGNER = 'TSigner'
const HAS_PUBLIC_KEY_TYPE = 'HasPublicKey'
const DEFAULT_SIGNER_TYPE = 'DefaultSigner'
const EXTENDING_TSIGNER = `${TSIGNER} extends ${HAS_PUBLIC_KEY_TYPE}`
const DEFAULTING_TSIGNER = `${EXTENDING_TSIGNER} = ${DEFAULT_SIGNER_TYPE}`
const POSTFIX = 'WithSigners'
const IX_WITH_SIGNERS_TYPE = 'InstructionWithSigners'

export class InstructionWithSignersRenderer {
  private readonly paramsType: string
  // TODO (thlorenz): consider case where instruction args are empty
  constructor(
    private readonly accounts: ProcessedAccountKey[],
    private readonly instructionArgsType: string,
    private readonly upperCamelIxName: string,
    private readonly camelIxName: string,
    private readonly createInstructionMethod: string
  ) {
    this.paramsType = `${this.upperCamelIxName}${POSTFIX}Params<${TSIGNER}>`
  }

  // --------------
  // Types
  // --------------
  // These are rendered for each instruction and not exported to avoid name conflicts.
  private renderUtilityTypes() {
    // TODO (thlorenz): doc comments
    return `
type ${HAS_PUBLIC_KEY_TYPE} = {
  publicKey: ${SOLANA_WEB3_EXPORT_NAME}.PublicKey
}
type ${DEFAULT_SIGNER_TYPE} = ${HAS_PUBLIC_KEY_TYPE} & (
  | {
      secretKey: Uint8Array;
  }
  | {
      signMessage(message: Uint8Array): Promise<Uint8Array>;
      signTransaction(transaction: ${SOLANA_WEB3_EXPORT_NAME}.Transaction): Promise<${SOLANA_WEB3_EXPORT_NAME}.Transaction>;
      signAllTransactions(transactions: ${SOLANA_WEB3_EXPORT_NAME}.Transaction[]): Promise<${SOLANA_WEB3_EXPORT_NAME}.Transaction[]>;
    })

type ${IX_WITH_SIGNERS_TYPE}<${EXTENDING_TSIGNER}> = {
  instruction: ${SOLANA_WEB3_EXPORT_NAME}.TransactionInstruction
  signers: ${TSIGNER}[];
  key?: string;
}`
  }

  private renderAccountsType() {
    // TODO (thlorenz): doc comments
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

  private renderParamsType() {
    const accounts = this.renderAccountsType()
    // TODO (thlorenz): doc comments
    return `
export type ${this.upperCamelIxName}${POSTFIX}Params<${EXTENDING_TSIGNER}> = {
  programId ?: web3.PublicKey
  ${accounts}
  args: ${this.instructionArgsType}
  instructionKey?: string
}
`
  }

  // --------------
  // IX With Signers
  // --------------
  private renderAccountsParams() {
    const renderedAccounts = this.accounts.map((x) => {
      const value = x.isSigner
        ? `params.accounts.${x.name}.publicKey`
        : `params.accounts.${x.name}`
      return `${x.name}: ${value}`
    })
    return `${renderedAccounts.join('\n        ')}`
  }

  private renderSignerParams() {
    return this.accounts
      .filter((x) => x.isSigner)
      .map((x) => `params.accounts.${x.name}`)
      .join(', ')
  }

  private renderMethod() {
    const ixMethodWithSigners = `${this.createInstructionMethod}${POSTFIX}`
    return `
export function ${ixMethodWithSigners}<${DEFAULTING_TSIGNER}> (
  params: ${this.paramsType}
): ${IX_WITH_SIGNERS_TYPE}<${TSIGNER}> {
  return {
    instruction: ${this.createInstructionMethod}(
      {
        ${this.renderAccountsParams()}
      },
      params.args,
      params.programId
    ),
    signers: [${this.renderSignerParams()}],
    key: params.instructionKey ?? '${this.camelIxName}',
  };
}
`
  }

  render() {
    return `
${this.renderUtilityTypes()}
${this.renderParamsType()}
${this.renderMethod()}
`
  }
}

// @ts-ignore
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
    'TestInstruction',
    'testInstruction',
    'creatTestInstruction'
  )
  const code = renderer.render()
  console.log(code)
}

// main()
