import crypto from 'node:crypto';
import { TokenizationService } from './tokenization.js';

export const CardStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  FROZEN: 'FROZEN',
  CANCELLED: 'CANCELLED',
});

/**
 * Enterprise Virtual Card Issuing & Dynamic Policy Authorization Engine
 */
export class CardService {
  constructor() {
    /** @type {Map<string, Object>} */
    this.cards = new Map();
  }

  /**
   * Issues an instant virtual card
   * @param {Object} params
   * @param {string} params.accountId Associated bank account
   * @param {string} params.cardholderName Name printed on card
   * @param {number} [params.monthlyLimitInCents=500000] Default $5,000.00
   * @param {Object} [params.controls]
   */
  issueVirtualCard({
    accountId,
    cardholderName,
    monthlyLimitInCents = 500000,
    controls = { allowOnline: true, allowInternational: false, allowAtm: true },
  }) {
    const cardId = `CARD_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const rawPan = TokenizationService.generateLuhnPan();
    const token = TokenizationService.tokenizePan(rawPan);
    const maskedPan = TokenizationService.maskPan(rawPan);
    const cvv = TokenizationService.generateCvv();

    const expYear = new Date().getFullYear() + 3;
    const expMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const expiry = `${expMonth}/${String(expYear).slice(-2)}`;

    const card = {
      cardId,
      accountId,
      cardholderName,
      token,
      maskedPan,
      cvv,
      expiry,
      status: CardStatus.ACTIVE,
      monthlyLimitInCents,
      currentMonthSpendInCents: 0,
      controls: { ...controls },
      createdAt: new Date().toISOString(),
    };

    this.cards.set(cardId, card);
    return card;
  }

  /**
   * Evaluates real-time point-of-sale card authorization request
   * @param {Object} req
   * @param {string} req.cardId
   * @param {number} req.amountInCents
   * @param {boolean} [req.isOnline=false]
   * @param {boolean} [req.isInternational=false]
   * @param {boolean} [req.isAtm=false]
   * @returns {{ authorized: boolean, authCode?: string, rejectionReason?: string }}
   */
  evaluateAuthorization({ cardId, amountInCents, isOnline = false, isInternational = false, isAtm = false }) {
    const card = this.cards.get(cardId);
    if (!card) {
      return { authorized: false, rejectionReason: 'Card not found' };
    }

    if (card.status === CardStatus.FROZEN) {
      return { authorized: false, rejectionReason: 'Card is FROZEN by cardholder.' };
    }
    if (card.status === CardStatus.CANCELLED) {
      return { authorized: false, rejectionReason: 'Card is CANCELLED.' };
    }

    // Spend controls enforcement
    if (isOnline && !card.controls.allowOnline) {
      return { authorized: false, rejectionReason: 'Online transactions disabled by policy.' };
    }
    if (isInternational && !card.controls.allowInternational) {
      return { authorized: false, rejectionReason: 'International cross-border transactions disabled.' };
    }
    if (isAtm && !card.controls.allowAtm) {
      return { authorized: false, rejectionReason: 'ATM cash withdrawals disabled.' };
    }

    // Monthly spend ceiling check
    if (card.currentMonthSpendInCents + amountInCents > card.monthlyLimitInCents) {
      return {
        authorized: false,
        rejectionReason: `Authorization exceeds monthly ceiling of $${(card.monthlyLimitInCents / 100).toFixed(2)}`,
      };
    }

    // Authorize
    card.currentMonthSpendInCents += amountInCents;
    const authCode = `AUTH_${crypto.randomInt(100000, 999999)}`;

    return {
      authorized: true,
      authCode,
      authorizedAmountInCents: amountInCents,
      timestamp: new Date().toISOString(),
    };
  }

  toggleFreeze(cardId) {
    const card = this.cards.get(cardId);
    if (!card) throw new Error(`Card not found: ${cardId}`);
    card.status = card.status === CardStatus.ACTIVE ? CardStatus.FROZEN : CardStatus.ACTIVE;
    return card;
  }
}
