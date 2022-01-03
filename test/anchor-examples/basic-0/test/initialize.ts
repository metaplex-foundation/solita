import test from 'tape'
import { Connection, Transaction } from '@solana/web3.js'
import { createInitializeInstruction } from '../src/'
import {
  AddressLabels,
  airdrop,
  assertConfirmedTransaction,
  assertTransactionSummary,
  LOCALHOST,
  PayerTransactionHandler,
} from '@metaplex-foundation/amman'

const idl = require('../idl/basic_0.json')

;(function killStuckProcess() {
  test.onFinish(() => process.exit(0))
})()

const addressLabels = new AddressLabels(
  { basic0: idl.metadata.address },
  console.log
)

test('initialize', async (t) => {
  const [payer, payerKeypair] = addressLabels.genKeypair('payer')
  const connection = new Connection(LOCALHOST, 'confirmed')
  const transactionHandler = new PayerTransactionHandler(
    connection,
    payerKeypair
  )

  await airdrop(connection, payer, 2)

  const ix = createInitializeInstruction({})
  const tx = new Transaction().add(ix)
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [
    payerKeypair,
  ])

  assertConfirmedTransaction(t, res.txConfirmed)
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/instruction: initialize/i, /success/],
  })
})
