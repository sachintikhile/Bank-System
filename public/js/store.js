/**
 * Lightweight Reactive Client State Store (Pub/Sub)
 */
class ReactiveStore {
  constructor() {
    this.state = {
      user: {
        id: 'CUST_001',
        name: 'Sachin Tikhile',
        email: 'sachin@apexbank.io',
        role: 'PREMIUM_CLIENT',
        kycStatus: 'VERIFIED',
        tier: 'TIER_1',
      },
      currentView: 'dashboard',
      accounts: [
        {
          id: 'ACC_CHECKING_001',
          code: '2000.10.01',
          name: 'Primary Operating Checking',
          type: 'LIABILITY',
          currency: 'USD',
          settledBalanceInCents: 1245080, // $12,450.80
          availableBalanceInCents: 1195080, // $11,950.80 ($500 active hold)
          accountNumber: '•••• 4921',
          status: 'ACTIVE',
        },
        {
          id: 'ACC_SAVINGS_002',
          code: '2000.20.01',
          name: 'High-Yield Reserve Savings',
          type: 'LIABILITY',
          currency: 'USD',
          settledBalanceInCents: 4890000, // $48,900.00
          availableBalanceInCents: 4890000,
          accountNumber: '•••• 8820',
          status: 'ACTIVE',
        },
        {
          id: 'ACC_GLOBAL_EUR',
          code: '2000.30.01',
          name: 'EUR Settlement Account',
          type: 'LIABILITY',
          currency: 'EUR',
          settledBalanceInCents: 850000, // €8,500.00
          availableBalanceInCents: 850000,
          accountNumber: '•••• 3091',
          status: 'ACTIVE',
        },
      ],
      transactions: [
        {
          id: 'TXN_20260927_A1',
          type: 'P2P_TRANSFER',
          description: 'Payment from Global Merchant Tech',
          direction: 'CREDIT',
          amountInCents: 325000,
          currency: 'USD',
          rail: 'FEDNOW_RTP',
          status: 'SETTLED',
          timestamp: '2026-09-27T08:14:22Z',
          blockHash: '7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
        },
        {
          id: 'TXN_20260926_B2',
          type: 'CARD_POS',
          description: 'Cloud Infrastructure Services',
          direction: 'DEBIT',
          amountInCents: 14999,
          currency: 'USD',
          rail: 'INTERNAL_P2P',
          status: 'SETTLED',
          timestamp: '2026-09-26T19:30:10Z',
          blockHash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        },
        {
          id: 'TXN_20260925_C3',
          type: 'WIRE_INWARD',
          description: 'Institutional Liquidity Allocation',
          direction: 'CREDIT',
          amountInCents: 1000000,
          currency: 'USD',
          rail: 'FEDNOW_RTP',
          status: 'SETTLED',
          timestamp: '2026-09-25T11:00:00Z',
          blockHash: '0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e',
        },
      ],
      holds: [
        {
          id: 'HOLD_HOTEL_001',
          accountId: 'ACC_CHECKING_001',
          amountInCents: 50000, // $500.00
          reason: 'Hotel Pre-Authorization Hold',
          status: 'PENDING',
          expiresAt: '2026-09-28T12:00:00Z',
        },
      ],
      notifications: [
        { id: 1, text: 'Real-time payment of $3,250.00 settled via FedNow', read: false },
        { id: 2, text: 'New login detected from IP 192.168.1.1 (Windows)', read: true },
      ],
    };

    /** @type {Set<Function>} */
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('State listener error:', err);
      }
    }
  }

  setView(viewName) {
    this.setState({ currentView: viewName });
  }

  addTransaction(txn) {
    const updated = [txn, ...this.state.transactions];
    this.setState({ transactions: updated });
  }
}

export const store = new ReactiveStore();
