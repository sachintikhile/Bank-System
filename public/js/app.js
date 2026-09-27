import { store } from './store.js';
import { AppShell } from './components/shell.js';
import { DashboardView } from './views/dashboard.js';
import { AccountsView } from './views/accounts.js';
import { TransfersView } from './views/transfers.js';
import { CardsView } from './views/cards.js';
import { LoansView } from './views/loans.js';
import { AnalyticsView } from './views/analytics.js';
import { AuditView } from './views/audit.js';

/**
 * ApexBank Comprehensive Frontend Application Controller
 */
export class App {
  constructor() {
    this.root = document.getElementById('app');
    this.shell = new AppShell(this.root);
  }

  init() {
    this.render();
    store.subscribe(() => this.renderViewOnly());
  }

  render() {
    this.shell.render();
    this.renderViewOnly();
  }

  renderViewOnly() {
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');
    const state = store.getState();

    if (!mainContent) return;

    switch (state.currentView) {
      case 'dashboard':
        if (pageTitle) pageTitle.textContent = 'Financial Overview';
        new DashboardView(mainContent).render();
        break;
      case 'accounts':
        if (pageTitle) pageTitle.textContent = 'Accounts & Core Ledger';
        new AccountsView(mainContent).render();
        break;
      case 'transfers':
        if (pageTitle) pageTitle.textContent = 'Pay & Real-Time Transfer';
        new TransfersView(mainContent).render();
        break;
      case 'cards':
        if (pageTitle) pageTitle.textContent = 'Virtual Cards & Tokenization';
        new CardsView(mainContent).render();
        break;
      case 'loans':
        if (pageTitle) pageTitle.textContent = 'Lending, Credit & Amortization';
        new LoansView(mainContent).render();
        break;
      case 'analytics':
        if (pageTitle) pageTitle.textContent = 'Treasury & Liquidity Analytics';
        new AnalyticsView(mainContent).render();
        break;
      case 'audit':
        if (pageTitle) pageTitle.textContent = 'WORM Audit Trail & Compliance';
        new AuditView(mainContent).render();
        break;
      default:
        if (pageTitle) pageTitle.textContent = 'Financial Overview';
        new DashboardView(mainContent).render();
    }
  }
}

// Bootstrap on DOM ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
  });
}
