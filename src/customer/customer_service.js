import crypto from 'node:crypto';
import { KycStatus, RiskTier } from './kyc.js';

/**
 * Customer Master (CIF) & Identity Management Engine
 */
export class CustomerService {
  constructor() {
    /** @type {Map<string, Object>} */
    this.customers = new Map();
    /** @type {Set<string>} Sanctioned names list */
    this.sanctionedNames = new Set(['VLADIMIR_BAD_ACTOR', 'ILLEGAL_FRONT_CORP']);
  }

  _generateCifNumber() {
    const num = crypto.randomInt(10000000, 99999999);
    return `CIF-${num}`;
  }

  /**
   * Registers a new banking customer
   * @param {Object} params
   * @param {string} params.firstName
   * @param {string} params.lastName
   * @param {string} params.email
   * @param {string} [params.taxId]
   */
  registerCustomer({ firstName, lastName, email, taxId = '' }) {
    const fullName = `${firstName} ${lastName}`.trim();
    const normalized = fullName.toUpperCase().replace(/\s+/g, '_');

    // Watchlist & Sanctions Screening
    if (this.sanctionedNames.has(normalized)) {
      throw new Error(`Onboarding rejected: Name "${fullName}" matched international sanction blocklist.`);
    }

    const id = `CUST_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const cifNumber = this._generateCifNumber();

    const customer = {
      id,
      cifNumber,
      firstName,
      lastName,
      fullName,
      email,
      taxId,
      kycStatus: KycStatus.PENDING,
      riskTier: RiskTier.TIER_2.code,
      documents: [],
      createdAt: new Date().toISOString(),
      verifiedAt: null,
    };

    this.customers.set(id, customer);
    return customer;
  }

  /**
   * Submits identity document for KYC verification
   * @param {string} customerId
   * @param {Object} doc
   * @param {string} doc.type ('PASSPORT'|'DRIVERS_LICENSE'|'NATIONAL_ID')
   * @param {string} doc.number
   */
  submitKycDocument(customerId, doc) {
    const customer = this.customers.get(customerId);
    if (!customer) throw new Error(`Customer not found: ${customerId}`);

    customer.documents.push({
      ...doc,
      submittedAt: new Date().toISOString(),
    });

    // Automated verification rule simulation
    if (doc.number && doc.number.length >= 6) {
      customer.kycStatus = KycStatus.VERIFIED;
      customer.verifiedAt = new Date().toISOString();
      customer.riskTier = RiskTier.TIER_1.code;
    }

    return customer;
  }

  getCustomer(customerId) {
    return this.customers.get(customerId) || null;
  }
}
