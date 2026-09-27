import { store } from '../store.js';

/**
 * Financial Liquidity & Cashflow Analytics View
 */
export class AnalyticsView {
  constructor(container) {
    this.container = container;
  }

  render() {
    const state = store.getState();

    // Compute metrics
    let totalInflowCents = 0;
    let totalOutflowCents = 0;

    for (const txn of state.transactions) {
      if (txn.direction === 'CREDIT') {
        totalInflowCents += txn.amountInCents;
      } else {
        totalOutflowCents += txn.amountInCents;
      }
    }

    const netCashflow = (totalInflowCents - totalOutflowCents) / 100;

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 28px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 700;">Financial Analytics & Treasury</h2>
            <p style="color: var(--text-muted); font-size: 0.875rem;">
              Cashflow velocity, liquidity ratios, and currency concentration metrics
            </p>
          </div>
          <span class="badge badge-success">● Analytics Engine Synced</span>
        </div>

        <!-- Metrics Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
          <div class="card">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Total 30D Inflow</div>
            <div class="mono" style="font-size: 1.6rem; font-weight: 700; color: #34d399; margin: 8px 0;">
              +$${(totalInflowCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-subtle);">Incoming wires & instant settlement</div>
          </div>

          <div class="card">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Total 30D Outflow</div>
            <div class="mono" style="font-size: 1.6rem; font-weight: 700; color: #f87171; margin: 8px 0;">
              -$${(totalOutflowCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-subtle);">Disbursements & card clearing</div>
          </div>

          <div class="card">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Net Period Velocity</div>
            <div class="mono" style="font-size: 1.6rem; font-weight: 700; color: ${netCashflow >= 0 ? '#34d399' : '#f87171'}; margin: 8px 0;">
              ${netCashflow >= 0 ? '+' : ''}$${netCashflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style="font-size: 0.75rem; color: #60a5fa;">Liquidity surplus</div>
          </div>

          <div class="card">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Basel III Liquidity (LCR)</div>
            <div class="mono" style="font-size: 1.6rem; font-weight: 700; color: #fff; margin: 8px 0;">
              142.8%
            </div>
            <div style="font-size: 0.75rem; color: #34d399;">Above 100% regulatory hurdle</div>
          </div>
        </div>

        <!-- Visual Cashflow Breakdown -->
        <div class="card">
          <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 20px;">
            <h3 style="font-size: 1.1rem;">Cash Flow Distribution & Asset Allocation</h3>
            <p style="font-size: 0.8rem; color: var(--text-subtle);">Multi-currency portfolio diversification</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px;">
                <span>USD Core Checking (Liquid Operating Cash)</span>
                <span class="mono" style="font-weight: 600;">68%</span>
              </div>
              <div style="width: 100%; height: 10px; background: var(--bg-card); border-radius: var(--radius-full); overflow: hidden;">
                <div style="width: 68%; height: 100%; background: var(--primary-accent);"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px;">
                <span>USD High-Yield Treasury & Reserve Savings</span>
                <span class="mono" style="font-weight: 600;">22%</span>
              </div>
              <div style="width: 100%; height: 10px; background: var(--bg-card); border-radius: var(--radius-full); overflow: hidden;">
                <div style="width: 22%; height: 100%; background: #10b981;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px;">
                <span>EUR Foreign Currency Settlement Buffer</span>
                <span class="mono" style="font-weight: 600;">10%</span>
              </div>
              <div style="width: 100%; height: 10px; background: var(--bg-card); border-radius: var(--radius-full); overflow: hidden;">
                <div style="width: 10%; height: 100%; background: #f59e0b;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
