import { store } from '../store.js';

/**
 * Virtual Cards & Dynamic Spend Controls View
 */
export class CardsView {
  constructor(container) {
    this.container = container;
    this.showCvv = false;
  }

  render() {
    const state = store.getState();
    const cards = state.cards || [
      {
        id: 'CARD_VIRT_01',
        name: 'Sachin Tikhile',
        cardType: 'COMMERCIAL_PLATINUM',
        maskedPan: '•••• •••• •••• 9012',
        cvv: '842',
        expiry: '09/29',
        status: 'ACTIVE',
        spendingLimit: 5000,
        currentSpend: 1450,
        controls: {
          onlineCommerce: true,
          international: false,
          atmWithdrawals: true,
        },
      },
    ];

    const currentCard = cards[0];

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 28px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 700;">Cards & Tokenization</h2>
            <p style="color: var(--text-muted); font-size: 0.875rem;">
              Instantly issue virtual cards and configure real-time authorization spend controls
            </p>
          </div>
          <button id="issue-card-btn" class="btn btn-primary">
            <span>➕</span> Issue New Virtual Card
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 28px;">
          <!-- 3D Style Financial Card Visual -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="virtual-card ${currentCard.status === 'FROZEN' ? 'frozen' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="font-size: 0.75rem; letter-spacing: 0.1em; opacity: 0.8;">APEXBANK ENTERPRISE</div>
                  <div style="font-size: 0.85rem; font-weight: 600; margin-top: 2px;">Platinum Corporate</div>
                </div>
                <div style="font-size: 1.25rem;">⚡</div>
              </div>

              <!-- EMV Chip & Contactless -->
              <div style="display: flex; align-items: center; gap: 12px; margin: 28px 0 20px 0;">
                <div class="card-chip"></div>
                <span style="font-size: 1.1rem; opacity: 0.75;">📶</span>
              </div>

              <!-- Card Number -->
              <div class="mono" style="font-size: 1.35rem; letter-spacing: 0.15em; font-weight: 600;">
                ${currentCard.maskedPan}
              </div>

              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px;">
                <div>
                  <div style="font-size: 0.65rem; opacity: 0.75;">CARDHOLDER</div>
                  <div style="font-size: 0.95rem; font-weight: 600; letter-spacing: 0.05em;">${currentCard.name.toUpperCase()}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 0.65rem; opacity: 0.75;">EXPIRES</div>
                  <div class="mono" style="font-size: 0.95rem; font-weight: 600;">${currentCard.expiry}</div>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <button id="toggle-freeze-btn" class="btn ${currentCard.status === 'ACTIVE' ? 'btn-secondary' : 'btn-primary'}" style="flex: 1;">
                ${currentCard.status === 'ACTIVE' ? '❄️ Freeze Card' : '🔥 Unfreeze Card'}
              </button>
              <button id="toggle-cvv-btn" class="btn btn-secondary" style="font-size: 0.85rem;">
                👁️ ${this.showCvv ? `CVV: ${currentCard.cvv}` : 'Show CVV'}
              </button>
            </div>
          </div>

          <!-- Dynamic Spend Controls -->
          <div class="card" style="display: flex; flex-direction: column; gap: 20px;">
            <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
              <h3 style="font-size: 1.1rem;">Dynamic Authorization Controls</h3>
              <p style="font-size: 0.8rem; color: var(--text-subtle);">Real-time policy enforcement on every card authorization</p>
            </div>

            <!-- Spend Limits -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 8px;">
                <span>Monthly Spending Ceiling</span>
                <span class="mono" style="font-weight: 600; color: #60a5fa;">$${currentCard.spendingLimit.toLocaleString()} USD</span>
              </div>
              <input type="range" id="spend-limit-slider" min="500" max="25000" step="500" value="${currentCard.spendingLimit}" style="width: 100%; accent-color: var(--primary-accent);" />
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-subtle); margin-top: 4px;">
                <span>Used: $${currentCard.currentSpend.toLocaleString()}</span>
                <span>Max: $25,000</span>
              </div>
            </div>

            <!-- Toggles List -->
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 0.9rem; font-weight: 500;">Online E-Commerce Transactions</div>
                  <div style="font-size: 0.75rem; color: var(--text-subtle);">Allow tokenized web and app checkouts</div>
                </div>
                <input type="checkbox" id="ctrl-online" ${currentCard.controls.onlineCommerce ? 'checked' : ''} style="transform: scale(1.3); cursor: pointer;" />
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 0.9rem; font-weight: 500;">International Cross-Border Spend</div>
                  <div style="font-size: 0.75rem; color: var(--text-subtle);">Block foreign currency conversions</div>
                </div>
                <input type="checkbox" id="ctrl-intl" ${currentCard.controls.international ? 'checked' : ''} style="transform: scale(1.3); cursor: pointer;" />
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 0.9rem; font-weight: 500;">ATM Cash Withdrawals</div>
                  <div style="font-size: 0.75rem; color: var(--text-subtle);">Permit physical ATM cash dispensations</div>
                </div>
                <input type="checkbox" id="ctrl-atm" ${currentCard.controls.atmWithdrawals ? 'checked' : ''} style="transform: scale(1.3); cursor: pointer;" />
              </div>
            </div>

            <button id="save-policy-btn" class="btn btn-primary" style="margin-top: 8px;">
              Save Card Policies
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(currentCard);
  }

  bindEvents(currentCard) {
    const freezeBtn = this.container.querySelector('#toggle-freeze-btn');
    if (freezeBtn) {
      freezeBtn.addEventListener('click', () => {
        currentCard.status = currentCard.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
        store.setState({
          notifications: [
            { id: Date.now(), text: `Card ${currentCard.maskedPan} status changed to ${currentCard.status}.`, read: false },
            ...store.getState().notifications,
          ],
        });
        this.render();
      });
    }

    const cvvBtn = this.container.querySelector('#toggle-cvv-btn');
    if (cvvBtn) {
      cvvBtn.addEventListener('click', () => {
        this.showCvv = !this.showCvv;
        this.render();
      });
    }

    const savePolicyBtn = this.container.querySelector('#save-policy-btn');
    if (savePolicyBtn) {
      savePolicyBtn.addEventListener('click', () => {
        const slider = this.container.querySelector('#spend-limit-slider');
        currentCard.spendingLimit = Number(slider.value);
        currentCard.controls.onlineCommerce = this.container.querySelector('#ctrl-online').checked;
        currentCard.controls.international = this.container.querySelector('#ctrl-intl').checked;
        currentCard.controls.atmWithdrawals = this.container.querySelector('#ctrl-atm').checked;

        alert('Card authorization rules updated and distributed to Edge HSM!');
        this.render();
      });
    }

    const issueBtn = this.container.querySelector('#issue-card-btn');
    if (issueBtn) {
      issueBtn.addEventListener('click', () => {
        alert('Instant Card Provisioning:\nVirtual Visa Debit tokenized successfully and linked to Primary Checking!');
      });
    }
  }
}
