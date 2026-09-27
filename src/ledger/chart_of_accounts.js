import { AccountType } from './account.js';
import { Currencies } from './currencies.js';

/**
 * Account operational status
 */
export const AccountStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  FROZEN: 'FROZEN',
  DORMANT: 'DORMANT',
  CLOSED: 'CLOSED',
});

/**
 * Chart of Accounts (COA) Model
 */
export class ChartOfAccounts {
  constructor() {
    /** @type {Map<string, Object>} Keyed by accountId */
    this.accountsById = new Map();
    /** @type {Map<string, Object>} Keyed by hierarchical code path (e.g. 1000.01) */
    this.accountsByCode = new Map();
  }

  /**
   * Defines a standard ledger account in the chart of accounts
   * @param {Object} params
   * @param {string} params.id
   * @param {string} params.code Hierarchical COA classification (e.g., "1000.10.01")
   * @param {string} params.name
   * @param {keyof typeof AccountType} params.type
   * @param {string} [params.currency='USD']
   * @param {string} [params.description='']
   * @param {string} [params.customerId=null]
   * @param {string} [params.parentCode=null]
   */
  createAccount({
    id,
    code,
    name,
    type,
    currency = 'USD',
    description = '',
    customerId = null,
    parentCode = null,
  }) {
    if (!AccountType[type]) {
      throw new Error(`Unsupported account type: ${type}`);
    }
    if (!Currencies[currency.toUpperCase()]) {
      throw new Error(`Invalid or unsupported currency: ${currency}`);
    }
    if (this.accountsById.has(id)) {
      throw new Error(`Account already exists with ID: ${id}`);
    }
    if (this.accountsByCode.has(code)) {
      throw new Error(`Account code already registered: ${code}`);
    }

    const account = {
      id,
      code,
      name,
      type,
      currency: currency.toUpperCase(),
      description,
      customerId,
      parentCode,
      status: AccountStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.accountsById.set(id, account);
    this.accountsByCode.set(code, account);
    return account;
  }

  getById(id) {
    return this.accountsById.get(id) || null;
  }

  getByCode(code) {
    return this.accountsByCode.get(code) || null;
  }

  updateStatus(id, newStatus) {
    const account = this.getById(id);
    if (!account) throw new Error(`Account not found: ${id}`);
    if (!AccountStatus[newStatus]) throw new Error(`Invalid status: ${newStatus}`);
    account.status = newStatus;
    account.updatedAt = new Date().toISOString();
    return account;
  }

  listAccounts(filter = {}) {
    let list = Array.from(this.accountsById.values());
    if (filter.type) list = list.filter((a) => a.type === filter.type);
    if (filter.currency) list = list.filter((a) => a.currency === filter.currency);
    if (filter.customerId) list = list.filter((a) => a.customerId === filter.customerId);
    if (filter.status) list = list.filter((a) => a.status === filter.status);
    return list;
  }
}
