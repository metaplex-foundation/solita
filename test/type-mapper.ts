import test from 'tape'
import spok from 'spok'
import { TypeMapper } from '../src/type-mapper'
import {
  BEET_PACKAGE,
  IdlType,
  LOCAL_TYPES_PACKAGE,
  SOLANA_WEB3_PACKAGE,
} from '../src/types'

// -----------------
// Primitive Types
// -----------------
test('type-mapper: primitive types - numbers', (t) => {
  const tm = new TypeMapper()

  for (const n of <IdlType[]>['i8', 'u32', 'i16']) {
    const ty = tm.map(n)
    t.equal(ty, 'number', `'${n}' maps to '${ty}' TypeScript type`)
  }
  t.end()
})

test('type-mapper: primitive types - bignums', (t) => {
  const tm = new TypeMapper()

  for (const n of <IdlType[]>['i64', 'u128', 'i256', 'u512']) {
    const ty = tm.map(n)
    t.equal(ty, 'beet.bignum', `'${n}' maps to '${ty}' TypeScript type`)
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
    const ty = tm.map({
      option: 'u16',
    })

    t.equal(ty, 'beet.COption<number>', 'option<u16>')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[BEET_PACKAGE],
    })
  }

  {
    const ty = tm.map({
      option: 'u64',
    })
    t.equal(ty, 'beet.COption<beet.bignum>', 'option<u64>')
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
    const ty = tm.map({
      vec: 'u16',
    })

    t.equal(ty, 'number[]', 'vec<u16>')
    spok(t, Array.from(tm.serdePackagesUsed), {
      $topic: 'serdePackagesUsed',
      ...[],
    })
  }

  {
    const tm = new TypeMapper()
    const ty = tm.map({
      vec: 'u64',
    })
    t.equal(ty, 'beet.bignum[]', 'vec<u64>')
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
  const ty = tm.map({
    defined: 'ConfigData',
  })

  t.equal(ty, 'definedTypes.ConfigData')
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
  t.end()
})

// -----------------
// Composites Multilevel
// -----------------
test('type-mapper: composite with type extensions - publicKey', (t) => {
  const tm = new TypeMapper()

  const ty = tm.map({
    option: 'publicKey',
  })
  t.equal(ty, 'beet.COption<web3.PublicKey>', 'option<publicKey>')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[SOLANA_WEB3_PACKAGE, BEET_PACKAGE],
  })
  t.end()
})

test('type-mapper: composite types multilevel - option<option<number>>', (t) => {
  const tm = new TypeMapper()
  const ty = tm.map({
    option: {
      option: 'u64',
    },
  })
  t.equal(ty, 'beet.COption<beet.COption<beet.bignum>>')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[BEET_PACKAGE],
  })
  t.end()
})

test('type-mapper: composite types multilevel - option<option<publicKey>>', (t) => {
  const tm = new TypeMapper()
  const ty = tm.map({
    option: {
      option: 'publicKey',
    },
  })
  t.equal(ty, 'beet.COption<beet.COption<web3.PublicKey>>')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[SOLANA_WEB3_PACKAGE, BEET_PACKAGE],
  })
  t.end()
})

test('type-mapper: composite types multilevel - vec<option<ConfigData>>', (t) => {
  const tm = new TypeMapper()
  const ty = tm.map({
    vec: {
      option: {
        defined: 'ConfigData',
      },
    },
  })
  t.equal(ty, 'beet.COption<definedTypes.ConfigData>[]')
  spok(t, Array.from(tm.serdePackagesUsed), {
    $topic: 'serdePackagesUsed',
    ...[LOCAL_TYPES_PACKAGE, BEET_PACKAGE],
  })
  t.end()
})
