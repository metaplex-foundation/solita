import test, { Test } from 'tape'
import { renderType } from '../src/render-type'
import { SerdePackage } from '../src/serdes'
import { FORCE_FIXABLE_NEVER } from '../src/type-mapper'
import {
  BEET_PACKAGE,
  BEET_SOLANA_PACKAGE,
  IdlDefinedTypeDefinition,
  SOLANA_WEB3_PACKAGE,
} from '../src/types'
import {
  analyzeCode,
  verifyImports,
  verifySyntacticCorrectness,
} from './utils/verify-code'

const DIAGNOSTIC_ON = false
const TYPE_FILE_DIR = '/root/app/instructions/'

async function checkRenderedType(
  t: Test,
  ty: IdlDefinedTypeDefinition,
  imports: SerdePackage[],
  opts: {
    logImports: boolean
    logCode: boolean
  } = { logImports: DIAGNOSTIC_ON, logCode: DIAGNOSTIC_ON }
) {
  const ts = renderType(
    ty,
    TYPE_FILE_DIR,
    new Map(),
    new Map([['Creator', '/module/of/creator.ts']]),
    new Map(),
    FORCE_FIXABLE_NEVER
  )
  if (opts.logCode) {
    console.log(
      `--------- <TypeScript> --------\n${ts.code}\n--------- </TypeScript> --------`
    )
  }
  verifySyntacticCorrectness(t, ts.code)

  const analyzed = await analyzeCode(ts.code)
  verifyImports(t, analyzed, imports, { logImports: opts.logImports })
}

test('types: with one field not using lib types', async (t) => {
  const ty = <IdlDefinedTypeDefinition>{
    name: 'CandyMachineData',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'uuid',
          type: 'string',
        },
      ],
    },
  }

  await checkRenderedType(t, ty, [BEET_PACKAGE])
  t.end()
})

test('types: with three, two lib types', async (t) => {
  const ty = <IdlDefinedTypeDefinition>{
    name: 'CandyMachineData',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'uuid',
          type: 'string',
        },
        {
          name: 'itemsAvailable',
          type: 'u64',
        },
        {
          name: 'goLiveDate',
          type: {
            option: 'i64',
          },
        },
      ],
    },
  }

  await checkRenderedType(t, ty, [BEET_PACKAGE])
  t.end()
})

test('types: with four fields, one referring to other defined type', async (t) => {
  const ty = <IdlDefinedTypeDefinition>{
    name: 'ConfigData',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'uuid',
          type: 'string',
        },
        {
          name: 'creators',
          type: {
            vec: {
              defined: 'Creator',
            },
          },
        },
        {
          name: 'maxSupply',
          type: 'u64',
        },
        {
          name: 'isMutable',
          type: 'bool',
        },
      ],
    },
  }

  await checkRenderedType(t, ty, [BEET_PACKAGE])
  t.end()
})

test('types: enum with inline data', async (t) => {
  const ty = <IdlDefinedTypeDefinition>{
    name: 'CollectionInfo',
    type: {
      kind: 'enum',
      variants: [
        {
          name: 'V1',
          fields: [
            {
              name: 'symbol',
              type: 'string',
            },
            {
              name: 'verified_creators',
              type: {
                vec: 'publicKey',
              },
            },
            {
              name: 'whitelist_root',
              type: {
                array: ['u8', 32],
              },
            },
          ],
        },
        {
          name: 'V2',
          fields: [
            {
              name: 'collection_mint',
              type: 'publicKey',
            },
          ],
        },
      ],
    },
  }

  await checkRenderedType(
    t,
    ty,
    [BEET_PACKAGE, BEET_SOLANA_PACKAGE, SOLANA_WEB3_PACKAGE],
    {
      logCode: false,
      logImports: false,
    }
  )
})

test('types: data enum with unnamed fields variant', async (t) => {
  const ty = <IdlDefinedTypeDefinition>{
    name: 'CleanUpActions',
    type: {
      kind: 'enum',
      variants: [
        {
          name: 'Change',
          fields: ['u32', 'u32'],
        },
      ],
    },
  }

  await checkRenderedType(t, ty, [BEET_PACKAGE], {
    logCode: false,
    logImports: false,
  })
})

test('types: data enum with unnamed and named fields variants', async (t) => {
  const ty = <IdlDefinedTypeDefinition>{
    name: 'CleanUpActions',
    type: {
      kind: 'enum',
      variants: [
        {
          name: 'Unnamed',
          fields: ['u32', 'u32'],
        },
        {
          name: 'Named',
          fields: [
            {
              name: 'collection_mint',
              type: 'publicKey',
            },
          ],
        },
      ],
    },
  }

  await checkRenderedType(
    t,
    ty,
    [BEET_PACKAGE, BEET_SOLANA_PACKAGE, SOLANA_WEB3_PACKAGE],
    {
      logCode: false,
      logImports: false,
    }
  )
})
