import { store } from '../store.js';

/**
 * Accounts & Ledger Explorer View
 */
export class AccountsView {
  constructor(container) {
    this.container = container;
  }

  render() {
    const state = store.getState();

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 28px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 700;">Chart of Accounts & General Ledger</h2>
            <p style="color: var(--text-muted); font-size: 0.875rem;">
              Real-time multi-currency ledger balances, reservations, and holds
            </p>
          </div>
          <button id="export-statement-btn" class="btn btn-secondary">
            <span>📄</span> Export Ledger CSV
          </button>
        </div>

        <!-- Accounts Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
          ${state.accounts
            .map((acc) => {
              const symbol = acc.currency === 'USD' ? '$' : acc.currency === 'EUR' ? '€' : '₹';
              const settled = (acc.settledBalanceInCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
              const available = (acc.availableBalanceInCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
              const holdDiff = (acc.settledBalanceInCents - acc.availableBalanceInCents) / 100;

              return `
                <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <div>
                        <span class="mono" style="font-size: 0.75rem; color: var(--text-subtle);">${acc.code}</span>
                        <h3 style="font-size: 1.1rem; margin-top: 2px;">${acc.name}</h3>
                      </div>
                      <span class="badge ${acc.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">${acc.status}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
                      Account Number: <span class="mono">${acc.accountNumber}</span> • <span class="badge" style="background: rgba(0,82,255,0.15); color: #60a5fa;">${acc.type}</span>
                    </div>
                  </div>

                  <div style="margin: 24px 0 16px 0; padding: 14px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                      <span style="font-size: 0.8rem; color: var(--text-muted);">Settled Balance</span>
                      <span class="mono" style="font-size: 1.35rem; font-weight: 700; color: #fff;">${symbol}${settled}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px;">
                      <span style="font-size: 0.8rem; color: var(--text-muted);">Available Balance</span>
                      <span class="mono" style="font-size: 1.1rem; font-weight: 600; color: #34d399;">${symbol}${available}</span>
                    </div>
                    ${
                      holdDiff > 0
                        ? `
                      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border-color);">
                        <span style="font-size: 0.75rem; color: #fbbf24;">Pending Authorization Holds</span>
                        <span class="mono" style="font-size: 0.8rem; font-weight: 600; color: #fbbf24;">-${symbol}${holdDiff.toFixed(2)}</span>
                      </div>
                    `
                        : ''
                    }
                  </div>

                  <div style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary transfer-from-btn" data-account-id="${acc.id}" style="flex: 1; font-size: 0.8rem; padding: 8px;">
                      Transfer
                    </button>
                    <button class="btn btn-secondary view-journal-btn" data-account-id="${acc.id}" style="font-size: 0.8rem; padding: 8px;">
                      History
                    </button>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        <!-- Active Authorization Holds Table -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 1.1rem;">Active Authorization Holds</h3>
              <p style="font-size: 0.8rem; color: var(--text-subtle);">Reserved funds awaiting capture or release</p>
            </div>
            <span class="badge badge-warning">${state.holds.length} Active Hold${state.holds.length === 1 ? '' : 's'}</span>
          </div>

          ${
            state.holds.length === 0
              ? `<div style="text-align: center; padding: 24px; color: var(--text-subtle);">No active holds on your accounts.</div>`
              : `
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${state.holds
                .map(
                  (h) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                  <div>
                    <div style="font-size: 0.9rem; font-weight: 600;">${h.reason}</div>
                    <div class="mono" style="font-size: 0.75rem; color: var(--text-subtle);">
                      ${h.id} • Expires: ${new Date(h.expiresAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 16px;">
                    <span class="mono" style="font-weight: 600; color: #fbbf24;">-$${(h.amountInCents / 100).toFixed(2)}</span>
                    <button class="btn btn-secondary release-hold-btn" data-hold-id="${h.id}" style="padding: 6px 12px; font-size: 0.75rem;">
                      Release Hold
                    </button>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
          }
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.transfer-from-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.setView('transfers');
      });
    });

    this.container.querySelectorAll('.release-hold-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const holdId = btn.getAttribute('data-hold-id');
        const state = store.getState();
        const hold = state.holds.find((h) => h.id === holdId);
        if (!hold) return;

        // Release hold and restore available balance
        const updatedHolds = state.holds.filter((h) => h.id !== holdId);
        const updatedAccounts = state.accounts.map((acc) => {
          if (acc.id === hold.accountId) {
            return {
              ...acc,
              availableBalanceInCents: acc.availableBalanceInCents + hold.amountInCents,
            };
          }
          return acc;
        });

        store.setState({
          holds: updatedHolds,
          accounts: updatedAccounts,
          notifications: [
            { id: Date.now(), text: `Authorization hold ${holdId} released. Available balance restored.`, read: false },
            ...state.notifications,
          ],
        });
        this.render();
      });
    });

    const exportBtn = this.container.querySelector('#export-statement-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        alert('Downloading cryptographically sealed general ledger audit report (CSV)...');
      });
    }
  }
}
