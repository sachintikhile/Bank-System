import crypto from 'node:crypto';
import { AccrualEngine, LoanClassification } from './accrual_engine.js';

export const LoanStatus = Object.freeze({
  PENDING_DISBURSAL: 'PENDING_DISBURSAL',
  ACTIVE: 'ACTIVE',
  PAID_OFF: 'PAID_OFF',
  DEFAULTED: 'DEFAULTED',
});

/**
 * Enterprise Lending & Amortization Management Engine
 */
export class LoanService {
  constructor() {
    /** @type {Map<string, Object>} */
    this.loans = new Map();
  }

  /**
   * Generates reducing-balance monthly amortization schedule
   * @param {number} principalInCents
   * @param {number} annualRatePercent
   * @param {number} tenureMonths
   */
  generateAmortizationSchedule(principalInCents, annualRatePercent, tenureMonths) {
    const P = principalInCents;
    const r = annualRatePercent / 12 / 100;
    const n = tenureMonths;

    const emiInCents = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
    const schedule = [];
    let outstanding = P;

    for (let month = 1; month <= n; month++) {
      const interestForMonth = Math.round(outstanding * r);
      const principalForMonth = emiInCents - interestForMonth;
      outstanding = Math.max(0, outstanding - principalForMonth);

      schedule.push({
        month,
        emiInCents,
        principalPortionInCents: principalForMonth,
        interestPortionInCents: interestForMonth,
        remainingPrincipalInCents: outstanding,
      });
    }

    return {
      monthlyEmiInCents: emiInCents,
      totalPaymentInCents: emiInCents * n,
      totalInterestInCents: emiInCents * n - P,
      schedule,
    };
  }

  /**
   * Originates a new loan facility
   */
  originateLoan({ customerId, accountId, principalInCents, annualRatePercent, tenureMonths }) {
    const loanId = `LN_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const amort = this.generateAmortizationSchedule(principalInCents, annualRatePercent, tenureMonths);

    const loan = {
      loanId,
      customerId,
      accountId,
      principalInCents,
      outstandingPrincipalInCents: principalInCents,
      annualRatePercent,
      tenureMonths,
      monthlyEmiInCents: amort.monthlyEmiInCents,
      accumulatedAccruedInterestInCents: 0,
      totalInterestPaidInCents: 0,
      status: LoanStatus.ACTIVE,
      classification: LoanClassification.STANDARD,
      daysPastDue: 0,
      schedule: amort.schedule,
      originatedAt: new Date().toISOString(),
    };

    this.loans.set(loanId, loan);
    return loan;
  }

  /**
   * Runs End-of-Day daily interest accrual
   * @param {string} loanId
   */
  runDailyAccrual(loanId) {
    const loan = this.loans.get(loanId);
    if (!loan || loan.status !== LoanStatus.ACTIVE) return 0;

    const dailyInterest = AccrualEngine.calculateDailyAccrual(
      loan.outstandingPrincipalInCents,
      loan.annualRatePercent
    );

    loan.accumulatedAccruedInterestInCents += dailyInterest;
    return dailyInterest;
  }

  /**
   * Processes a monthly EMI repayment
   */
  processRepayment(loanId, paymentAmountInCents) {
    const loan = this.loans.get(loanId);
    if (!loan) throw new Error(`Loan not found: ${loanId}`);

    // First settle accrued interest, then reduce principal
    const interestDue = loan.accumulatedAccruedInterestInCents;
    const interestPaid = Math.min(interestDue, paymentAmountInCents);
    const principalPaid = paymentAmountInCents - interestPaid;

    loan.accumulatedAccruedInterestInCents -= interestPaid;
    loan.totalInterestPaidInCents += interestPaid;
    loan.outstandingPrincipalInCents = Math.max(0, loan.outstandingPrincipalInCents - principalPaid);

    if (loan.outstandingPrincipalInCents === 0 && loan.accumulatedAccruedInterestInCents === 0) {
      loan.status = LoanStatus.PAID_OFF;
    }

    return {
      loanId,
      interestPaid,
      principalPaid,
      remainingOutstandingPrincipalInCents: loan.outstandingPrincipalInCents,
      status: loan.status,
    };
  }

  getLoan(loanId) {
    return this.loans.get(loanId) || null;
  }
}
