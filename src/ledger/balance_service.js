import { AccountType } from './account.js';
import { EntryDirection } from './ledger.js';
import { Currencies } from './currencies.js';

/**
 * Balance Aggregation & Trial Balance Reconciliation Service
 */
export class BalanceService {
  /**
   * @param {import('./chart_of_accounts.js').ChartOfAccounts} chartOfAccounts
   * @param {import('./journal.js').JournalEngine} journalEngine
   */
  constructor(chartOfAccounts, journalEngine) {
    this.coa = chartOfAccounts;
    this.journal = journalEngine;
  }

  /**
   * Computes the current settled balance for an account
   * @param {string} accountId
   * @param {Object} [options]
   * @param {string} [options.asOfTimestamp] Point-in-time balance filter
   */
  getBalance(accountId, options = {}) {
    const account = this.coa.getById(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of this.journal.entries) {
      if (entry.accountId === accountId) {
        if (options.asOfTimestamp && entry.postedAt > options.asOfTimestamp) {
          continue;
        }
        if (entry.direction === EntryDirection.DEBIT) {
          totalDebits += entry.amountInCents;
        } else {
          totalCredits += entry.amountInCents;
        }
      }
    }

    // Normal balance calculation rules:
    // ASSET & EXPENSE: Normal Debit (Balance = Debits - Credits)
    // LIABILITY, EQUITY & REVENUE: Normal Credit (Balance = Credits - Debits)
    let netCents = 0;
    if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
      netCents = totalDebits - totalCredits;
    } else {
      netCents = totalCredits - totalDebits;
    }

    const cur = Currencies[account.currency] || { minorUnits: 2, symbol: '$' };
    const factor = 10 ** cur.minorUnits;
    const decimalFormatted = (netCents / factor).toFixed(cur.minorUnits);

    return {
      accountId,
      accountName: account.name,
      accountCode: account.code,
      accountType: account.type,
      currency: account.currency,
      debitsInCents: totalDebits,
      creditsInCents: totalCredits,
      settledBalanceInCents: netCents,
      formattedBalance: `${cur.symbol}${decimalFormatted} ${account.currency}`,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a Trial Balance across all accounts in a given currency
   * Verifies that the General Ledger is in mathematical equilibrium.
   * @param {string} [currency='USD']
   */
  generateTrialBalance(currency = 'USD') {
    const accounts = this.coa.listAccounts({ currency: currency.toUpperCase() });
    const lineItems = [];
    let grandTotalDebits = 0;
    let grandTotalCredits = 0;

    for (const acc of accounts) {
      const bal = this.getBalance(acc.id);
      lineItems.push({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debitCents: bal.debitsInCents,
        creditCents: bal.creditsInCents,
        netBalanceCents: bal.settledBalanceInCents,
        formattedBalance: bal.formattedBalance,
      });

      grandTotalDebits += bal.debitsInCents;
      grandTotalCredits += bal.creditsInCents;
    }

    const cur = Currencies[currency.toUpperCase()] || { minorUnits: 2, symbol: '$' };
    const factor = 10 ** cur.minorUnits;

    const isBalanced = grandTotalDebits === grandTotalCredits;

    return {
      currency: currency.toUpperCase(),
      lineItems,
      totalDebitsInCents: grandTotalDebits,
      totalCreditsInCents: grandTotalCredits,
      formattedTotalDebits: `${cur.symbol}${(grandTotalDebits / factor).toFixed(cur.minorUnits)}`,
      formattedTotalCredits: `${cur.symbol}${(grandTotalCredits / factor).toFixed(cur.minorUnits)}`,
      isBalanced,
      varianceInCents: Math.abs(grandTotalDebits - grandTotalCredits),
      generatedAt: new Date().toISOString(),
    };
  }
}
