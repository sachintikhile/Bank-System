import { FraudAction } from './fraud_engine.js';

export const SagaState = Object.freeze({
  INITIATED: 'INITIATED',
  RISK_EVALUATED: 'RISK_EVALUATED',
  FUNDS_RESERVED: 'FUNDS_RESERVED',
  DISPATCHED_TO_RAIL: 'DISPATCHED_TO_RAIL',
  COMPLETED: 'COMPLETED',
  COMPENSATING: 'COMPENSATING',
  ROLLED_BACK: 'ROLLED_BACK',
  FAILED: 'FAILED',
});

/**
 * Distributed Transaction Saga Orchestrator
 */
export class PaymentSagaOrchestrator {
  /**
   * @param {Object} dependencies
   * @param {import('../ledger/hold_service.js').HoldService} dependencies.holdService
   * @param {import('../ledger/journal.js').JournalEngine} dependencies.journalEngine
   * @param {import('./fraud_engine.js').FraudEngine} dependencies.fraudEngine
   * @param {import('./rails.js').PaymentRailRouter} dependencies.railRouter
   */
  constructor({ holdService, journalEngine, fraudEngine, railRouter }) {
    this.holdService = holdService;
    this.journal = journalEngine;
    this.fraudEngine = fraudEngine;
    this.railRouter = railRouter;
    /** @type {Map<string, Object>} */
    this.sagaInstances = new Map();
  }

  /**
   * Executes the full payment saga pipeline
   * @param {Object} paymentParams
   * @param {string} paymentParams.sagaId
   * @param {string} paymentParams.sourceAccountId
   * @param {string} paymentParams.destinationAccountId
   * @param {number} paymentParams.amountInCents
   * @param {string} [paymentParams.railType='INTERNAL_P2P']
   * @param {string} [paymentParams.beneficiaryName='']
   * @param {string} [paymentParams.memo='']
   */
  async execute(paymentParams) {
    const {
      sagaId,
      sourceAccountId,
      destinationAccountId,
      amountInCents,
      railType = 'INTERNAL_P2P',
      beneficiaryName = '',
      memo = '',
    } = paymentParams;

    const saga = {
      sagaId,
      state: SagaState.INITIATED,
      sourceAccountId,
      destinationAccountId,
      amountInCents,
      railType,
      holdId: null,
      railReference: null,
      journalReceipt: null,
      error: null,
      history: [{ state: SagaState.INITIATED, timestamp: new Date().toISOString() }],
    };
    this.sagaInstances.set(sagaId, saga);

    const transition = (newState, extra = {}) => {
      saga.state = newState;
      saga.history.push({ state: newState, timestamp: new Date().toISOString(), ...extra });
    };

    try {
      // Step 1: Fraud & Risk Screening
      const riskAssessment = this.fraudEngine.evaluate({
        sourceAccountId,
        destinationAccountId,
        amountInCents,
        beneficiaryName,
        memo,
      });

      transition(SagaState.RISK_EVALUATED, { riskAssessment });

      if (riskAssessment.action === FraudAction.REJECT) {
        throw new Error(
          `Payment blocked by Fraud Engine: ${riskAssessment.triggeredRules.join('; ')}`
        );
      }
      if (riskAssessment.action === FraudAction.CHALLENGE) {
        throw new Error('Payment requires step-up MFA challenge authorization.');
      }

      // Step 2: Reserve Funds (Place Authorization Hold)
      const holdId = `HOLD_${sagaId}`;
      const hold = this.holdService.placeHold({
        holdId,
        accountId: sourceAccountId,
        amountInCents,
        reason: `Pending transfer: ${memo || sagaId}`,
      });
      saga.holdId = holdId;
      transition(SagaState.FUNDS_RESERVED, { holdId });

      // Step 3: Dispatch to Payment Rail
      const adapter = this.railRouter.getAdapter(railType);
      transition(SagaState.DISPATCHED_TO_RAIL, { rail: railType });

      const railResponse = await adapter.dispatch({
        transactionId: sagaId,
        sourceAccountId,
        destinationAccountId,
        amountInCents,
        beneficiaryName,
      });

      if (!railResponse.success) {
        throw new Error(`Rail settlement rejected: ${railResponse.failureReason || 'Unknown error'}`);
      }
      saga.railReference = railResponse.railReference;

      // Step 4: Commit Settlement (Capture Hold & Post Double-Entry Journal)
      const captureResult = this.holdService.captureHold({
        holdId,
        destinationAccountId,
        transactionId: sagaId,
        description: memo || `Transfer ${sagaId} via ${railType}`,
      });
      saga.journalReceipt = captureResult.journalReceipt;

      transition(SagaState.COMPLETED, {
        railReference: saga.railReference,
        settledAmountInCents: amountInCents,
      });

      return {
        success: true,
        sagaId,
        state: SagaState.COMPLETED,
        railReference: saga.railReference,
        journalReceipt: saga.journalReceipt,
      };
    } catch (err) {
      // Compensating Transaction (Rollback)
      transition(SagaState.COMPENSATING, { reason: err.message });

      if (saga.holdId) {
        try {
          this.holdService.releaseHold(
            saga.holdId,
            `Compensating rollback due to error: ${err.message}`
          );
        } catch (rollbackErr) {
          console.error(`Rollback error on hold ${saga.holdId}:`, rollbackErr);
        }
      }

      transition(SagaState.ROLLED_BACK, { errorMessage: err.message });
      saga.error = err.message;

      return {
        success: false,
        sagaId,
        state: SagaState.ROLLED_BACK,
        error: err.message,
      };
    }
  }

  getSaga(sagaId) {
    return this.sagaInstances.get(sagaId) || null;
  }
}
