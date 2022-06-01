import * as web3 from '@solana/web3.js'

export type CollectionInfoV1 = {
  __kind: 'V1'
  symbol: string
  verifiedCreators: web3.PublicKey
  whiteListRoot: number[] /* 32 */
}

export type CollectionInfoV2 = {
  __kind: 'V2'
  collectionMint: web3.PublicKey
}

export type CollectionInfo = CollectionInfoV1 | CollectionInfoV2

export const isCollectionInfoV1 = (x: CollectionInfo): x is CollectionInfoV1 =>
  x.__kind === 'V1'
export const isCollectionInfoV2 = (x: CollectionInfo): x is CollectionInfoV2 =>
  x.__kind === 'V2'

function handleCollectionInfo(info: CollectionInfo) {
  switch (info.__kind) {
    case 'V1':
      // TS narrowws to CollectionInfoV1
      console.log(info.symbol)
      break
    case 'V2':
      // TS narrowws to CollectionInfoV2
      console.log(info.collectionMint)
      break
  }
}
