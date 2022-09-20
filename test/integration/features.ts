import { Idl } from '../../src/solita'
import test from 'tape'
import { checkIdl } from '../utils/check-idl'

import accountPaddingJson from './fixtures/feat-account-padding.json'
import aliasesJson from './fixtures/feat-aliases.json'
import dataEnumJson from './fixtures/feat-data-enum.json'
import fixAnchorMapsJson from './fixtures/feat-fix-anchor-maps.json'
import mixedEnumsWithCustomTypesJson from './fixtures/feat-mixed-enums+custom-types.json'
import mixedEnumsJson from './fixtures/feat-mixed-enums.json'
import tuplesJson from './fixtures/feat-tuples.json'
import setsJson from './fixtures/feat-sets.json'

// -----------------
// feat-account-padding
// -----------------
{
  const label = 'feat-account-padding'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = accountPaddingJson as Idl
    await checkIdl(t, idl, label)
  })
}
// -----------------
// feat-aliases
// -----------------
{
  const label = 'feat-aliases'

  test('renders type correct SDK for ' + label, async (t) => {
    const { comment, ...withoutComment } = aliasesJson
    const idl = withoutComment as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'A1BvUFMKzoubnHEFhvhJxXyTfEN6r2DqCZxJFF9hfH3x',
    }
    await checkIdl(t, idl, label, {
      formatCode: true,
      typeAliases: { UnixTimestamp: 'i64' },
    })
  })
}
// -----------------
// feat-data-enum
// -----------------
{
  const label = 'feat-data-enum'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = dataEnumJson as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'A1BvUFMKzoubnHEFhvhJxXyTfEN6r2DqCZxJFF9hfH3x',
    }
    await checkIdl(t, idl, label)
  })
}
// -----------------
// feat-fix-anchor-maps
// -----------------
{
  const label = 'feat-fix-anchor-maps'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = fixAnchorMapsJson as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'A1BvUFMKzoubnHEFhvhJxXyTfEN6r2DqCZxJFF9hfH3x',
    }
    await checkIdl(t, idl, label)
  })
}
// -----------------
// feat-mixed-enums+custom-types
// -----------------
{
  const label = 'feat-mixed-enums+custom-types'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = mixedEnumsWithCustomTypesJson as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'A1BvUFMKzoubnHEFhvhJxXyTfEN6r2DqCZxJFF9hfH3x',
    }
    await checkIdl(t, idl, label)
  })
}
// -----------------
// feat-mixed-enums
// -----------------
{
  const label = 'feat-mixed-enums'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = mixedEnumsJson as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'A1BvUFMKzoubnHEFhvhJxXyTfEN6r2DqCZxJFF9hfH3x',
    }
    await checkIdl(t, idl, label)
  })
}
// -----------------
// feat-tuples
// -----------------
{
  const label = 'feat-tuples'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = tuplesJson as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'A1BvUFMKzoubnHEFhvhJxXyTfEN6r2DqCZxJFF9hfH3x',
    }
    await checkIdl(t, idl, label)
  })
}
// -----------------
// feat-sets
// -----------------
{
  const label = 'feat-sets'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = setsJson as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'A1BvUFMKzoubnHEFhvhJxXyTfEN6r2DqCZxJFF9hfH3x',
    }
    await checkIdl(t, idl, label)
  })
}
