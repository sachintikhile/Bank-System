import { AccountType } from './account.js';

export const EntryDirection = Object.freeze({
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
});

/**
 * Immutable Double-Entry Ledger Engine
 */
export class LedgerEngine {
  constructor() {
    /** @type {Map<string, import('./account.js').Account>} */
    this.accounts = new Map();
    /** @type {Array<Object>} */
    this.journalEntries = [];
    /** @type {Map<string, Object>} */
    this.processedIdempotencyKeys = new Map();
  }

  /**
   * Registers a new account into the chart of accounts
   * @param {import('./account.js').Account} account
   */
  registerAccount(account) {
    if (this.accounts.has(account.id)) {
      throw new Error(`Account already exists with ID: ${account.id}`);
    }
    this.accounts.set(account.id, account);
    return account;
  }

  /**
   * Records an immutable multi-legged journal transaction
   * @param {Object} params
   * @param {string} params.transactionId Unique Transaction Reference
   * @param {string} params.idempotencyKey Client idempotency key
   * @param {string} params.description Memo/Description
   * @param {Array<{accountId: string, direction: 'DEBIT'|'CREDIT', amountInCents: number}>} params.entries
   */
  postTransaction({ transactionId, idempotencyKey, description, entries }) {
    // 1. Idempotency Check
    if (idempotencyKey && this.processedIdempotencyKeys.has(idempotencyKey)) {
      return {
        idempotentReplay: true,
        ...this.processedIdempotencyKeys.get(idempotencyKey),
      };
    }

    if (!entries || entries.length < 2) {
      throw new Error('A transaction must have at least two legs (one Debit and one Credit).');
    }

    let totalDebits = 0;
    let totalCredits = 0;

    // 2. Validate accounts and amounts
    for (const entry of entries) {
      if (!Number.isInteger(entry.amountInCents) || entry.amountInCents <= 0) {
        throw new Error(`Amount must be a positive integer in cents. Received: ${entry.amountInCents}`);
      }
      if (!this.accounts.has(entry.accountId)) {
        throw new Error(`Account ${entry.accountId} does not exist in chart of accounts.`);
      }

      if (entry.direction === EntryDirection.DEBIT) {
        totalDebits += entry.amountInCents;
      } else if (entry.direction === EntryDirection.CREDIT) {
        totalCredits += entry.amountInCents;
      } else {
        throw new Error(`Invalid entry direction: ${entry.direction}`);
      }
    }

    // 3. Double-entry enforcement (Debits == Credits)
    if (totalDebits !== totalCredits) {
      throw new Error(
        `Double-entry imbalance! Total Debits (${totalDebits}) must equal Total Credits (${totalCredits}).`
      );
    }

    const timestamp = new Date().toISOString();
    const recordedEntries = entries.map((entry, index) => ({
      id: `${transactionId}-${index + 1}`,
      transactionId,
      accountId: entry.accountId,
      direction: entry.direction,
      amountInCents: entry.amountInCents,
      timestamp,
    }));

    // 4. Commit to immutable journal
    this.journalEntries.push(...recordedEntries);

    const result = {
      transactionId,
      description,
      status: 'SETTLED',
      totalAmountInCents: totalDebits,
      timestamp,
      entriesCount: recordedEntries.length,
    };

    if (idempotencyKey) {
      this.processedIdempotencyKeys.set(idempotencyKey, result);
    }

    return result;
  }

  /**
   * Calculates the current balance of an account in cents
   * @param {string} accountId
   * @returns {{ balanceInCents: number, formatted: string, currency: string }}
   */
  getAccountBalance(accountId) {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    let debits = 0;
    let credits = 0;

    for (const entry of this.journalEntries) {
      if (entry.accountId === accountId) {
        if (entry.direction === EntryDirection.DEBIT) {
          debits += entry.amountInCents;
        } else {
          credits += entry.amountInCents;
        }
      }
    }

    // Normal balance accounting rules:
    // Assets & Expenses increase with Debit, decrease with Credit.
    // Liabilities, Equity & Revenue increase with Credit, decrease with Debit.
    let balanceInCents = 0;
    if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
      balanceInCents = debits - credits;
    } else {
      balanceInCents = credits - debits;
    }

    return {
      accountId,
      accountName: account.name,
      accountType: account.type,
      currency: account.currency,
      balanceInCents,
      balance: (balanceInCents / 100).toFixed(2),
    };
  }
}
