import { store } from '../store.js';
import { ApiClient } from '../api.js';

/**
 * Real-Time Pay & Transfer Terminal View
 */
export class TransfersView {
  constructor(container) {
    this.container = container;
    this.selectedRail = 'FEDNOW_RTP';
  }

  render() {
    const state = store.getState();

    this.container.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        <!-- Header -->
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 700;">Initiate Funds Transfer</h2>
          <p style="color: var(--text-muted); font-size: 0.875rem;">
            Orchestrate real-time payments across domestic and international clearing rails
          </p>
        </div>

        <div class="card">
          <form id="transfer-form">
            <!-- Source Account -->
            <div class="form-group">
              <label class="form-label">Debiting Account</label>
              <select id="source-account-select" class="form-input" style="cursor: pointer;">
                ${state.accounts
                  .map(
                    (acc) => `
                  <option value="${acc.id}">
                    ${acc.name} (${acc.currency}) — Available: $${(acc.availableBalanceInCents / 100).toFixed(2)}
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <!-- Destination Account / Identifier -->
            <div class="form-group">
              <label class="form-label">Beneficiary Account / Routing / Phone / Email</label>
              <input type="text" id="dest-account" class="form-input" placeholder="e.g. acct_49201948 or alice@apexbank.io" required value="acct_88201948" />
            </div>

            <!-- Amount Input with Quick Buttons -->
            <div class="form-group">
              <label class="form-label">Transfer Amount ($ USD)</label>
              <div style="position: relative;">
                <input type="number" step="0.01" min="1" id="transfer-amount" class="form-input mono" style="font-size: 1.25rem; font-weight: 600; padding-left: 36px;" placeholder="0.00" value="150.00" required />
                <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 1.2rem; color: var(--text-muted);">$</span>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button type="button" class="btn btn-secondary quick-amt-btn" data-amt="50" style="padding: 4px 10px; font-size: 0.75rem;">$50</button>
                <button type="button" class="btn btn-secondary quick-amt-btn" data-amt="100" style="padding: 4px 10px; font-size: 0.75rem;">$100</button>
                <button type="button" class="btn btn-secondary quick-amt-btn" data-amt="250" style="padding: 4px 10px; font-size: 0.75rem;">$250</button>
                <button type="button" class="btn btn-secondary quick-amt-btn" data-amt="500" style="padding: 4px 10px; font-size: 0.75rem;">$500</button>
              </div>
            </div>

            <!-- Payment Rail Selection Grid -->
            <div class="form-group">
              <label class="form-label">Settlement Clearing Rail</label>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;" id="rail-cards">
                <div class="rail-option-card ${this.selectedRail === 'FEDNOW_RTP' ? 'active' : ''}" data-rail="FEDNOW_RTP">
                  <div style="font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                    ⚡ FedNow / RTP
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 4px;">Instant (< 2 seconds) • Zero Fee</div>
                </div>

                <div class="rail-option-card ${this.selectedRail === 'INTERNAL_P2P' ? 'active' : ''}" data-rail="INTERNAL_P2P">
                  <div style="font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                    🏦 Intra-Bank P2P
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 4px;">Synchronous Ledger • Zero Fee</div>
                </div>

                <div class="rail-option-card ${this.selectedRail === 'ACH_STANDARD' ? 'active' : ''}" data-rail="ACH_STANDARD">
                  <div style="font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                    🏛️ ACH Clearing
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 4px;">Standard Batch (1-2 days)</div>
                </div>
              </div>
            </div>

            <!-- Memo / Description -->
            <div class="form-group">
              <label class="form-label">Transaction Memo / Reference Note</label>
              <input type="text" id="transfer-memo" class="form-input" placeholder="e.g. Consulting Invoice INV-9021" value="Consulting Retainer Settlement" />
            </div>

            <div id="transfer-error" style="color: #f87171; font-size: 0.85rem; margin-bottom: 14px; display: none;"></div>

            <!-- Submit Button -->
            <button type="submit" id="submit-transfer-btn" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 1rem;">
              <span>🚀</span> Authorize and Dispatch Payment
            </button>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Quick Amount buttons
    this.container.querySelectorAll('.quick-amt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const amtInput = this.container.querySelector('#transfer-amount');
        if (amtInput) amtInput.value = btn.getAttribute('data-amt') + '.00';
      });
    });

    // Rail selector
    this.container.querySelectorAll('.rail-option-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.selectedRail = card.getAttribute('data-rail');
        this.container.querySelectorAll('.rail-option-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    // Form submission
    const form = this.container.querySelector('#transfer-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = this.container.querySelector('#submit-transfer-btn');
      const errBox = this.container.querySelector('#transfer-error');
      errBox.style.display = 'none';

      const sourceAccountId = this.container.querySelector('#source-account-select').value;
      const destAccount = this.container.querySelector('#dest-account').value;
      const amount = this.container.querySelector('#transfer-amount').value;
      const memo = this.container.querySelector('#transfer-memo').value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span> Validating Risk & Reserving Funds...`;

      try {
        const result = await ApiClient.submitTransfer({
          sourceAccountId,
          destinationAccountNumber: destAccount,
          amount,
          railType: this.selectedRail,
          memo,
        });

        alert(`✅ Payment Successfully Settled!\n\nTransaction ID: ${result.transaction.id}\nClearing Rail: ${this.selectedRail}\nAmount: $${amount}\nChained Block Hash: ${result.transaction.blockHash.slice(0, 16)}...`);

        store.setView('dashboard');
      } catch (err) {
        errBox.textContent = `Transaction Failed: ${err.message}`;
        errBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>🚀</span> Authorize and Dispatch Payment`;
      }
    });
  }
}
