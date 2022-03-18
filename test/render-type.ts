import test, { Test } from 'tape'
import { renderType } from '../src/render-type'
import { SerdePackage } from '../src/serdes'
import { BEET_PACKAGE, IdlDefinedTypeDefinition } from '../src/types'
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
    new Map([['Creator', '/module/of/creator.ts']])
  )
  verifySyntacticCorrectness(t, ts.code)

  const analyzed = await analyzeCode(ts.code)
  if (opts.logCode) {
    console.log(
      `--------- <TypeScript> --------\n${ts}\n--------- </TypeScript> --------`
    )
  }
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
