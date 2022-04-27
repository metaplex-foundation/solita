import test from 'tape'
import { Connection, Transaction } from '@solana/web3.js'
import {
  Counter,
  createCreateInstruction,
  createDecrementInstruction,
  createIncrementInstruction,
  errorFromCode,
  MaxCountExceededError,
  MinCountSubceededError,
} from '../src/'
import {
  assertConfirmedTransaction,
  assertTransactionSummary,
  LOCALHOST,
  Amman,
} from '@metaplex-foundation/amman'
import { initCusper, ErrorWithLogs } from '@metaplex-foundation/cusper'
import { strict as assert } from 'assert'

const idl = require('../idl/basic_4.json')

;(function killStuckProcess() {
  test.onFinish(() => process.exit(0))
})()

function assertIsErrorWithLogs(err: unknown): asserts err is ErrorWithLogs {
  const er = err as ErrorWithLogs
  assert(typeof er.message === 'string')
  assert(typeof er.name === 'string')
  assert(er.logs != null, `Has logs ${er.toString()}`)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const amman = Amman.instance({
  knownLabels: { basic4: idl.metadata.address },
  log: console.log,
})

const cusper = initCusper(errorFromCode)

async function create() {
  const [payer, payerKeypair] = await amman.genLabeledKeypair('payer')
  const [counter, counterKeypair] = await amman.genLabeledKeypair('counter')
  const connection = new Connection(LOCALHOST, 'confirmed')
  const transactionHandler = amman.payerTransactionHandler(
    connection,
    payerKeypair
  )

  await amman.airdrop(connection, payer, 2)

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

test('increment two times', async (t) => {
  const { connection, counter, payer, transactionHandler } = await create()

  const ix = createIncrementInstruction({ counter, authority: payer })
  {
    t.comment('+++ First Increment')
    const tx = new Transaction().add(ix)
    const res = await transactionHandler.sendAndConfirmTransaction(tx, [])
    assertConfirmedTransaction(t, res.txConfirmed)
    assertTransactionSummary(t, res.txSummary, {
      msgRx: [/instruction: increment/i, /success/],
    })

    const accountInfo = await connection.getAccountInfo(counter)
    const [account] = Counter.fromAccountInfo(accountInfo!)

    t.ok(account.authority.equals(payer), 'payer is authority')
    t.equal(account.count.toString(), '1', 'increments count to 1')
  }

  {
    // HACK: working around 'cannot get recent blockhash' issue of local test validator
    await sleep(4000)

    t.comment('+++ Second Increment')
    const tx = new Transaction().add(ix)
    try {
      await transactionHandler.sendAndConfirmTransaction(tx, [])
    } catch (err) {
      assertIsErrorWithLogs(err)
      const resolvedError = cusper.errorFromProgramLogs(err.logs)
      assert(resolvedError != null, 'throws known error')

      t.equal(resolvedError.name, 'MaxCountExceeded', 'err name')
      t.ok(resolvedError instanceof MaxCountExceededError, 'err instance')
      t.match(resolvedError.message, /cannot increment more/i, 'err message')
    }
    const accountInfo = await connection.getAccountInfo(counter)
    const [account] = Counter.fromAccountInfo(accountInfo!)

    t.ok(account.authority.equals(payer), 'payer is still authority')
    t.equal(account.count.toString(), '1', 'keeps count at 1')
  }
})

test('decrement before incrementing', async (t) => {
  const { counter, payer, transactionHandler } = await create()
  const ix = createDecrementInstruction({ counter, authority: payer })

  const tx = new Transaction().add(ix)
  try {
    await transactionHandler.sendAndConfirmTransaction(tx, [])
  } catch (err) {
    assertIsErrorWithLogs(err)
    const resolvedError = cusper.errorFromProgramLogs(err.logs)
    assert(resolvedError != null, 'throws known error')

    t.equal(resolvedError.name, 'MinCountSubceeded', 'err name')
    t.ok(resolvedError instanceof MinCountSubceededError, 'err instance')
    t.match(resolvedError.message, /cannot decrement more/i, 'err message')
  }
})
