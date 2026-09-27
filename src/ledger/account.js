/**
 * Standard Account Types in Financial Accounting
 */
export const AccountType = Object.freeze({
  ASSET: 'ASSET',         // Normal balance: DEBIT (Cash, Loans receivable)
  LIABILITY: 'LIABILITY', // Normal balance: CREDIT (Customer deposits, Borrowings)
  EQUITY: 'EQUITY',       // Normal balance: CREDIT (Bank capital, Retained earnings)
  REVENUE: 'REVENUE',     // Normal balance: CREDIT (Interest income, Fees)
  EXPENSE: 'EXPENSE',     // Normal balance: DEBIT (Interest expense, Operational costs)
});

/**
 * Represents a Financial Ledger Account
 */
export class Account {
  /**
   * @param {Object} params
   * @param {string} params.id Unique Account Identifier
   * @param {string} params.name Descriptive Account Name
   * @param {keyof typeof AccountType} params.type Account classification
   * @param {string} [params.currency='USD'] ISO-4217 Currency Code
   * @param {string} [params.customerId=null] Associated Customer ID (optional)
   */
  constructor({ id, name, type, currency = 'USD', customerId = null }) {
    if (!AccountType[type]) {
      throw new Error(`Invalid Account Type: ${type}`);
    }
    this.id = id;
    this.name = name;
    this.type = type;
    this.currency = currency.toUpperCase();
    this.customerId = customerId;
    this.createdAt = new Date().toISOString();
  }
}
