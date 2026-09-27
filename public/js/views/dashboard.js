import { store } from '../store.js';

/**
 * Executive Financial Overview Dashboard View
 */
export class DashboardView {
  constructor(container) {
    this.container = container;
  }

  render() {
    const state = store.getState();

    // Calculate aggregated USD net worth
    let totalUsdCents = 0;
    for (const acc of state.accounts) {
      if (acc.currency === 'USD') {
        totalUsdCents += acc.settledBalanceInCents;
      }
    }

    const formattedNetWorth = `$${(totalUsdCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 28px;">
        <!-- Top Banner: Aggregated Liquidity -->
        <div class="card" style="background: linear-gradient(135deg, rgba(0, 82, 255, 0.15), rgba(17, 24, 39, 0.95)); border-color: rgba(59, 130, 246, 0.3);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px;">
            <div>
              <div style="font-size: 0.85rem; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">
                Aggregated Institutional Net Liquidity
              </div>
              <div class="mono" style="font-size: 2.5rem; font-weight: 700; margin: 8px 0; color: #fff;">
                ${formattedNetWorth} <span style="font-size: 1rem; color: #60a5fa; font-weight: 500;">USD</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="badge badge-success">+4.8% vs last month</span>
                <span style="font-size: 0.8rem; color: var(--text-subtle);">Real-time synchronous ledger balance</span>
              </div>
            </div>

            <div style="display: flex; gap: 12px;">
              <button id="quick-send-btn" class="btn btn-primary">
                <span>💸</span> Send Funds
              </button>
              <button id="quick-deposit-btn" class="btn btn-secondary">
                <span>📥</span> Receive / Deposit
              </button>
            </div>
          </div>
        </div>

        <!-- Account Cards Grid -->
        <div>
          <h3 style="font-size: 1.1rem; margin-bottom: 16px;">Core Ledger Accounts</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
            ${state.accounts
              .map(
                (acc) => `
              <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; min-height: 160px;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <div style="font-size: 0.8rem; color: var(--text-subtle);">${acc.code}</div>
                      <div style="font-size: 1rem; font-weight: 600; margin-top: 2px;">${acc.name}</div>
                    </div>
                    <span class="badge ${acc.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">${acc.status}</span>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Account ${acc.accountNumber}</div>
                </div>

                <div style="margin-top: 20px;">
                  <div class="mono" style="font-size: 1.5rem; font-weight: 700;">
                    ${acc.currency === 'USD' ? '$' : '€'}${(acc.settledBalanceInCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                    <span>Available: ${(acc.availableBalanceInCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span>${acc.currency}</span>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Recent Ledger Activity -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 1.1rem;">Recent Cryptographic Journal Stream</h3>
              <p style="font-size: 0.8rem; color: var(--text-subtle);">Immutable double-entry audit trail postings</p>
            </div>
            <span class="badge badge-success">SHA-256 Chained</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${state.transactions
              .map(
                (txn) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; background: ${
                    txn.direction === 'CREDIT' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                  }; color: ${txn.direction === 'CREDIT' ? '#34d399' : '#f87171'};">
                    ${txn.direction === 'CREDIT' ? '↓' : '↑'}
                  </div>
                  <div>
                    <div style="font-size: 0.9rem; font-weight: 600;">${txn.description}</div>
                    <div class="mono" style="font-size: 0.7rem; color: var(--text-subtle);">
                      ${txn.id} • ${txn.rail} • ${new Date(txn.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div style="text-align: right;">
                  <div class="mono" style="font-size: 0.95rem; font-weight: 600; color: ${
                    txn.direction === 'CREDIT' ? '#34d399' : '#f87171'
                  };">
                    ${txn.direction === 'CREDIT' ? '+' : '-'}$${(txn.amountInCents / 100).toFixed(2)}
                  </div>
                  <div style="font-size: 0.7rem; color: var(--text-subtle);">
                    Block: ${txn.blockHash.slice(0, 10)}...
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    // Event binding
    const sendBtn = this.container.querySelector('#quick-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        store.setView('transfers');
      });
    }

    const depositBtn = this.container.querySelector('#quick-deposit-btn');
    if (depositBtn) {
      depositBtn.addEventListener('click', () => {
        alert('Deposit Routing Details:\nABA Routing: 021000021\nAccount: 4921008891');
      });
    }
  }
}
