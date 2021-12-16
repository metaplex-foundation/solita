import { strict as assert } from 'assert'
import * as beet from '@metaplex-foundation/beet'

export function assertBeetSupported(
  serde: string,
  context: string
): asserts serde is beet.BeetTypeMapKey {
  assert(
    beet.supportedTypeMap[serde as beet.BeetTypeMapKey] != null,
    `Types to ${context} need to be supported by Beet, ${serde} is not`
  )
}
