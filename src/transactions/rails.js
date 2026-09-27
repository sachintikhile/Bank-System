/**
 * Supported Banking Payment Rails
 */
export const PaymentRailType = Object.freeze({
  INTERNAL_P2P: 'INTERNAL_P2P',       // Instant intra-bank ledger transfer
  FEDNOW_RTP: 'FEDNOW_RTP',           // Real-time gross settlement (< 2 seconds)
  ACH_STANDARD: 'ACH_STANDARD',       // Automated Clearing House batch (1-2 days)
  SWIFT_MX: 'SWIFT_MX',               // Cross-border ISO 20022 wire
});

/**
 * Base Payment Rail Adapter
 */
export class BasePaymentRailAdapter {
  constructor(railType) {
    this.railType = railType;
  }

  /**
   * Dispatches transfer to the clearing rail
   * @param {Object} paymentPayload
   * @returns {Promise<{ success: boolean, railReference: string, status: string, failureReason?: string }>}
   */
  async dispatch(paymentPayload) {
    throw new Error('dispatch() must be implemented by payment rail adapter');
  }
}

/**
 * Internal Book Transfer Rail (Zero external network latency)
 */
export class InternalP2PRailAdapter extends BasePaymentRailAdapter {
  constructor() {
    super(PaymentRailType.INTERNAL_P2P);
  }

  async dispatch(paymentPayload) {
    return {
      success: true,
      railReference: `INT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: 'SETTLED',
      settledAt: new Date().toISOString(),
    };
  }
}

/**
 * Real-Time Clearing Rail Adapter (FedNow / RTP)
 */
export class RealTimePaymentRailAdapter extends BasePaymentRailAdapter {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.simulateNetworkFailure=false]
   */
  constructor(options = {}) {
    super(PaymentRailType.FEDNOW_RTP);
    this.simulateNetworkFailure = options.simulateNetworkFailure || false;
  }

  async dispatch(paymentPayload) {
    if (this.simulateNetworkFailure) {
      return {
        success: false,
        railReference: null,
        status: 'RAIL_REJECTED',
        failureReason: 'Clearing network timeout or destination FI unresponsive.',
      };
    }

    return {
      success: true,
      railReference: `FEDNOW-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      status: 'SETTLED',
      settledAt: new Date().toISOString(),
    };
  }
}

/**
 * Payment Rails Factory and Registry
 */
export class PaymentRailRouter {
  constructor() {
    /** @type {Map<string, BasePaymentRailAdapter>} */
    this.adapters = new Map();
    this.registerAdapter(new InternalP2PRailAdapter());
    this.registerAdapter(new RealTimePaymentRailAdapter());
  }

  registerAdapter(adapter) {
    this.adapters.set(adapter.railType, adapter);
  }

  getAdapter(railType) {
    const adapter = this.adapters.get(railType);
    if (!adapter) {
      throw new Error(`Unsupported payment rail: ${railType}`);
    }
    return adapter;
  }
}
