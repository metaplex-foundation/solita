import test from 'tape'
import spok from 'spok'
import { TypeMapper } from '../src/type-mapper'
import {
  BEET_PACKAGE,
  BEET_SOLANA_PACKAGE,
  IdlField,
  IdlType,
  IdlTypeEnum,
  SOLANA_WEB3_PACKAGE,
} from '../src/types'
import { SerdePackage } from '../src/serdes'
import { deepInspect } from './utils/helpers'

const SOME_FILE_DIR = '/root/app/'

// -----------------
// Primitive Types
// -----------------
test('type-mapper: primitive types - numbers', (t) => {
  const tm = new TypeMapper()

  const types = <IdlType[]>['i8', 'u32', 'i16']
  for (const n of types) {
    const ty = tm.map(n)
    t.equal(ty, 'number', `'${n}' maps to '${ty}' TypeScript type`)
  }
  t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
  t.equal(tm.localImportsByPath.size, 0, 'used no local imports')

  tm.clearUsages()
  for (const n of types) {
    const serde = tm.mapSerde(n)
    t.equal(serde, `beet.${n}`, `'${n}' maps to '${serde}' serde`)
  }
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
  t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
  t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
  t.end()
})

test('type-mapper: primitive types - bignums', (t) => {
  const tm = new TypeMapper()
  const types = <IdlType[]>['i64', 'u128', 'i256', 'u512']

  for (const n of types) {
    const ty = tm.map(n)
    t.equal(ty, 'beet.bignum', `'${n}' maps to '${ty}' TypeScript type`)
  }
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
  t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
  t.equal(tm.localImportsByPath.size, 0, 'used no local imports')

  tm.clearUsages()
  for (const n of types) {
    const serde = tm.mapSerde(n)
    t.equal(serde, `beet.${n}`, `'${n}' maps to '${serde}' serde`)
  }
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
  t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
  t.end()
})

test('type-mapper: primitive types - string', (t) => {
  const tm = new TypeMapper()

  const ty = tm.map('string')
  t.equal(ty, 'string', 'string type')
  t.equal(tm.serdePackagesUsed.size, 0, 'no serdePackagesUsed')
  t.equal(tm.localImportsByPath.size, 0, 'used no local imports')

  tm.clearUsages()
  const serde = tm.mapSerde('string')
  t.equal(serde, 'beet.utf8String', 'string serde')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
  t.ok(tm.usedFixableSerde, 'used fixable serde')

  t.end()
})

// -----------------
// Enums Scalar
// -----------------
test('type-mapper: enums scalar', (t) => {
  const tm = new TypeMapper()

  const enumType = <IdlTypeEnum>{
    kind: 'enum',
    variants: [
      {
        name: 'Wallet',
      },
      {
        name: 'Token',
      },
      {
        name: 'NFT',
      },
    ],
  }
  {
    t.comment('+++ not providing name when mapping type and serde')
    tm.clearUsages()
    try {
      tm.map(enumType)
      t.fail('should fail due to missing name')
    } catch (err: any) {
      t.match(err.message, /provide name for enum types/i)
    }
    try {
      tm.mapSerde(enumType)
      t.fail('should fail due to missing name')
    } catch (err: any) {
      t.match(err.message, /provide name for enum types/i)
    }
  }

  {
    t.comment('+++ providing name when mapping type and serde')
    tm.clearUsages()
    const ty = tm.map(enumType, 'MembershipModel')

    t.equal(ty, 'MembershipModel', 'name as type')
    t.equal(tm.serdePackagesUsed.size, 0, 'no serdePackagesUsed')
    spok(t, Array.from(tm.scalarEnumsUsed), {
      $topic: 'scalarEnumsUsed',
      ...[['MembershipModel', ['Wallet', 'Token', 'NFT']]],
    })
    t.equal(tm.localImportsByPath.size, 0, 'used no local imports')

    tm.clearUsages()
    const serde = tm.mapSerde(enumType, 'MembershipModel')
    t.equal(serde, 'beet.fixedScalarEnum(MembershipModel)', 'serde')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
    spok(t, Array.from(tm.scalarEnumsUsed), {
      $topic: 'scalarEnumsUsed',
      ...[['MembershipModel', ['Wallet', 'Token', 'NFT']]],
    })
    t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
  }
  t.end()
})

// -----------------
// Composites Option
// -----------------
test('type-mapper: composite types - option<number | bignum>', (t) => {
  const tm = new TypeMapper()

  {
    const type = <IdlType>{
      option: 'u16',
    }
    const ty = tm.map(type)

    t.equal(ty, 'beet.COption<number>', 'option<u16>')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })

    tm.clearUsages()
    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.coption(beet.u16)', 'option<u16> serde')

    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
    t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
    t.ok(tm.usedFixableSerde, 'used fixable serde')
  }

  {
    tm.clearUsages()
    const type = <IdlType>{
      option: 'u64',
    }

    const ty = tm.map(type)
    t.equal(ty, 'beet.COption<beet.bignum>', 'option<u64>')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })

    tm.clearUsages()
    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.coption(beet.u64)', 'option<u64> serde')

    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
    t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
    t.ok(tm.usedFixableSerde, 'used fixable serde')
  }

  t.end()
})

// -----------------
// Composites Vec
// -----------------
test('type-mapper: composite types - vec<number | bignum>', (t) => {
  {
    const tm = new TypeMapper()
    const type = <IdlType>{
      vec: 'u16',
    }
    const ty = tm.map(type)

    t.equal(ty, 'number[]', 'vec<u16>')
    t.equal(tm.serdePackagesUsed.size, 0, 'no serdePackagesUsed')

    tm.clearUsages()
    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.array(beet.u16)', 'vec<u16> serde')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
    t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
    t.ok(tm.usedFixableSerde, 'used fixable serde')
  }

  {
    const tm = new TypeMapper()
    const type = <IdlType>{
      vec: 'u64',
    }
    const ty = tm.map(type)

    t.equal(ty, 'beet.bignum[]', 'vec<u64>')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })

    tm.clearUsages()
    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.array(beet.u64)', 'vec<u64> serde')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
    t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
    t.ok(tm.usedFixableSerde, 'used fixable serde')
  }
  t.end()
})

// -----------------
// Composites Sized Array
// -----------------
test('type-mapper: composite types - array<number>', (t) => {
  {
    const tm = new TypeMapper()
    const type = <IdlType>{
      array: ['u16', 4],
    }
    const ty = tm.map(type)

    t.equal(ty, 'number[] /* size: 4 */', 'array<u16>(4)')
    t.equal(tm.serdePackagesUsed.size, 0, 'no serdePackagesUsed')

    tm.clearUsages()
    const serde = tm.mapSerde(type)
    t.equal(
      serde,
      'beet.uniformFixedSizeArray(beet.u16, 4)',
      'array<u16>(4) serde'
    )
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
    t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
  }
  t.end()
})

// -----------------
// Composites User Defined
// -----------------
test('type-mapper: composite types - user defined', (t) => {
  const tm = new TypeMapper(
    new Map(),
    new Map([['ConfigData', '/module/of/config-data.ts']])
  )
  const type = <IdlType>{
    defined: 'ConfigData',
  }
  const ty = tm.map(type)

  t.equal(ty, 'ConfigData')
  t.equal(tm.serdePackagesUsed.size, 0, 'no serde packages used')
  spok(t, Array.from(tm.localImportsByPath), {
    $topic: 'local imports',
    ...[['/module/of/config-data.ts', new Set(['ConfigData'])]],
  })
  tm.clearUsages()

  const serde = tm.mapSerde(type)
  t.equal(serde, 'configDataBeet')
  t.equal(tm.serdePackagesUsed.size, 0, 'no serde packages used')
  spok(t, Array.from(tm.localImportsByPath), {
    $topic: 'local imports',
    ...[['/module/of/config-data.ts', new Set(['configDataBeet'])]],
  })
  t.notOk(tm.usedFixableSerde, 'did not use fixable serde')

  t.end()
})

// -----------------
// Extensions
// -----------------
test('type-mapper: type extensions - publicKey', (t) => {
  const tm = new TypeMapper()

  const ty = tm.map('publicKey')
  t.equal(ty, 'web3.PublicKey', 'publicKey')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[SOLANA_WEB3_PACKAGE],
  })

  tm.clearUsages()
  const serde = tm.mapSerde('publicKey')
  t.equal(serde, 'beetSolana.publicKey', 'publicKey serde')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_SOLANA_PACKAGE],
  })
  t.notOk(tm.usedFixableSerde, 'did not use fixable serde')

  t.end()
})

// -----------------
// Composites Multilevel
// -----------------
test('type-mapper: composite with type extensions - publicKey', (t) => {
  const tm = new TypeMapper()

  const type = <IdlType>{
    option: 'publicKey',
  }

  const ty = tm.map(type)
  t.equal(ty, 'beet.COption<web3.PublicKey>', 'option<publicKey>')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[SOLANA_WEB3_PACKAGE, BEET_PACKAGE],
  })

  tm.clearUsages()
  const serde = tm.mapSerde(type)
  t.equal(
    serde,
    'beet.coption(beetSolana.publicKey)',
    'option<publicKey> serde'
  )
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_SOLANA_PACKAGE, BEET_PACKAGE],
  })
  t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
  t.ok(tm.usedFixableSerde, 'used fixable serde')

  t.end()
})

test('type-mapper: composite types multilevel - option<option<number>>', (t) => {
  const tm = new TypeMapper()
  const type = <IdlType>{
    option: {
      option: 'u64',
    },
  }
  const ty = tm.map(type)
  t.equal(ty, 'beet.COption<beet.COption<beet.bignum>>')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })

  tm.clearUsages()
  const serde = tm.mapSerde(type)
  t.equal(serde, 'beet.coption(beet.coption(beet.u64))')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
  t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
  t.ok(tm.usedFixableSerde, 'used fixable serde')
  t.end()
})

test('type-mapper: composite types multilevel - option<option<publicKey>>', (t) => {
  const tm = new TypeMapper()
  const type = <IdlType>{
    option: {
      option: 'publicKey',
    },
  }
  const ty = tm.map(type)
  t.equal(ty, 'beet.COption<beet.COption<web3.PublicKey>>')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[SOLANA_WEB3_PACKAGE, BEET_PACKAGE],
  })

  tm.clearUsages()
  const serde = tm.mapSerde(type)
  t.equal(serde, 'beet.coption(beet.coption(beetSolana.publicKey))')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_SOLANA_PACKAGE, BEET_PACKAGE],
  })
  t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
  t.ok(tm.usedFixableSerde, 'used fixable serde')

  t.end()
})

test('type-mapper: composite types multilevel - vec<option<ConfigData>>', (t) => {
  const tm = new TypeMapper(
    new Map(),
    new Map([['ConfigData', '/module/of/config-data.ts']])
  )
  const type = <IdlType>{
    vec: {
      option: {
        defined: 'ConfigData',
      },
    },
  }
  const ty = tm.map(type)
  t.equal(ty, 'beet.COption<ConfigData>[]')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
  spok(t, Array.from(tm.localImportsByPath), {
    $topic: 'local imports',
    ...[['/module/of/config-data.ts', new Set(['ConfigData'])]],
  })

  tm.clearUsages()
  const serde = tm.mapSerde(type)
  t.equal(serde, 'beet.array(beet.coption(configDataBeet))')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
  spok(t, Array.from(tm.localImportsByPath), {
    $topic: 'local imports',
    ...[['/module/of/config-data.ts', new Set(['configDataBeet'])]],
  })
  t.ok(tm.usedFixableSerde, 'used fixable serde')

  t.end()
})

// -----------------
// Map Serde Fields
// -----------------
test('type-mapper: serde fields', (t) => {
  const u16 = <IdlField>{ name: 'u16', type: 'u16' }
  const configData = <IdlField>{
    name: 'configData',
    type: {
      defined: 'ConfigData',
    },
  }
  const optionPublicKey = <IdlField>{
    name: 'optionPublicKey',
    type: {
      option: 'publicKey',
    },
  }
  const vecOptionConfigData = <IdlField>{
    name: 'vecOptionConfigData',
    type: {
      vec: {
        option: {
          defined: 'ConfigData',
        },
      },
    },
  }

  const tm = new TypeMapper(
    new Map(),
    new Map([['ConfigData', '/module/of/config-data.ts']])
  )
  {
    t.comment('+++ u16 field only')
    tm.clearUsages()
    const mappedFields = tm.mapSerdeFields([u16])
    spok(t, mappedFields, [{ name: 'u16', type: 'beet.u16' }])

    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
    t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
  }

  {
    t.comment('+++ optionPublicKey field only')
    tm.clearUsages()
    const mappedFields = tm.mapSerdeFields([optionPublicKey])
    spok(t, mappedFields, [
      {
        name: 'optionPublicKey',
        type: 'beet.coption(beetSolana.publicKey)',
      },
    ])

    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_SOLANA_PACKAGE, BEET_PACKAGE],
    })
    t.ok(tm.usedFixableSerde, 'used fixable serde')
  }

  {
    t.comment(
      '+++ u16, optionPublicKey, configData and vecOptionConfigData fields'
    )
    tm.clearUsages()
    const mappedFields = tm.mapSerdeFields([
      u16,
      optionPublicKey,
      configData,
      vecOptionConfigData,
    ])

    spok(t, mappedFields, [
      { name: 'u16', type: 'beet.u16' },
      {
        name: 'optionPublicKey',
        type: 'beet.coption(beetSolana.publicKey)',
      },
      {
        name: 'configData',
        type: 'configDataBeet',
      },
      {
        name: 'vecOptionConfigData',
        type: 'beet.array(beet.coption(configDataBeet))',
      },
    ])

    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE, BEET_SOLANA_PACKAGE],
    })
    spok(t, Array.from(tm.localImportsByPath), {
      $topic: 'local imports',
      ...[['/module/of/config-data.ts', new Set(['configDataBeet'])]],
    })
    t.ok(tm.usedFixableSerde, 'used fixable serde')
  }
  t.end()
})

// -----------------
// Imports
// -----------------
test('type-mapper: imports for serde packages used ', (t) => {
  const tm = new TypeMapper()

  {
    tm.clearUsages()

    t.comment('+++ imports for three packages')
    const packsUsed = <SerdePackage[]>[
      SOLANA_WEB3_PACKAGE,
      BEET_PACKAGE,
      BEET_SOLANA_PACKAGE,
    ]
    for (const pack of packsUsed) {
      tm.serdePackagesUsed.add(pack)
    }
    const imports = tm.importsUsed(SOME_FILE_DIR)
    spok(t, imports, [
      `import * as web3 from '@solana/web3.js';`,
      `import * as beet from '@metaplex-foundation/beet';`,
      `import * as beetSolana from '@metaplex-foundation/beet-solana';`,
    ])
  }

  {
    tm.clearUsages()

    t.comment('+++ imports for one package')
    const packsUsed = <SerdePackage[]>[BEET_PACKAGE]
    for (const pack of packsUsed) {
      tm.serdePackagesUsed.add(pack)
    }
    const imports = tm.importsUsed(SOME_FILE_DIR)
    spok(t, imports, [`import * as beet from '@metaplex-foundation/beet';`])
  }
  t.end()
})

// -----------------
// Type Aliases
// -----------------
test('type-mapper: user defined - aliased', (t) => {
  const type = <IdlType>{
    defined: 'UnixTimestamp',
  }
  {
    t.comment('+++ when alias not provided')
    const tm = new TypeMapper(new Map(), new Map())

    t.throws(
      () => tm.map(type),
      /unknown type UnixTimestamp/i,
      'throws unknown type error'
    )
  }
  {
    t.comment('+++ when alias provided')
    const tm = new TypeMapper(
      new Map(),
      new Map(),
      new Map([['UnixTimestamp', 'i64']])
    )
    const ty = tm.map(type)
    t.equal(ty, 'beet.bignum')

    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.i64')

    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
    t.equal(tm.localImportsByPath.size, 0, 'did not use local imports')
    t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
  }

  t.end()
})

// -----------------
// Tuples
// -----------------
test('type-mapper: tuples top level', (t) => {
  t.test('fixed', (t) => {
    const cases = [
      [
        ['u32', 'u32', 'u32'],
        '[number, number, number]',
        'beet.fixedSizeTuple([beet.u32, beet.u32, beet.u32])',
      ],
      [
        ['i16', 'i16', 'i16'],
        '[number, number, number]',
        'beet.fixedSizeTuple([beet.i16, beet.i16, beet.i16])',
      ],
      [
        ['u16', 'i64', 'u128'],
        '[number, beet.bignum, beet.bignum]',
        'beet.fixedSizeTuple([beet.u16, beet.i64, beet.u128])',
      ],
      [
        [
          'u16',
          {
            name: 'ScalarEnum',
            kind: 'enum',
            variants: [
              {
                name: 'Wallet',
              },
              {
                name: 'Token',
              },
              {
                name: 'NFT',
              },
            ],
          },
        ],
        '[number, ScalarEnum]',
        'beet.fixedSizeTuple([beet.u16, beet.fixedScalarEnum(ScalarEnum)])',
      ],
    ]
    const tm = new TypeMapper()
    {
      // TypeScript types
      for (const [tuple, typesScriptType] of cases) {
        const type = <IdlType>{
          tuple,
        }
        const ty = tm.map(type)
        t.equal(
          ty,
          typesScriptType,
          `(${tuple}) maps to '${ty}' TypeScript type`
        )
      }
      t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
      t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
    }

    tm.clearUsages()
    {
      // Serdes
      for (const [tuple, _, expectedSerde] of cases) {
        const type = <IdlType>{
          tuple,
        }
        const serde = tm.mapSerde(type)
        t.equal(serde, expectedSerde, `${serde} maps to ${expectedSerde} serde`)
      }
      t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
      t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
    }
    t.end()
  })

  t.test('fixable', (t) => {
    const cases = [
      [
        ['string', { vec: 'u8' }],
        '[string, number[]]',
        'beet.tuple([beet.utf8String, beet.array(beet.u8)])',
      ],
      [
        ['string', 'string', 'u8', { vec: 'i32' }, { option: 'i32' }],
        '[string, string, number, number[], beet.COption<number>]',
        'beet.tuple([beet.utf8String, beet.utf8String, beet.u8, beet.array(beet.i32), beet.coption(beet.i32)])',
      ],
    ]

    const tm = new TypeMapper()
    {
      // TypeScript types
      for (const [tuple, typesScriptType] of cases) {
        const type = <IdlType>{
          tuple,
        }
        const ty = tm.map(type)
        t.equal(
          ty,
          typesScriptType,
          `(${tuple}) maps to '${ty}' TypeScript type`
        )
      }
      t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
      t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
    }
    tm.clearUsages()
    {
      // Serdes
      for (const [tuple, _, expectedSerde] of cases) {
        const type = <IdlType>{
          tuple,
        }
        const serde = tm.mapSerde(type)
        t.equal(serde, expectedSerde, `${tuple} maps to ${expectedSerde} serde`)
      }
      t.ok(tm.usedFixableSerde, 'used fixable serde')
      t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
    }
    t.end()
  })
})

test('type-mapper: tuples nested', (t) => {
  const cases = [
    [
      { vec: { tuple: ['i64', 'u16'] } },
      '[beet.bignum, number][]',
      'beet.array(beet.fixedSizeTuple([beet.i64, beet.u16]))',
    ],
    [
      { vec: { tuple: ['string', 'u8'] } },
      '[string, number][]',
      'beet.array(beet.tuple([beet.utf8String, beet.u8]))',
    ],
    [
      { option: { tuple: ['u8', 'i8', 'u16', 'i128'] } },
      'beet.COption<[number, number, number, beet.bignum]>',
      'beet.coption(beet.fixedSizeTuple([beet.u8, beet.i8, beet.u16, beet.i128]))',
    ],
  ]
  const tm = new TypeMapper()
  {
    // TypeScript types
    for (const [type, typesScriptType] of cases) {
      const ty = tm.map(<IdlType>type)
      t.equal(
        ty,
        typesScriptType,
        `(${deepInspect(type)}) maps to '${ty}' TypeScript type`
      )
    }
    t.notOk(tm.usedFixableSerde, 'did not use fixable serde')
    t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
  }
  tm.clearUsages()
  {
    // Serdes
    for (const [type, _, expectedSerde] of cases) {
      const serde = tm.mapSerde(<IdlType>type)
      t.equal(
        serde,
        expectedSerde,
        `${deepInspect(type)} maps to ${expectedSerde} serde`
      )
    }
    t.ok(tm.usedFixableSerde, 'used fixable serde')
    t.equal(tm.localImportsByPath.size, 0, 'used no local imports')
  }
  t.end()
})
