import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'
import { createInitializeInstruction } from '../src/'
import {
  airdrop,
  LOCALHOST,
  PayerTransactionHandler,
} from '@metaplex-foundation/amman'

function genKeypair(): [PublicKey, Keypair] {
  const kp = Keypair.generate()
  return [kp.publicKey, kp]
}

async function main() {
  const [payer, payerKeypair] = genKeypair()
  const connection = new Connection(LOCALHOST, 'confirmed')
  const transactionHandler = new PayerTransactionHandler(
    connection,
    payerKeypair
  )

  await airdrop(connection, payer, 2)

  const ix = createInitializeInstruction({}, [])
  const tx = new Transaction().add(ix)
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [
    payerKeypair,
  ])
  console.log(res)
}

console.log('Running client.')
main().then(() => console.log('Success'))
