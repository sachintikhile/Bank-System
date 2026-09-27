import { EntryDirection } from './ledger.js';

export const HoldStatus = Object.freeze({
  PENDING: 'PENDING',
  CAPTURED: 'CAPTURED',
  RELEASED: 'RELEASED',
  EXPIRED: 'EXPIRED',
});

/**
 * Account Holds & Fund Reservation Engine
 */
export class HoldService {
  /**
   * @param {import('./chart_of_accounts.js').ChartOfAccounts} chartOfAccounts
   * @param {import('./journal.js').JournalEngine} journalEngine
   * @param {import('./balance_service.js').BalanceService} balanceService
   */
  constructor(chartOfAccounts, journalEngine, balanceService) {
    this.coa = chartOfAccounts;
    this.journal = journalEngine;
    this.balanceService = balanceService;
    /** @type {Map<string, Object>} */
    this.holds = new Map();
  }

  /**
   * Calculates current available balance after deducting active holds
   * @param {string} accountId
   */
  getAvailableBalance(accountId) {
    const settled = this.balanceService.getBalance(accountId);
    let activeHoldCents = 0;
    const now = new Date().toISOString();

    for (const hold of this.holds.values()) {
      if (hold.accountId === accountId && hold.status === HoldStatus.PENDING) {
        if (hold.expiresAt && hold.expiresAt < now) {
          hold.status = HoldStatus.EXPIRED;
          continue;
        }
        activeHoldCents += hold.amountInCents;
      }
    }

    const availableCents = settled.settledBalanceInCents - activeHoldCents;
    return {
      accountId,
      currency: settled.currency,
      settledBalanceInCents: settled.settledBalanceInCents,
      activeHoldsInCents: activeHoldCents,
      availableBalanceInCents: availableCents,
      formattedSettled: settled.formattedBalance,
    };
  }

  /**
   * Places a temporary hold (fund reservation) on an account
   * @param {Object} params
   * @param {string} params.holdId
   * @param {string} params.accountId
   * @param {number} params.amountInCents
   * @param {string} [params.reason='']
   * @param {number} [params.expiresInMinutes=30]
   */
  placeHold({ holdId, accountId, amountInCents, reason = '', expiresInMinutes = 30 }) {
    if (this.holds.has(holdId)) {
      throw new Error(`Hold already exists with ID: ${holdId}`);
    }
    if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
      throw new Error('Hold amount must be positive integer cents.');
    }

    const available = this.getAvailableBalance(accountId);
    if (available.availableBalanceInCents < amountInCents) {
      throw new Error(
        `Insufficient available funds! Available: ${available.availableBalanceInCents} cents, Requested hold: ${amountInCents} cents.`
      );
    }

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    const hold = {
      holdId,
      accountId,
      amountInCents,
      reason,
      status: HoldStatus.PENDING,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    this.holds.set(holdId, hold);
    return hold;
  }

  /**
   * Captures the hold into a settled journal posting
   * @param {Object} params
   * @param {string} params.holdId
   * @param {string} params.destinationAccountId
   * @param {string} params.transactionId
   * @param {string} [params.description='']
   */
  captureHold({ holdId, destinationAccountId, transactionId, description = '' }) {
    const hold = this.holds.get(holdId);
    if (!hold) throw new Error(`Hold not found: ${holdId}`);
    if (hold.status !== HoldStatus.PENDING) {
      throw new Error(`Cannot capture hold in state: ${hold.status}`);
    }

    // Debit source account, Credit destination account
    const sourceAccount = this.coa.getById(hold.accountId);
    const destinationAccount = this.coa.getById(destinationAccountId);

    if (!sourceAccount || !destinationAccount) {
      throw new Error('Source or destination account missing.');
    }

    const journalReceipt = this.journal.postTransaction({
      transactionId,
      description: description || `Capture hold ${holdId}: ${hold.reason}`,
      currency: sourceAccount.currency,
      legs: [
        {
          accountId: hold.accountId,
          direction: EntryDirection.DEBIT,
          amountInCents: hold.amountInCents,
        },
        {
          accountId: destinationAccountId,
          direction: EntryDirection.CREDIT,
          amountInCents: hold.amountInCents,
        },
      ],
    });

    hold.status = HoldStatus.CAPTURED;
    hold.capturedAt = new Date().toISOString();
    hold.settledTransactionId = transactionId;

    return {
      hold,
      journalReceipt,
    };
  }

  /**
   * Releases an active hold without debiting settled funds
   * @param {string} holdId
   * @param {string} [reason='']
   */
  releaseHold(holdId, reason = '') {
    const hold = this.holds.get(holdId);
    if (!hold) throw new Error(`Hold not found: ${holdId}`);
    if (hold.status !== HoldStatus.PENDING) {
      throw new Error(`Cannot release hold in state: ${hold.status}`);
    }

    hold.status = HoldStatus.RELEASED;
    hold.releasedAt = new Date().toISOString();
    hold.releaseReason = reason;

    return hold;
  }
}
