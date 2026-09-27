import test from 'node:test';
import assert from 'node:assert/strict';
import { Account, AccountType } from '../src/ledger/account.js';
import { LedgerEngine, EntryDirection } from '../src/ledger/ledger.js';

test('Double-Entry Ledger Engine Suite', async (t) => {
  await t.test('enforces balanced debits and credits', () => {
    const ledger = new LedgerEngine();
    const vault = ledger.registerAccount(new Account({ id: 'VAULT', name: 'Vault', type: AccountType.ASSET }));
    const customer = ledger.registerAccount(new Account({ id: 'CUST', name: 'Customer', type: AccountType.LIABILITY }));

    // Unbalanced transaction should fail
    assert.throws(
      () => {
        ledger.postTransaction({
          transactionId: 'TX_FAIL',
          description: 'Unbalanced post',
          entries: [
            { accountId: vault.id, direction: EntryDirection.DEBIT, amountInCents: 5000 },
            { accountId: customer.id, direction: EntryDirection.CREDIT, amountInCents: 4000 },
          ],
        });
      },
      {
        message: /Double-entry imbalance!/,
      }
    );
  });

  await t.test('updates account balances accurately with zero floating point drift', () => {
    const ledger = new LedgerEngine();
    const vault = ledger.registerAccount(new Account({ id: 'VAULT', name: 'Vault', type: AccountType.ASSET }));
    const alice = ledger.registerAccount(new Account({ id: 'ALICE', name: 'Alice', type: AccountType.LIABILITY }));
    const bob = ledger.registerAccount(new Account({ id: 'BOB', name: 'Bob', type: AccountType.LIABILITY }));

    // Deposit $100.50
    ledger.postTransaction({
      transactionId: 'TX_1',
      description: 'Deposit',
      entries: [
        { accountId: vault.id, direction: EntryDirection.DEBIT, amountInCents: 10050 },
        { accountId: alice.id, direction: EntryDirection.CREDIT, amountInCents: 10050 },
      ],
    });

    assert.equal(ledger.getAccountBalance(alice.id).balance, '100.50');
    assert.equal(ledger.getAccountBalance(vault.id).balance, '100.50');

    // Transfer $30.25 to Bob
    ledger.postTransaction({
      transactionId: 'TX_2',
      description: 'Transfer',
      entries: [
        { accountId: alice.id, direction: EntryDirection.DEBIT, amountInCents: 3025 },
        { accountId: bob.id, direction: EntryDirection.CREDIT, amountInCents: 3025 },
      ],
    });

    assert.equal(ledger.getAccountBalance(alice.id).balance, '70.25');
    assert.equal(ledger.getAccountBalance(bob.id).balance, '30.25');
  });

  await t.test('guarantees idempotency on duplicate transaction submission', () => {
    const ledger = new LedgerEngine();
    const vault = ledger.registerAccount(new Account({ id: 'VAULT', name: 'Vault', type: AccountType.ASSET }));
    const alice = ledger.registerAccount(new Account({ id: 'ALICE', name: 'Alice', type: AccountType.LIABILITY }));

    const postParams = {
      transactionId: 'TX_IDEMPOTENT',
      idempotencyKey: 'key_12345',
      description: 'Deposit',
      entries: [
        { accountId: vault.id, direction: EntryDirection.DEBIT, amountInCents: 5000 },
        { accountId: alice.id, direction: EntryDirection.CREDIT, amountInCents: 5000 },
      ],
    };

    const firstResult = ledger.postTransaction(postParams);
    assert.equal(firstResult.status, 'SETTLED');
    assert.equal(ledger.getAccountBalance(alice.id).balanceInCents, 5000);

    // Replay same request
    const secondResult = ledger.postTransaction(postParams);
    assert.equal(secondResult.idempotentReplay, true);
    assert.equal(ledger.getAccountBalance(alice.id).balanceInCents, 5000); // Balance should NOT double
  });
});
