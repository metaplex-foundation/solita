import test from 'tape'
import { Connection, Transaction } from '@solana/web3.js'
import { createInitializeInstruction } from '../src/'
import {
  Amman,
  assertConfirmedTransaction,
  assertTransactionSummary,
  LOCALHOST,
} from '@metaplex-foundation/amman'

const idl = require('../idl/basic_0.json')

;(function killStuckProcess() {
  test.onFinish(() => process.exit(0))
})()

const amman = Amman.instance({
  knownLabels: { basic0: idl.metadata.address },
  log: console.log,
})

test('initialize', async (t) => {
  const [payer, payerKeypair] = await amman.genLabeledKeypair('payer')
  const connection = new Connection(LOCALHOST, 'confirmed')
  const transactionHandler = amman.payerTransactionHandler(
    connection,
    payerKeypair
  )

  await amman.airdrop(connection, payer, 2)

  const ix = createInitializeInstruction()
  const tx = new Transaction().add(ix)
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [
    payerKeypair,
  ])

  assertConfirmedTransaction(t, res.txConfirmed)
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/instruction: initialize/i, /success/],
  })
})
