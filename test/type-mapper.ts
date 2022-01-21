import test from 'tape'
import spok from 'spok'
import { TypeMapper } from '../src/type-mapper'
import {
  BEET_PACKAGE,
  BEET_SOLANA_PACKAGE,
  IdlField,
  IdlType,
  LOCAL_TYPES_PACKAGE,
  SOLANA_WEB3_PACKAGE,
} from '../src/types'
import { SerdePackage } from '../src/serdes'

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
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[],
  })

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
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[],
    })

    tm.clearUsages()
    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.array(beet.u16)', 'vec<u16> serde')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
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
      ...[],
    })

    tm.clearUsages()
    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.array(beet.u64)', 'vec<u64> serde')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
    t.ok(tm.usedFixableSerde, 'used fixable serde')
  }
  t.end()
})

// -----------------
// Composites User Defined
// -----------------
test('type-mapper: composite types - user defined', (t) => {
  const tm = new TypeMapper()
  const type = <IdlType>{
    defined: 'ConfigData',
  }
  const ty = tm.map(type)

  t.equal(ty, 'definedTypes.ConfigData')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[LOCAL_TYPES_PACKAGE],
  })
  tm.clearUsages()

  const serde = tm.mapSerde(type)
  t.equal(serde, 'definedTypes.configDataStruct')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[LOCAL_TYPES_PACKAGE],
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
  t.ok(tm.usedFixableSerde, 'used fixable serde')

  t.end()
})

test('type-mapper: composite types multilevel - vec<option<ConfigData>>', (t) => {
  const tm = new TypeMapper()
  const type = <IdlType>{
    vec: {
      option: {
        defined: 'ConfigData',
      },
    },
  }
  const ty = tm.map(type)
  t.equal(ty, 'beet.COption<definedTypes.ConfigData>[]')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[LOCAL_TYPES_PACKAGE, BEET_PACKAGE],
  })

  tm.clearUsages()
  const serde = tm.mapSerde(type)
  t.equal(serde, 'beet.array(beet.coption(definedTypes.configDataStruct))')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[LOCAL_TYPES_PACKAGE, BEET_PACKAGE],
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

  const tm = new TypeMapper()
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
        type: 'definedTypes.configDataStruct',
      },
      {
        name: 'vecOptionConfigData',
        type: 'beet.array(beet.coption(definedTypes.configDataStruct))',
      },
    ])

    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE, BEET_SOLANA_PACKAGE],
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
    const imports = tm.importsForSerdePackagesUsed()
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
    const imports = tm.importsForSerdePackagesUsed()
    spok(t, imports, [`import * as beet from '@metaplex-foundation/beet';`])
  }
  t.end()
})
