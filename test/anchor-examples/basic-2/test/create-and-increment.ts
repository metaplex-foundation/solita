import test from 'tape'
import { Connection, Transaction } from '@solana/web3.js'
import {
  CounterAccountData,
  createCreateInstruction,
  createIncrementInstruction,
} from '../src/'
import {
  AddressLabels,
  airdrop,
  assertConfirmedTransaction,
  assertTransactionSummary,
  LOCALHOST,
  PayerTransactionHandler,
} from '@metaplex-foundation/amman'

const idl = require('../idl/basic_2.json')

;(function killStuckProcess() {
  test.onFinish(() => process.exit(0))
})()

const addressLabels = new AddressLabels(
  { basic1: idl.metadata.address },
  console.log,
  process.env.ADDRESS_LABEL_PATH
)

async function create() {
  const [payer, payerKeypair] = addressLabels.genKeypair('payer')
  const [counter, counterKeypair] = addressLabels.genKeypair('counter')
  const connection = new Connection(LOCALHOST, 'confirmed')
  const transactionHandler = new PayerTransactionHandler(
    connection,
    payerKeypair
  )

  await airdrop(connection, payer, 2)

  const ix = createCreateInstruction(
    {
      user: payer,
      counter,
    },
    // NOTE: the original tests don't pass the authority.
    // The program actually  assigns the account of the same name that is passed with the transaction
    // Therefore the instruction arg isn't actually used.
    // However it is a required arg, so we pass the payer here
    { authority: payer }
  )
  const tx = new Transaction().add(ix)
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [
    counterKeypair,
  ])
  return {
    res,
    connection,
    payer,
    payerKeypair,
    counter,
    counterKeypair,
    transactionHandler,
  }
}

test('create', async (t) => {
  const { res, connection, counter, payer } = await create()

  assertConfirmedTransaction(t, res.txConfirmed)
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/instruction: create/i, /success/],
  })

  const accountInfo = await connection.getAccountInfo(counter)
  const [account] = CounterAccountData.fromAccountInfo(accountInfo!)

  t.ok(account.authority.equals(payer), 'payer is authority')
  t.equal(account.count.toString(), '0', 'initializes count to 0')
})

test('increment', async (t) => {
  const { connection, counter, payer, transactionHandler } = await create()

  const ix = createIncrementInstruction({ counter, authority: payer })
  const tx = new Transaction().add(ix)
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [])
  assertConfirmedTransaction(t, res.txConfirmed)
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/instruction: increment/i, /success/],
  })

  const accountInfo = await connection.getAccountInfo(counter)
  const [account] = CounterAccountData.fromAccountInfo(accountInfo!)

  t.ok(account.authority.equals(payer), 'payer is authority')
  t.equal(account.count.toString(), '1', 'increments count to 1')
})
