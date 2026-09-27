import crypto from 'node:crypto';
import { PaymentRailType } from './rails.js';
import { SagaState } from './saga.js';

/**
 * Unified Transaction Management Service
 */
export class TransactionService {
  /**
   * @param {Object} dependencies
   * @param {import('./saga.js').PaymentSagaOrchestrator} dependencies.sagaOrchestrator
   * @param {import('../ledger/journal.js').JournalEngine} dependencies.journalEngine
   * @param {import('../ledger/balance_service.js').BalanceService} dependencies.balanceService
   * @param {string} [dependencies.feeRevenueAccountId] Account to credit fees to
   */
  constructor({ sagaOrchestrator, journalEngine, balanceService, feeRevenueAccountId = 'ACC_REV_FEES' }) {
    this.sagaOrchestrator = sagaOrchestrator;
    this.journal = journalEngine;
    this.balanceService = balanceService;
    this.feeRevenueAccountId = feeRevenueAccountId;
    /** @type {Map<string, Object>} Idempotency token store */
    this.idempotencyTokens = new Map();
  }

  /**
   * Generates a unique traceable transaction reference
   */
  _generateReference() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TXN_${dateStr}_${rand}`;
  }

  /**
   * Initiates a funds transfer
   * @param {Object} params
   * @param {string} [params.idempotencyKey]
   * @param {string} params.sourceAccountId
   * @param {string} params.destinationAccountId
   * @param {number} params.amountInCents
   * @param {string} [params.railType='INTERNAL_P2P']
   * @param {string} [params.beneficiaryName='']
   * @param {string} [params.memo='']
   */
  async transfer({
    idempotencyKey,
    sourceAccountId,
    destinationAccountId,
    amountInCents,
    railType = PaymentRailType.INTERNAL_P2P,
    beneficiaryName = '',
    memo = '',
  }) {
    // 1. Idempotency Check
    if (idempotencyKey && this.idempotencyTokens.has(idempotencyKey)) {
      return {
        ...this.idempotencyTokens.get(idempotencyKey),
        isIdempotentReplay: true,
      };
    }

    if (!sourceAccountId || !destinationAccountId) {
      throw new Error('sourceAccountId and destinationAccountId are required.');
    }
    if (sourceAccountId === destinationAccountId) {
      throw new Error('Source and destination accounts cannot be identical.');
    }
    if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
      throw new Error('Transfer amount must be a positive integer in cents.');
    }

    const transactionId = this._generateReference();

    // 2. Execute via Payment Saga
    const sagaResult = await this.sagaOrchestrator.execute({
      sagaId: transactionId,
      sourceAccountId,
      destinationAccountId,
      amountInCents,
      railType,
      beneficiaryName,
      memo,
    });

    const receipt = {
      transactionId,
      idempotencyKey,
      sourceAccountId,
      destinationAccountId,
      amountInCents,
      railType,
      memo,
      status: sagaResult.success ? 'SETTLED' : 'FAILED',
      railReference: sagaResult.railReference || null,
      error: sagaResult.error || null,
      sagaState: sagaResult.state,
      timestamp: new Date().toISOString(),
    };

    if (idempotencyKey) {
      this.idempotencyTokens.set(idempotencyKey, receipt);
    }

    return receipt;
  }

  /**
   * Retrieves transaction ledger history for an account
   * @param {string} accountId
   * @param {Object} [options]
   * @param {number} [options.limit=50]
   */
  getAccountHistory(accountId, options = {}) {
    const limit = options.limit || 50;
    const entries = this.journal.entries
      .filter((e) => e.accountId === accountId)
      .slice(-limit)
      .reverse();

    return {
      accountId,
      totalEntries: entries.length,
      history: entries.map((entry) => ({
        sequence: entry.sequence,
        transactionId: entry.transactionId,
        direction: entry.direction,
        amountInCents: entry.amountInCents,
        currency: entry.currency,
        description: entry.description,
        postedAt: entry.postedAt,
        blockHash: entry.blockHash,
      })),
    };
  }
}
