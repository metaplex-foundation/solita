import test from 'tape'
import spok from 'spok'
import { TypeMapper } from '../src/type-mapper'
import {
  BEET_PACKAGE,
  BEET_SOLANA_PACKAGE,
  IdlType,
  LOCAL_TYPES_PACKAGE,
  SOLANA_WEB3_PACKAGE,
} from '../src/types'

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

  tm.clearSerdePackagesUsed()
  for (const n of types) {
    const serde = tm.mapSerde(n)
    t.equal(serde, `beet.${n}`, `'${n}' maps to '${serde}' serde`)
  }
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
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

  tm.clearSerdePackagesUsed()
  for (const n of types) {
    const serde = tm.mapSerde(n)
    t.equal(serde, `beet.${n}`, `'${n}' maps to '${serde}' serde`)
  }
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
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

    tm.clearSerdePackagesUsed()
    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.coption(beet.u16)', 'option<u16> serde')

    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
  }

  {
    tm.clearSerdePackagesUsed()
    const type = <IdlType>{
      option: 'u64',
    }

    const ty = tm.map(type)
    t.equal(ty, 'beet.COption<beet.bignum>', 'option<u64>')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })

    tm.clearSerdePackagesUsed()
    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.coption(beet.u64)', 'option<u64> serde')

    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
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

    tm.clearSerdePackagesUsed()
    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.fixedSizeArray(beet.u16, 1)', 'vec<u16> serde')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
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

    tm.clearSerdePackagesUsed()
    const serde = tm.mapSerde(type)
    t.equal(serde, 'beet.fixedSizeArray(beet.u64, 1)', 'vec<u64> serde')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
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
  tm.clearSerdePackagesUsed()

  const serde = tm.mapSerde(type)
  t.equal(serde, 'definedTypes.ConfigData.struct')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[LOCAL_TYPES_PACKAGE],
  })

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

  tm.clearSerdePackagesUsed()
  const serde = tm.mapSerde('publicKey')
  t.equal(serde, 'beetSolana.publicKey', 'publicKey serde')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_SOLANA_PACKAGE],
  })
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

  tm.clearSerdePackagesUsed()
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

  tm.clearSerdePackagesUsed()
  const serde = tm.mapSerde(type)
  t.equal(serde, 'beet.coption(beet.coption(beet.u64))')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
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

  tm.clearSerdePackagesUsed()
  const serde = tm.mapSerde(type)
  t.equal(serde, 'beet.coption(beet.coption(beetSolana.publicKey))')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_SOLANA_PACKAGE, BEET_PACKAGE],
  })
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

  tm.clearSerdePackagesUsed()
  const serde = tm.mapSerde(type)
  t.equal(
    serde,
    'beet.fixedSizeArray(beet.coption(definedTypes.ConfigData.struct), 1)'
  )
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[LOCAL_TYPES_PACKAGE, BEET_PACKAGE],
  })

  t.end()
})
