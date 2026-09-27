/**
 * Payment Settlement Receipt Modal Component
 */
export class ReceiptModalComponent {
  constructor() {
    this.initDOM();
  }

  initDOM() {
    let overlay = document.getElementById('receipt-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'receipt-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }
    this.overlay = overlay;
  }

  show(receiptData) {
    const {
      transactionId,
      amount,
      currency = 'USD',
      rail,
      sourceAccount,
      destinationAccount,
      timestamp = new Date().toISOString(),
      blockHash = '0000000000000000000000000000000000000000000000000000000000000000',
    } = receiptData;

    this.overlay.innerHTML = `
      <div class="auth-card" style="max-width: 500px;">
        <div class="auth-header">
          <div class="brand-icon" style="margin: 0 auto; width: 44px; height: 44px; background: #10B981;">✓</div>
          <h2>Payment Settled</h2>
          <p>Cryptographic Ledger Transaction Receipt</p>
        </div>

        <div style="background: var(--bg-card); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px; border: 1px solid var(--border-color); font-size: 0.85rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: var(--text-muted);">Amount Settled:</span>
            <span class="mono" style="font-weight: 700; font-size: 1.1rem; color: #34d399;">$${amount} ${currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-muted);">Transaction Ref:</span>
            <span class="mono">${transactionId}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-muted);">Clearing Rail:</span>
            <span class="badge badge-success">${rail}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-muted);">From Account:</span>
            <span class="mono">${sourceAccount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-muted);">Destination:</span>
            <span class="mono">${destinationAccount}</span>
          </div>
          <div style="border-top: 1px dashed var(--border-color); margin-top: 10px; padding-top: 10px;">
            <span style="color: var(--text-muted); font-size: 0.75rem;">SHA-256 Ledger Hash:</span>
            <div class="mono" style="font-size: 0.68rem; color: var(--text-subtle); word-break: break-all; margin-top: 4px;">
              ${blockHash}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 12px;">
          <button id="close-receipt-btn" class="btn btn-primary" style="flex: 1;">
            Done
          </button>
          <button id="print-receipt-btn" class="btn btn-secondary">
            🖨️ Print
          </button>
        </div>
      </div>
    `;

    this.overlay.classList.add('active');

    this.overlay.querySelector('#close-receipt-btn').addEventListener('click', () => {
      this.overlay.classList.remove('active');
    });

    this.overlay.querySelector('#print-receipt-btn').addEventListener('click', () => {
      window.print();
    });
  }
}

export const receiptModal = new ReceiptModalComponent();
