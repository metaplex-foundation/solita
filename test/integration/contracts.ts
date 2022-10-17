import path from 'path'
import { promises as fs } from 'fs'
import { Idl } from '../../src/solita'
import test from 'tape'
import { checkIdl } from '../utils/check-idl'

import anchorOptional from './fixtures/anchor-optional.json'
import auctionHouseAnchor24Json from './fixtures/auction_house-1.1.4-anchor-0.24.2.json'
import auctionHouseJson from './fixtures/auction_house.json'
import fanoutJson from './fixtures/fanout.json'
import gumdropJson from './fixtures/gumdrop.json'
import tokenMetadataJson from './fixtures/mpl_token_metadata.json'
import candyMachineV1Json from './fixtures/nft_candy_machine_v1.json'
import nftPacksJson from './fixtures/nft-packs.json'
import shankTicTacToeJson from './fixtures/shank_tictactoe.json'
import shankTokenMetadataJson from './fixtures/shank_token_metadata.json'
import shankTokenVaultJson from './fixtures/shank_token_vault.json'


// -----------------
// anchor-optional
// -----------------
{
  const label = 'anchor-optional'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = anchorOptional as Idl
    idl.instructions.map(ix => {
      ix.defaultOptionalAccounts = true
    })
    await checkIdl(t, idl, label)
  })
}
// -----------------
// ah-1.1.4-anchor-0.24.2
// -----------------
{
  const label = 'ah-1.1.4-anchor-0.24.2'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = auctionHouseAnchor24Json as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk',
    }
    await checkIdl(t, idl, label)
  })
}
// -----------------
// auction_house
// -----------------
{
  const label = 'auction_house'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = auctionHouseJson as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk',
    }
    await checkIdl(t, idl, label)
  })
}
// -----------------
// fanout
// -----------------
{
  const label = 'fanout'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = fanoutJson as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'A1BvUFMKzoubnHEFhvhJxXyTfEN6r2DqCZxJFF9hfH3x',
    }
    await checkIdl(t, idl, label)
  })
}
// -----------------
// gumdrop
// -----------------
{
  const label = 'gumdrop'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = gumdropJson as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'gdrpGjVffourzkdDRrQmySw4aTHr8a3xmQzzxSwFD1a',
    }
    await checkIdl(t, idl, label)
  })
}
// -----------------
// mpl_token_metadata
// -----------------
{
  const label = 'mpl_token_metadata'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = tokenMetadataJson as Idl
    await checkIdl(t, idl, label)
  })
}
// -----------------
// nft_candy_machine_v1
// -----------------
{
  const label = 'nft_candy_machine_v1'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = candyMachineV1Json as Idl
    idl.metadata = {
      ...idl.metadata,
      address: 'cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ',
    }
    await checkIdl(t, idl, label)
  })
}
// -----------------
// nft-packs
// -----------------
{
  const label = 'nft-packs'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = nftPacksJson as Idl
    await checkIdl(t, idl, label)
  })
}
// -----------------
// shank-tictactoe
// -----------------
{
  const label = 'shank-tictactoe'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = shankTicTacToeJson as Idl
    await checkIdl(t, idl, label)
  })
}
// -----------------
// shank-token-metadata
// -----------------
{
  const label = 'shank-token-metadata'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = shankTokenMetadataJson as Idl
    const { generatedSDKDir } = await checkIdl(t, idl, label)

    async function verifyCodeMatches(relPath: string, rx: RegExp) {
      const fullPath = path.join(generatedSDKDir, relPath)
      const code = await fs.readFile(fullPath, 'utf8')
      t.match(code, rx, `Code inside ${relPath} matches ${rx.toString()}`)
    }

    await verifyCodeMatches(
      'types/Data.ts',
      /FixableBeetArgsStruct<\s*Data\s*>/,
    )
    await verifyCodeMatches(
      'instructions/CreateMetadataAccount.ts',
      /FixableBeetArgsStruct<\s*CreateMetadataAccountInstructionArgs/,
    )
  })
}
// -----------------
// shank-token-vault
// -----------------
{
  const label = 'shank-token-vault'

  test('renders type correct SDK for ' + label, async (t) => {
    const idl = shankTokenVaultJson as Idl
    await checkIdl(t, idl, label)
  })
}
