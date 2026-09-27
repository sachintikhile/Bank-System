import { store } from '../store.js';

/**
 * Lending & Real-Time Loan Amortization Calculator View
 */
export class LoansView {
  constructor(container) {
    this.container = container;
    this.principal = 50000; // $50,000
    this.rateAnnual = 7.5;  // 7.5% APR
    this.tenureMonths = 24; // 24 months
  }

  calculateEmi() {
    const P = this.principal;
    const r = this.rateAnnual / 12 / 100;
    const n = this.tenureMonths;

    if (r === 0) {
      return {
        monthlyEmi: P / n,
        totalPayment: P,
        totalInterest: 0,
      };
    }

    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;

    return {
      monthlyEmi: emi,
      totalPayment,
      totalInterest,
    };
  }

  render() {
    const calc = this.calculateEmi();

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 28px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 700;">Lending, Credit & Amortization</h2>
            <p style="color: var(--text-muted); font-size: 0.875rem;">
              Institutional credit facilities, instant loan origination, and automated interest engines
            </p>
          </div>
          <button id="apply-credit-btn" class="btn btn-primary">
            <span>⚡</span> Apply for Credit Line
          </button>
        </div>

        <!-- Active Credit Lines -->
        <div>
          <h3 style="font-size: 1.1rem; margin-bottom: 14px;">Active Credit Facilities</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
            <div class="card" style="border-left: 4px solid var(--primary-accent);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-subtle);">FACILITY #CR-9081</div>
                  <h4 style="font-size: 1.05rem; margin-top: 2px;">SME Commercial Revolving Line</h4>
                </div>
                <span class="badge badge-success">Active • Performing</span>
              </div>

              <div style="margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px;">
                  <span style="color: var(--text-muted);">Credit Drawn</span>
                  <span class="mono" style="font-weight: 600;">$75,000 / $250,000 USD</span>
                </div>
                <div style="width: 100%; height: 8px; background: var(--bg-card); border-radius: var(--radius-full); overflow: hidden;">
                  <div style="width: 30%; height: 100%; background: var(--primary-accent);"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-subtle); margin-top: 6px;">
                  <span>APR: 6.85% (Daily EOD Accrual)</span>
                  <span>Next EMI: Oct 15, 2026</span>
                </div>
              </div>

              <button class="btn btn-secondary" style="width: 100%; font-size: 0.85rem;" onclick="alert('Repayment scheduled for settlement via Primary Checking.')">
                Make Early Repayment
              </button>
            </div>
          </div>
        </div>

        <!-- Interactive Loan Calculator -->
        <div class="card">
          <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 20px;">
            <h3 style="font-size: 1.15rem;">Real-Time Loan Amortization Simulator</h3>
            <p style="font-size: 0.8rem; color: var(--text-subtle);">Calculate monthly EMI and total interest with reducing-balance methodology</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px;">
            <!-- Inputs -->
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 8px;">
                  <span>Principal Borrowing Amount</span>
                  <span class="mono" style="font-weight: 700; color: #60a5fa;">$${this.principal.toLocaleString()} USD</span>
                </div>
                <input type="range" id="loan-principal-slider" min="5000" max="250000" step="5000" value="${this.principal}" style="width: 100%; accent-color: var(--primary-accent);" />
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-subtle); margin-top: 4px;">
                  <span>$5,000</span>
                  <span>$250,000</span>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 8px;">
                  <span>Loan Tenure</span>
                  <span class="mono" style="font-weight: 700; color: #60a5fa;">${this.tenureMonths} Months (${(this.tenureMonths / 12).toFixed(1)} Yrs)</span>
                </div>
                <input type="range" id="loan-tenure-slider" min="6" max="60" step="6" value="${this.tenureMonths}" style="width: 100%; accent-color: var(--primary-accent);" />
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-subtle); margin-top: 4px;">
                  <span>6 Months</span>
                  <span>60 Months</span>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 8px;">
                  <span>Annual Interest Rate (APR)</span>
                  <span class="mono" style="font-weight: 700; color: #60a5fa;">${this.rateAnnual}%</span>
                </div>
                <input type="range" id="loan-rate-slider" min="4.0" max="18.0" step="0.25" value="${this.rateAnnual}" style="width: 100%; accent-color: var(--primary-accent);" />
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-subtle); margin-top: 4px;">
                  <span>4.0%</span>
                  <span>18.0%</span>
                </div>
              </div>
            </div>

            <!-- Calculation Output Card -->
            <div style="background: var(--bg-card); border-radius: var(--radius-md); padding: 24px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Estimated Monthly EMI</div>
                <div class="mono" style="font-size: 2.2rem; font-weight: 700; color: #34d399; margin: 8px 0;">
                  $${calc.monthlyEmi.toFixed(2)}
                </div>
                <p style="font-size: 0.75rem; color: var(--text-subtle);">Direct debit scheduled on 1st of each month</p>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px; margin: 24px 0; border-top: 1px dashed var(--border-color); padding-top: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                  <span style="color: var(--text-muted);">Principal Amount:</span>
                  <span class="mono">$${this.principal.toLocaleString()}.00</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                  <span style="color: var(--text-muted);">Total Interest Payable:</span>
                  <span class="mono" style="color: #fbbf24;">$${calc.totalInterest.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600;">
                  <span style="color: var(--text-main);">Total Repayment:</span>
                  <span class="mono" style="color: #60a5fa;">$${calc.totalPayment.toFixed(2)}</span>
                </div>
              </div>

              <button id="disburse-loan-btn" class="btn btn-primary" style="width: 100%; padding: 12px;">
                Instant Disbursal to Primary Checking
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const principalSlider = this.container.querySelector('#loan-principal-slider');
    const tenureSlider = this.container.querySelector('#loan-tenure-slider');
    const rateSlider = this.container.querySelector('#loan-rate-slider');

    if (principalSlider) {
      principalSlider.addEventListener('input', (e) => {
        this.principal = Number(e.target.value);
        this.render();
      });
    }

    if (tenureSlider) {
      tenureSlider.addEventListener('input', (e) => {
        this.tenureMonths = Number(e.target.value);
        this.render();
      });
    }

    if (rateSlider) {
      rateSlider.addEventListener('input', (e) => {
        this.rateAnnual = Number(e.target.value);
        this.render();
      });
    }

    const disburseBtn = this.container.querySelector('#disburse-loan-btn');
    if (disburseBtn) {
      disburseBtn.addEventListener('click', () => {
        const state = store.getState();
        const principalCents = this.principal * 100;

        // Disburse loan to Primary Checking
        const updatedAccounts = state.accounts.map((acc) => {
          if (acc.id === 'ACC_CHECKING_001') {
            return {
              ...acc,
              settledBalanceInCents: acc.settledBalanceInCents + principalCents,
              availableBalanceInCents: acc.availableBalanceInCents + principalCents,
            };
          }
          return acc;
        });

        const disburseTxn = {
          id: `TXN_LOAN_${Date.now()}`,
          type: 'LOAN_DISBURSEMENT',
          description: `Loan Disbursal #LN-${Math.floor(Math.random() * 10000)}`,
          direction: 'CREDIT',
          amountInCents: principalCents,
          currency: 'USD',
          rail: 'INTERNAL_P2P',
          status: 'SETTLED',
          timestamp: new Date().toISOString(),
          blockHash: '0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
        };

        store.setState({
          accounts: updatedAccounts,
          transactions: [disburseTxn, ...state.transactions],
          notifications: [
            { id: Date.now(), text: `Loan proceeds of $${this.principal.toLocaleString()} credited to Checking.`, read: false },
            ...state.notifications,
          ],
        });

        alert(`🎉 Loan Approved & Disbursed!\n\n$${this.principal.toLocaleString()}.00 USD has been credited directly to your Primary Checking Account.\nMonthly EMI: $${this.calculateEmi().monthlyEmi.toFixed(2)}`);
        store.setView('dashboard');
      });
    }
  }
}
