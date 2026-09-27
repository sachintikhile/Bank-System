import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Currencies,
  Money,
  AccountType,
  AccountStatus,
  ChartOfAccounts,
  JournalEngine,
  EntryDirection,
  BalanceService,
  HoldService,
} from '../src/ledger/index.js';

test('Task 1: Core Double-Entry Ledger Engine Suite', async (suite) => {
  await suite.test('Currencies & Money: precision handling and formatting', () => {
    const usd = Money.fromDecimal('1250.75', 'USD');
    assert.equal(usd.minorAmount, 125075n);
    assert.equal(usd.format(), '$1250.75 USD');

    const inr = Money.fromDecimal('500.50', 'INR');
    assert.equal(inr.minorAmount, 50050n);
    assert.equal(inr.format(), '₹500.50 INR');

    const jpy = Money.fromDecimal('5000', 'JPY');
    assert.equal(jpy.minorAmount, 5000n);
    assert.equal(jpy.format(), '¥5000 JPY');
  });

  await suite.test('ChartOfAccounts: structure and account status lifecycle', () => {
    const coa = new ChartOfAccounts();
    const acc = coa.createAccount({
      id: 'ACC_RESERVE',
      code: '1000.01',
      name: 'Central Bank Reserve',
      type: AccountType.ASSET,
      currency: 'USD',
    });

    assert.equal(acc.status, AccountStatus.ACTIVE);
    assert.equal(coa.getById('ACC_RESERVE').name, 'Central Bank Reserve');
    assert.equal(coa.getByCode('1000.01').id, 'ACC_RESERVE');

    coa.updateStatus('ACC_RESERVE', AccountStatus.FROZEN);
    assert.equal(coa.getById('ACC_RESERVE').status, AccountStatus.FROZEN);
  });

  await suite.test('JournalEngine: enforces double-entry and cryptographic chain integrity', () => {
    const coa = new ChartOfAccounts();
    coa.createAccount({ id: 'CASH', code: '1000', name: 'Cash', type: AccountType.ASSET, currency: 'USD' });
    coa.createAccount({ id: 'DEP_A', code: '2000', name: 'Customer A', type: AccountType.LIABILITY, currency: 'USD' });
    coa.createAccount({ id: 'DEP_B', code: '2001', name: 'Customer B', type: AccountType.LIABILITY, currency: 'USD' });

    const journal = new JournalEngine(coa);

    // Initial Deposit $1,000
    const tx1 = journal.postTransaction({
      transactionId: 'TXN_001',
      idempotencyKey: 'idem_1',
      description: 'Initial deposit',
      currency: 'USD',
      legs: [
        { accountId: 'CASH', direction: EntryDirection.DEBIT, amountInCents: 100000 },
        { accountId: 'DEP_A', direction: EntryDirection.CREDIT, amountInCents: 100000 },
      ],
    });
    assert.equal(tx1.status, 'COMMITTED');

    // Transfer $300 from Customer A to Customer B
    const tx2 = journal.postTransaction({
      transactionId: 'TXN_002',
      idempotencyKey: 'idem_2',
      description: 'P2P Transfer',
      currency: 'USD',
      legs: [
        { accountId: 'DEP_A', direction: EntryDirection.DEBIT, amountInCents: 30000 },
        { accountId: 'DEP_B', direction: EntryDirection.CREDIT, amountInCents: 30000 },
      ],
    });
    assert.equal(tx2.status, 'COMMITTED');

    // Verify cryptographic block hash chain integrity
    const integrity = journal.verifyChainIntegrity();
    assert.equal(integrity.valid, true);
    assert.equal(integrity.entriesVerified, 4);

    // Tampering test: simulate data tampering and ensure verification fails
    journal.entries[0].amountInCents = 999999;
    const tamperedCheck = journal.verifyChainIntegrity();
    assert.equal(tamperedCheck.valid, false);
    // restore
    journal.entries[0].amountInCents = 100000;
    assert.equal(journal.verifyChainIntegrity().valid, true);
  });

  await suite.test('BalanceService & TrialBalance: verifies ledger accounting equation', () => {
    const coa = new ChartOfAccounts();
    coa.createAccount({ id: 'VAULT', code: '1000', name: 'Vault Cash', type: AccountType.ASSET, currency: 'USD' });
    coa.createAccount({ id: 'USER_1', code: '2000', name: 'User 1 Checking', type: AccountType.LIABILITY, currency: 'USD' });
    coa.createAccount({ id: 'USER_2', code: '2001', name: 'User 2 Checking', type: AccountType.LIABILITY, currency: 'USD' });
    coa.createAccount({ id: 'FEE_INC', code: '4000', name: 'Fee Income', type: AccountType.REVENUE, currency: 'USD' });

    const journal = new JournalEngine(coa);
    const balanceService = new BalanceService(coa, journal);

    // Deposit $500
    journal.postTransaction({
      transactionId: 'TX_DEP',
      description: 'Deposit',
      currency: 'USD',
      legs: [
        { accountId: 'VAULT', direction: EntryDirection.DEBIT, amountInCents: 50000 },
        { accountId: 'USER_1', direction: EntryDirection.CREDIT, amountInCents: 50000 },
      ],
    });

    // Transfer $100 with $5 fee
    journal.postTransaction({
      transactionId: 'TX_XFER',
      description: 'Transfer with fee',
      currency: 'USD',
      legs: [
        { accountId: 'USER_1', direction: EntryDirection.DEBIT, amountInCents: 10500 },
        { accountId: 'USER_2', direction: EntryDirection.CREDIT, amountInCents: 10000 },
        { accountId: 'FEE_INC', direction: EntryDirection.CREDIT, amountInCents: 500 },
      ],
    });

    const user1Bal = balanceService.getBalance('USER_1');
    assert.equal(user1Bal.settledBalanceInCents, 39500); // $395.00
    assert.equal(user1Bal.formattedBalance, '$395.00 USD');

    const feeBal = balanceService.getBalance('FEE_INC');
    assert.equal(feeBal.settledBalanceInCents, 500); // $5.00 Revenue

    const trialBalance = balanceService.generateTrialBalance('USD');
    assert.equal(trialBalance.isBalanced, true);
    assert.equal(trialBalance.varianceInCents, 0);
  });

  await suite.test('HoldService: lifecycle (place, reduce available, capture, release)', () => {
    const coa = new ChartOfAccounts();
    coa.createAccount({ id: 'VAULT', code: '1000', name: 'Vault Cash', type: AccountType.ASSET, currency: 'USD' });
    coa.createAccount({ id: 'MERCHANT', code: '2001', name: 'Merchant Settlement', type: AccountType.LIABILITY, currency: 'USD' });
    coa.createAccount({ id: 'CARDHOLDER', code: '2002', name: 'Cardholder Checking', type: AccountType.LIABILITY, currency: 'USD' });

    const journal = new JournalEngine(coa);
    const balanceService = new BalanceService(coa, journal);
    const holdService = new HoldService(coa, journal, balanceService);

    // Initial deposit $200.00
    journal.postTransaction({
      transactionId: 'TX_FUND',
      description: 'Fund cardholder',
      currency: 'USD',
      legs: [
        { accountId: 'VAULT', direction: EntryDirection.DEBIT, amountInCents: 20000 },
        { accountId: 'CARDHOLDER', direction: EntryDirection.CREDIT, amountInCents: 20000 },
      ],
    });

    // 1. Place authorization hold of $60.00
    const hold = holdService.placeHold({
      holdId: 'HOLD_CARD_001',
      accountId: 'CARDHOLDER',
      amountInCents: 6000,
      reason: 'Hotel Pre-Auth',
    });
    assert.equal(hold.status, 'PENDING');

    // Available balance should now be $140.00 ($200 settled - $60 hold)
    const avail = holdService.getAvailableBalance('CARDHOLDER');
    assert.equal(avail.settledBalanceInCents, 20000);
    assert.equal(avail.activeHoldsInCents, 6000);
    assert.equal(avail.availableBalanceInCents, 14000);

    // Cannot place hold exceeding available balance
    assert.throws(
      () => {
        holdService.placeHold({
          holdId: 'HOLD_EXCESS',
          accountId: 'CARDHOLDER',
          amountInCents: 15000,
        });
      },
      { message: /Insufficient available funds/ }
    );

    // 2. Capture hold to settle transaction to Merchant
    const captureResult = holdService.captureHold({
      holdId: 'HOLD_CARD_001',
      destinationAccountId: 'MERCHANT',
      transactionId: 'TX_CAPTURE_001',
      description: 'Hotel Checkout Settlement',
    });
    assert.equal(captureResult.hold.status, 'CAPTURED');

    // Settled balance should now be $140.00 and merchant should have $60.00
    const finalCardholderBal = holdService.getAvailableBalance('CARDHOLDER');
    assert.equal(finalCardholderBal.settledBalanceInCents, 14000);
    assert.equal(finalCardholderBal.activeHoldsInCents, 0);

    const merchantBal = balanceService.getBalance('MERCHANT');
    assert.equal(merchantBal.settledBalanceInCents, 6000);
  });
});
