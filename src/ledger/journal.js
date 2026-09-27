import crypto from 'node:crypto';
import { EntryDirection } from './ledger.js';
import { AccountStatus } from './chart_of_accounts.js';

/**
 * Tamper-Evident Immutable Journal Posting Engine
 */
export class JournalEngine {
  /**
   * @param {import('./chart_of_accounts.js').ChartOfAccounts} chartOfAccounts
   */
  constructor(chartOfAccounts) {
    this.coa = chartOfAccounts;
    /** @type {Array<Object>} In-memory immutable audit log */
    this.entries = [];
    /** @type {string} Genesis hash of the ledger */
    this.latestBlockHash = '0000000000000000000000000000000000000000000000000000000000000000';
    /** @type {Map<string, Object>} Idempotency cache */
    this.idempotencyStore = new Map();
  }

  /**
   * Computes SHA-256 hash for entry integrity
   */
  _computeHash(entryData, prevHash) {
    const payload = JSON.stringify(entryData) + prevHash;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Posts an atomic, balanced, multi-legged transaction
   * @param {Object} params
   * @param {string} params.transactionId Unique business transaction ID
   * @param {string} [params.idempotencyKey] Unique idempotency token
   * @param {string} params.description Business narrative / memo
   * @param {string} [params.currency='USD'] Currency code
   * @param {Array<{accountId: string, direction: 'DEBIT'|'CREDIT', amountInCents: number}>} params.legs
   * @param {Object} [params.metadata={}]
   */
  postTransaction({
    transactionId,
    idempotencyKey,
    description,
    currency = 'USD',
    legs,
    metadata = {},
  }) {
    // 1. Idempotency Check
    if (idempotencyKey && this.idempotencyStore.has(idempotencyKey)) {
      const cached = this.idempotencyStore.get(idempotencyKey);
      return {
        ...cached,
        isIdempotentReplay: true,
      };
    }

    if (!legs || legs.length < 2) {
      throw new Error('Transaction requires at least two legs (one Debit and one Credit).');
    }

    let debitsTotal = 0;
    let creditsTotal = 0;

    // 2. Validate all legs & account statuses
    for (const leg of legs) {
      if (!Number.isInteger(leg.amountInCents) || leg.amountInCents <= 0) {
        throw new Error(`Leg amount must be positive integer cents. Received: ${leg.amountInCents}`);
      }

      const account = this.coa.getById(leg.accountId);
      if (!account) {
        throw new Error(`Ledger account not found: ${leg.accountId}`);
      }

      if (account.status === AccountStatus.FROZEN) {
        throw new Error(`Account ${account.id} is FROZEN. Debits/credits disallowed.`);
      }
      if (account.status === AccountStatus.CLOSED) {
        throw new Error(`Account ${account.id} is CLOSED.`);
      }

      if (account.currency !== currency.toUpperCase()) {
        throw new Error(
          `Account currency mismatch: ${account.id} is in ${account.currency}, but transaction is ${currency}`
        );
      }

      if (leg.direction === EntryDirection.DEBIT) {
        debitsTotal += leg.amountInCents;
      } else if (leg.direction === EntryDirection.CREDIT) {
        creditsTotal += leg.amountInCents;
      } else {
        throw new Error(`Invalid entry direction: ${leg.direction}`);
      }
    }

    // 3. Mathematical zero-sum double-entry rule
    if (debitsTotal !== creditsTotal) {
      throw new Error(
        `Journal entry out of balance! Debits: ${debitsTotal} != Credits: ${creditsTotal}`
      );
    }

    const postedAt = new Date().toISOString();
    const createdLegs = [];

    // 4. Record tamper-evident chained journal entries
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const entryData = {
        sequence: this.entries.length + 1,
        transactionId,
        legIndex: i + 1,
        accountId: leg.accountId,
        direction: leg.direction,
        amountInCents: leg.amountInCents,
        currency: currency.toUpperCase(),
        description,
        metadata,
        postedAt,
      };

      const blockHash = this._computeHash(entryData, this.latestBlockHash);
      const journalEntry = {
        ...entryData,
        prevBlockHash: this.latestBlockHash,
        blockHash,
      };

      this.latestBlockHash = blockHash;
      this.entries.push(journalEntry);
      createdLegs.push(journalEntry);
    }

    const receipt = {
      transactionId,
      status: 'COMMITTED',
      currency: currency.toUpperCase(),
      settledAmountInCents: debitsTotal,
      legsCount: createdLegs.length,
      latestBlockHash: this.latestBlockHash,
      postedAt,
    };

    if (idempotencyKey) {
      this.idempotencyStore.set(idempotencyKey, receipt);
    }

    return receipt;
  }

  /**
   * Verifies the entire cryptographic ledger chain for tamper detection
   * @returns {{ valid: boolean, entriesVerified: number, error?: string }}
   */
  verifyChainIntegrity() {
    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (entry.prevBlockHash !== expectedPrevHash) {
        return {
          valid: false,
          entriesVerified: i,
          error: `Broken chain at sequence ${entry.sequence}. Expected prevHash: ${expectedPrevHash}, found: ${entry.prevBlockHash}`,
        };
      }

      const { blockHash, prevBlockHash, ...entryData } = entry;
      const computed = this._computeHash(entryData, prevBlockHash);
      if (computed !== blockHash) {
        return {
          valid: false,
          entriesVerified: i,
          error: `Tampered block at sequence ${entry.sequence}! Hash mismatch.`,
        };
      }

      expectedPrevHash = blockHash;
    }

    return {
      valid: true,
      entriesVerified: this.entries.length,
    };
  }
}
