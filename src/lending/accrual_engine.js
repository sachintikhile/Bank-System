/**
 * Loan Performance Classification based on Days Past Due (DPD)
 */
export const LoanClassification = Object.freeze({
  STANDARD: 'STANDARD',       // 0 DPD
  WATCHLIST_SMA0: 'SMA_0',    // 1-30 DPD
  SUBSTANDARD_SMA1: 'SMA_1',  // 31-60 DPD
  DOUBTFUL_SMA2: 'SMA_2',     // 61-90 DPD
  NPA_DEFAULT: 'NPA_DEFAULT', // > 90 DPD
});

/**
 * Daily End-of-Day (EOD) Interest Accrual Engine
 */
export class AccrualEngine {
  /**
   * Calculates daily accrued interest in minor cents using standard 365-day year
   * @param {number} principalInCents
   * @param {number} annualRatePercent e.g. 7.5 for 7.5%
   * @returns {number} Daily interest in cents (rounded)
   */
  static calculateDailyAccrual(principalInCents, annualRatePercent) {
    if (principalInCents <= 0 || annualRatePercent <= 0) return 0;
    const annualRateFraction = annualRatePercent / 100;
    const dailyInterest = (principalInCents * annualRateFraction) / 365;
    return Math.round(dailyInterest);
  }

  /**
   * Evaluates loan health based on days past due
   * @param {number} daysPastDue
   * @returns {string}
   */
  static classifyLoan(daysPastDue) {
    if (daysPastDue <= 0) return LoanClassification.STANDARD;
    if (daysPastDue <= 30) return LoanClassification.WATCHLIST_SMA0;
    if (daysPastDue <= 60) return LoanClassification.SUBSTANDARD_SMA1;
    if (daysPastDue <= 90) return LoanClassification.DOUBTFUL_SMA2;
    return LoanClassification.NPA_DEFAULT;
  }
}
