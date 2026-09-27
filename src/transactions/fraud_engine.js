/**
 * Risk Assessment Decisions
 */
export const FraudAction = Object.freeze({
  APPROVE: 'APPROVE',
  CHALLENGE: 'CHALLENGE', // Requires Step-Up Multi-Factor Authentication
  REJECT: 'REJECT',
});

/**
 * Real-Time Fraud & Velocity Risk Engine
 */
export class FraudEngine {
  /**
   * @param {Object} [config]
   * @param {number} [config.highValueThresholdInCents=500000] // $5,000.00
   * @param {number} [config.hardBlockThresholdInCents=5000000] // $50,000.00
   * @param {number} [config.maxVelocityPerWindow=5]
   * @param {number} [config.velocityWindowMinutes=10]
   */
  constructor(config = {}) {
    this.highValueThreshold = config.highValueThresholdInCents || 500000;
    this.hardBlockThreshold = config.hardBlockThresholdInCents || 5000000;
    this.maxVelocity = config.maxVelocityPerWindow || 5;
    this.velocityWindowMs = (config.velocityWindowMinutes || 10) * 60 * 1000;

    /** @type {Set<string>} Sanctioned entity names / keywords */
    this.sanctionedKeywords = new Set([
      'TERROR',
      'SANCTIONED_ENTITY_LTD',
      'ILLICIT_LAUNDERING',
      'PROHIBITED_CORP',
    ]);

    /** @type {Map<string, Array<number>>} accountId -> timestamps of recent transfers */
    this.accountVelocityHistory = new Map();
  }

  /**
   * Adds a keyword to real-time sanction list
   * @param {string} keyword
   */
  addSanctionedKeyword(keyword) {
    this.sanctionedKeywords.add(keyword.toUpperCase());
  }

  /**
   * Evaluates a transfer for fraud risk
   * @param {Object} params
   * @param {string} params.sourceAccountId
   * @param {string} params.destinationAccountId
   * @param {number} params.amountInCents
   * @param {string} [params.beneficiaryName='']
   * @param {string} [params.memo='']
   * @returns {{ action: 'APPROVE'|'CHALLENGE'|'REJECT', riskScore: number, triggeredRules: Array<string> }}
   */
  evaluate({ sourceAccountId, destinationAccountId, amountInCents, beneficiaryName = '', memo = '' }) {
    let riskScore = 0;
    const triggeredRules = [];
    const now = Date.now();

    // 1. Sanctions & Watchlist Check
    const combinedText = `${beneficiaryName} ${memo}`.toUpperCase();
    for (const blocked of this.sanctionedKeywords) {
      if (combinedText.includes(blocked)) {
        riskScore = 100;
        triggeredRules.push(`RULE_SANCTION_MATCH: Matched restricted keyword "${blocked}"`);
        return {
          action: FraudAction.REJECT,
          riskScore,
          triggeredRules,
          evaluatedAt: new Date().toISOString(),
        };
      }
    }

    // 2. Hard block ceiling limit
    if (amountInCents >= this.hardBlockThreshold) {
      riskScore = 95;
      triggeredRules.push(
        `RULE_HARD_LIMIT_EXCEEDED: Amount exceeds regulatory ceiling of ${this.hardBlockThreshold} cents`
      );
      return {
        action: FraudAction.REJECT,
        riskScore,
        triggeredRules,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // 3. Velocity Check (Rapid-fire transfers)
    const history = this.accountVelocityHistory.get(sourceAccountId) || [];
    const validHistory = history.filter((ts) => now - ts < this.velocityWindowMs);

    if (validHistory.length >= this.maxVelocity) {
      riskScore += 45;
      triggeredRules.push(
        `RULE_VELOCITY_SPIKE: Exceeded limit of ${this.maxVelocity} transfers within velocity window`
      );
    }

    // 4. High-value step-up MFA threshold
    if (amountInCents >= this.highValueThreshold) {
      riskScore += 35;
      triggeredRules.push(
        `RULE_HIGH_VALUE_TRANSFER: Amount exceeds step-up threshold of ${this.highValueThreshold} cents`
      );
    }

    // Record this attempt for velocity tracking
    validHistory.push(now);
    this.accountVelocityHistory.set(sourceAccountId, validHistory);

    // Determine Action based on composite risk score
    let action = FraudAction.APPROVE;
    if (riskScore >= 70) {
      action = FraudAction.REJECT;
    } else if (riskScore >= 30) {
      action = FraudAction.CHALLENGE;
    }

    return {
      action,
      riskScore,
      triggeredRules,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
