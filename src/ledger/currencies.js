/**
 * Multi-Currency Registry supporting ISO-4217 specifications and minor-unit conversions
 */
export const Currencies = Object.freeze({
  USD: { code: 'USD', numeric: '840', minorUnits: 2, symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', numeric: '978', minorUnits: 2, symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', numeric: '826', minorUnits: 2, symbol: '£', name: 'British Pound' },
  INR: { code: 'INR', numeric: '356', minorUnits: 2, symbol: '₹', name: 'Indian Rupee' },
  JPY: { code: 'JPY', numeric: '392', minorUnits: 0, symbol: '¥', name: 'Japanese Yen' },
  SGD: { code: 'SGD', numeric: '702', minorUnits: 2, symbol: 'S$', name: 'Singapore Dollar' },
  CHF: { code: 'CHF', numeric: '756', minorUnits: 2, symbol: 'CHF', name: 'Swiss Franc' },
  BHD: { code: 'BHD', numeric: '048', minorUnits: 3, symbol: 'BD', name: 'Bahraini Dinar' },
});

/**
 * Money representation utility to prevent floating point inaccuracies
 */
export class Money {
  /**
   * @param {number|bigint} minorAmount Amount in lowest denomination (e.g. cents)
   * @param {string} currency ISO-4217 code
   */
  constructor(minorAmount, currency = 'USD') {
    const cur = Currencies[currency.toUpperCase()];
    if (!cur) {
      throw new Error(`Unsupported currency code: ${currency}`);
    }
    this.minorAmount = BigInt(Math.round(Number(minorAmount)));
    this.currency = cur.code;
    this.minorUnits = cur.minorUnits;
    this.symbol = cur.symbol;
  }

  /**
   * Parses standard decimal string or number (e.g., 12.50) into minor unit BigInt
   * @param {number|string} decimalValue
   * @param {string} currency
   * @returns {Money}
   */
  static fromDecimal(decimalValue, currency = 'USD') {
    const cur = Currencies[currency.toUpperCase()];
    if (!cur) throw new Error(`Unsupported currency: ${currency}`);
    const factor = 10 ** cur.minorUnits;
    const minor = Math.round(Number(decimalValue) * factor);
    return new Money(minor, currency);
  }

  /**
   * Formats money into human-readable string with proper currency symbol
   * @returns {string}
   */
  format() {
    const factor = 10 ** this.minorUnits;
    const decimal = (Number(this.minorAmount) / factor).toFixed(this.minorUnits);
    return `${this.symbol}${decimal} ${this.currency}`;
  }

  toJSON() {
    return {
      minorAmount: this.minorAmount.toString(),
      currency: this.currency,
      formatted: this.format(),
    };
  }
}
