import { store } from './store.js';

/**
 * Banking API Client Module
 */
export const ApiClient = {
  /**
   * Fetches customer accounts
   */
  async getAccounts() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(store.getState().accounts);
      }, 100);
    });
  },

  /**
   * Simulates posting a real-time money transfer
   */
  async submitTransfer({ sourceAccountId, destinationAccountNumber, amount, railType, memo }) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const state = store.getState();
        const source = state.accounts.find((a) => a.id === sourceAccountId);

        if (!source) {
          return reject(new Error('Source account not found.'));
        }

        const amountInCents = Math.round(Number(amount) * 100);
        if (source.availableBalanceInCents < amountInCents) {
          return reject(new Error(`Insufficient available balance ($${(source.availableBalanceInCents / 100).toFixed(2)})`));
        }

        // Deduct balance
        const updatedAccounts = state.accounts.map((acc) => {
          if (acc.id === sourceAccountId) {
            return {
              ...acc,
              settledBalanceInCents: acc.settledBalanceInCents - amountInCents,
              availableBalanceInCents: acc.availableBalanceInCents - amountInCents,
            };
          }
          return acc;
        });

        // Record transaction
        const newTxn = {
          id: `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'OUTWARD_TRANSFER',
          description: memo || `Transfer to ${destinationAccountNumber}`,
          direction: 'DEBIT',
          amountInCents,
          currency: source.currency,
          rail: railType,
          status: 'SETTLED',
          timestamp: new Date().toISOString(),
          blockHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        };

        store.setState({
          accounts: updatedAccounts,
          transactions: [newTxn, ...state.transactions],
          notifications: [
            { id: Date.now(), text: `Transfer of $${amount} successfully settled via ${railType}`, read: false },
            ...state.notifications,
          ],
        });

        resolve({
          success: true,
          transaction: newTxn,
        });
      }, 350);
    });
  },
};
