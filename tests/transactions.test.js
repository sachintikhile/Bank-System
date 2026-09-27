import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ChartOfAccounts,
  AccountType,
  JournalEngine,
  BalanceService,
  HoldService,
} from '../src/ledger/index.js';
import {
  PaymentRailType,
  PaymentRailRouter,
  RealTimePaymentRailAdapter,
  FraudEngine,
  PaymentSagaOrchestrator,
  TransactionService,
  SagaState,
} from '../src/transactions/index.js';

function setupEnvironment(options = {}) {
  const coa = new ChartOfAccounts();
  const vault = coa.createAccount({ id: 'ACC_VAULT', code: '1000', name: 'Vault Cash', type: AccountType.ASSET });
  const alice = coa.createAccount({ id: 'ACC_ALICE', code: '2001', name: 'Alice Checking', type: AccountType.LIABILITY });
  const bob = coa.createAccount({ id: 'ACC_BOB', code: '2002', name: 'Bob Checking', type: AccountType.LIABILITY });
  const feeAccount = coa.createAccount({ id: 'ACC_FEES', code: '4000', name: 'Fee Income', type: AccountType.REVENUE });

  const journal = new JournalEngine(coa);
  const balanceService = new BalanceService(coa, journal);
  const holdService = new HoldService(coa, journal, balanceService);
  const fraudEngine = new FraudEngine();
  const railRouter = new PaymentRailRouter();

  if (options.failFedNow) {
    railRouter.registerAdapter(new RealTimePaymentRailAdapter({ simulateNetworkFailure: true }));
  }

  const sagaOrchestrator = new PaymentSagaOrchestrator({
    holdService,
    journalEngine: journal,
    fraudEngine,
    railRouter,
  });

  const transactionService = new TransactionService({
    sagaOrchestrator,
    journalEngine: journal,
    balanceService,
    feeRevenueAccountId: feeAccount.id,
  });

  // Seed Alice with $1,000.00 initial deposit
  journal.postTransaction({
    transactionId: 'TX_SEED_ALICE',
    description: 'Initial funding',
    currency: 'USD',
    legs: [
      { accountId: vault.id, direction: 'DEBIT', amountInCents: 100000 },
      { accountId: alice.id, direction: 'CREDIT', amountInCents: 100000 },
    ],
  });

  return { coa, vault, alice, bob, feeAccount, journal, balanceService, holdService, fraudEngine, railRouter, sagaOrchestrator, transactionService };
}

test('Task 2: Transaction Orchestrator & Saga Workflow Suite', async (suite) => {
  await suite.test('executes successful internal P2P transfer end-to-end', async () => {
    const env = setupEnvironment();

    const result = await env.transactionService.transfer({
      idempotencyKey: 'idem_p2p_test_1',
      sourceAccountId: 'ACC_ALICE',
      destinationAccountId: 'ACC_BOB',
      amountInCents: 15000, // $150.00
      railType: PaymentRailType.INTERNAL_P2P,
      memo: 'Groceries payment',
    });

    assert.equal(result.status, 'SETTLED');
    assert.equal(result.sagaState, SagaState.COMPLETED);
    assert.ok(result.transactionId.startsWith('TXN_'));

    // Verify Balances
    const aliceBal = env.balanceService.getBalance('ACC_ALICE');
    const bobBal = env.balanceService.getBalance('ACC_BOB');
    assert.equal(aliceBal.settledBalanceInCents, 85000); // $850.00
    assert.equal(bobBal.settledBalanceInCents, 15000);   // $150.00
  });

  await suite.test('handles idempotent replay without duplicate debit', async () => {
    const env = setupEnvironment();

    const transferPayload = {
      idempotencyKey: 'same_key_999',
      sourceAccountId: 'ACC_ALICE',
      destinationAccountId: 'ACC_BOB',
      amountInCents: 20000,
      railType: PaymentRailType.INTERNAL_P2P,
    };

    const first = await env.transactionService.transfer(transferPayload);
    assert.equal(first.status, 'SETTLED');
    assert.equal(first.isIdempotentReplay, undefined);

    const replay = await env.transactionService.transfer(transferPayload);
    assert.equal(replay.status, 'SETTLED');
    assert.equal(replay.isIdempotentReplay, true);
    assert.equal(replay.transactionId, first.transactionId);

    // Alice should only have been debited ONCE ($200.00)
    const aliceBal = env.balanceService.getBalance('ACC_ALICE');
    assert.equal(aliceBal.settledBalanceInCents, 80000);
  });

  await suite.test('blocks transaction if flagged by FraudEngine sanctions list', async () => {
    const env = setupEnvironment();

    const result = await env.transactionService.transfer({
      sourceAccountId: 'ACC_ALICE',
      destinationAccountId: 'ACC_BOB',
      amountInCents: 5000,
      beneficiaryName: 'Terror Front Corp',
      memo: 'Suspicious payment',
    });

    assert.equal(result.status, 'FAILED');
    assert.equal(result.sagaState, SagaState.ROLLED_BACK);
    assert.match(result.error, /RULE_SANCTION_MATCH/);

    // Balances unaffected
    assert.equal(env.balanceService.getBalance('ACC_ALICE').settledBalanceInCents, 100000);
  });

  await suite.test('compensating transaction: releases hold when payment rail fails', async () => {
    // Environment configured with failing FedNow rail
    const env = setupEnvironment({ failFedNow: true });

    const result = await env.transactionService.transfer({
      sourceAccountId: 'ACC_ALICE',
      destinationAccountId: 'ACC_BOB',
      amountInCents: 30000, // $300.00
      railType: PaymentRailType.FEDNOW_RTP,
      memo: 'Wire to external bank',
    });

    assert.equal(result.status, 'FAILED');
    assert.equal(result.sagaState, SagaState.ROLLED_BACK);
    assert.match(result.error, /Rail settlement rejected/);

    // Verify compensating rollback: hold was released and available balance restored!
    const available = env.holdService.getAvailableBalance('ACC_ALICE');
    assert.equal(available.settledBalanceInCents, 100000);
    assert.equal(available.activeHoldsInCents, 0);
    assert.equal(available.availableBalanceInCents, 100000);
  });

  await suite.test('queries transaction history for an account', async () => {
    const env = setupEnvironment();

    await env.transactionService.transfer({
      sourceAccountId: 'ACC_ALICE',
      destinationAccountId: 'ACC_BOB',
      amountInCents: 10000,
      memo: 'Payment 1',
    });

    await env.transactionService.transfer({
      sourceAccountId: 'ACC_ALICE',
      destinationAccountId: 'ACC_BOB',
      amountInCents: 20000,
      memo: 'Payment 2',
    });

    const history = env.transactionService.getAccountHistory('ACC_ALICE');
    assert.ok(history.totalEntries >= 2);
    assert.equal(history.accountId, 'ACC_ALICE');
  });
});
