import test from 'tape'
import { Connection, SystemProgram, Transaction } from '@solana/web3.js'
import {
  createInitializeInstruction,
  createUpdateInstruction,
  MyAccountAccountData,
} from '../src/'
import {
  AddressLabels,
  airdrop,
  assertConfirmedTransaction,
  assertTransactionSummary,
  LOCALHOST,
  PayerTransactionHandler,
} from '@metaplex-foundation/amman'

const idl = require('../idl/basic_1.json')

;(function killStuckProcess() {
  test.onFinish(() => process.exit(0))
})()

const addressLabels = new AddressLabels(
  { basic1: idl.metadata.address },
  console.log,
  process.env.PERSIST_LABELS_PATH
)

async function initialize() {
  const [payer, payerKeypair] = addressLabels.genKeypair('payer')
  const [myAccount, myAccountKeypair] = addressLabels.genKeypair('myAccount')
  const connection = new Connection(LOCALHOST, 'confirmed')
  const transactionHandler = new PayerTransactionHandler(
    connection,
    payerKeypair
  )

  await airdrop(connection, payer, 2)

  const ix = createInitializeInstruction(
    {
      user: payer,
      myAccount,
      // TODO(thlorenz): don't require these but include the defaults with generated code
      systemProgram: SystemProgram.programId,
    },
    { data: 1 }
  )
  const tx = new Transaction().add(ix)
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [
    myAccountKeypair,
  ])
  return {
    res,
    connection,
    payer,
    payerKeypair,
    myAccount,
    myAccountKeypair,
    transactionHandler,
  }
}

test.skip('initialize', async (t) => {
  const { res, connection, myAccount } = await initialize()

  assertConfirmedTransaction(t, res.txConfirmed)
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/instruction: initialize/i, /success/],
  })

  const accountInfo = await connection.getAccountInfo(myAccount)
  const [account] = MyAccountAccountData.fromAccountInfo(accountInfo!)

  t.equal(
    account.data.toString(),
    '1',
    'initializes account with provided data'
  )
})

test('update', async (t) => {
  const { connection, myAccount, transactionHandler } = await initialize()

  const ix = createUpdateInstruction({ myAccount }, { data: 2 })
  const tx = new Transaction().add(ix)
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [])

  assertConfirmedTransaction(t, res.txConfirmed)
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/instruction: update/i, /success/],
  })

  const accountInfo = await connection.getAccountInfo(myAccount)
  const [account] = MyAccountAccountData.fromAccountInfo(accountInfo!)

  t.equal(account.data.toString(), '2', 'updates account with provided data')
})
