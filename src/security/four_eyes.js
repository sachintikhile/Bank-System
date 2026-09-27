import crypto from 'node:crypto';

export const ApprovalStatus = Object.freeze({
  PENDING_CHECKER: 'PENDING_CHECKER',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

/**
 * Maker-Checker / Four-Eyes Dual Authorization Engine
 */
export class FourEyesService {
  constructor(thresholdInCents = 2500000) { // $25,000.00
    this.thresholdInCents = thresholdInCents;
    /** @type {Map<string, Object>} */
    this.requests = new Map();
  }

  /**
   * Evaluates if an operation requires Maker-Checker dual authorization
   * @param {number} amountInCents
   * @param {string} actionType
   */
  requiresDualApproval(amountInCents, actionType = 'TRANSFER') {
    if (actionType === 'ACCOUNT_UNFREEZE' || actionType === 'LOAN_WRITEOFF') {
      return true;
    }
    return amountInCents >= this.thresholdInCents;
  }

  /**
   * Initiates a dual approval workflow (Maker step)
   * @param {Object} params
   * @param {string} params.makerUserId
   * @param {string} params.actionType
   * @param {number} params.amountInCents
   * @param {Object} params.payload
   */
  submitRequest({ makerUserId, actionType, amountInCents, payload }) {
    const requestId = `APPROVAL_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const request = {
      requestId,
      makerUserId,
      actionType,
      amountInCents,
      payload,
      status: ApprovalStatus.PENDING_CHECKER,
      checkerUserId: null,
      submittedAt: new Date().toISOString(),
      decidedAt: null,
      decisionReason: null,
    };

    this.requests.set(requestId, request);
    return request;
  }

  /**
   * Approves or rejects the request (Checker step)
   * Enforces that the Checker CANNOT be the same user as the Maker!
   * @param {Object} params
   * @param {string} params.requestId
   * @param {string} params.checkerUserId
   * @param {boolean} params.approved
   * @param {string} [params.reason='']
   */
  decideRequest({ requestId, checkerUserId, approved, reason = '' }) {
    const request = this.requests.get(requestId);
    if (!request) throw new Error(`Approval request not found: ${requestId}`);
    if (request.status !== ApprovalStatus.PENDING_CHECKER) {
      throw new Error(`Request has already been processed: ${request.status}`);
    }

    // Critical Four-Eyes Principle Enforcement: Maker != Checker
    if (request.makerUserId === checkerUserId) {
      throw new Error(
        'Dual authorization violation! The Checker cannot be the same user as the Maker (Four-Eyes Principle).'
      );
    }

    request.checkerUserId = checkerUserId;
    request.status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    request.decidedAt = new Date().toISOString();
    request.decisionReason = reason;

    return request;
  }

  getRequest(requestId) {
    return this.requests.get(requestId) || null;
  }
}
