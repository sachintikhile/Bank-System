import crypto from 'node:crypto';

/**
 * Tokenization and Card Security Utilities
 */
export class TokenizationService {
  /**
   * Generates a valid Luhn-compliant 16-digit PAN
   */
  static generateLuhnPan(bin = '411111') {
    let pan = bin;
    while (pan.length < 15) {
      pan += crypto.randomInt(0, 10).toString();
    }

    // Compute Luhn Check Digit
    let sum = 0;
    for (let i = 0; i < pan.length; i++) {
      let digit = parseInt(pan[i], 10);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return pan + checkDigit;
  }

  /**
   * Masks a 16-digit card number (e.g. •••• •••• •••• 1234)
   */
  static maskPan(pan) {
    const last4 = pan.slice(-4);
    return `•••• •••• •••• ${last4}`;
  }

  /**
   * Generates a cryptographically random 3-digit CVV
   */
  static generateCvv() {
    return crypto.randomInt(100, 999).toString();
  }

  /**
   * Creates a tokenized surrogate identifier
   */
  static tokenizePan(pan) {
    return `TOK_VIRT_${crypto.createHash('sha256').update(pan).digest('hex').slice(0, 24).toUpperCase()}`;
  }
}
