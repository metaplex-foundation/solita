import test from 'tape'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import {
  AddressLabels,
  airdrop,
  assertConfirmedTransaction,
  assertTransactionSummary,
  LOCALHOST,
  PayerTransactionHandler,
} from '@metaplex-foundation/amman'
import {
  createInitializeInstruction,
  createPullStringsInstruction,
  Data,
} from '../src/'

const puppetIdl = require('../idl/puppet.json')
const puppetMasterIdl = require('../idl/puppet_master.json')

const puppetProgramId = new PublicKey(puppetIdl.metadata.address)

;(function killStuckProcess() {
  test.onFinish(() => process.exit(0))
})()

const addressLabels = new AddressLabels(
  {
    puppet: puppetProgramId.toBase58(),
    puppetMaster: puppetMasterIdl.metadata.address,
  },
  console.log,
  process.env.ADDRESS_LABEL_PATH
)

async function init() {
  const [payer, payerKeypair] = addressLabels.genKeypair('payer')
  const [puppet, puppetKeypair] = addressLabels.genKeypair('puppet')
  const connection = new Connection(LOCALHOST, 'confirmed')
  const transactionHandler = new PayerTransactionHandler(
    connection,
    payerKeypair
  )

  await airdrop(connection, payer, 2)

  const ix = createInitializeInstruction({
    user: payer,
    puppet,
  })
  const tx = new Transaction().add(ix)
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [
    puppetKeypair,
  ])
  return {
    res,
    connection,
    payer,
    payerKeypair,
    puppet,
    puppetKeypair,
    transactionHandler,
  }
}

test('create', async (t) => {
  const { res, connection, puppet } = await init()

  assertConfirmedTransaction(t, res.txConfirmed)
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/instruction: initialize/i, /success/],
  })

  const accountInfo = await connection.getAccountInfo(puppet)
  const [account] = Data.fromAccountInfo(accountInfo!)

  t.equal(account.data.toString(), '0', 'initializes data to 0')
})

test('pull strings', async (t) => {
  const { connection, puppet, transactionHandler } = await init()

  const ix = createPullStringsInstruction(
    { puppet, puppetProgram: puppetProgramId },
    { data: 111 }
  )
  const tx = new Transaction().add(ix)
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [])
  assertConfirmedTransaction(t, res.txConfirmed)
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/instruction: pullstrings/i, /instruction: setdata/i, /success/],
  })

  const accountInfo = await connection.getAccountInfo(puppet)
  const [account] = Data.fromAccountInfo(accountInfo!)

  t.equal(account.data.toString(), '111', 'updates puppet account data')
})
