import { store } from './store.js';
import { AppShell } from './components/shell.js';
import { DashboardView } from './views/dashboard.js';

/**
 * ApexBank Frontend Application Controller
 */
class App {
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

    if (state.currentView === 'dashboard') {
      if (pageTitle) pageTitle.textContent = 'Financial Overview';
      new DashboardView(mainContent).render();
    } else {
      if (pageTitle) pageTitle.textContent = state.currentView.toUpperCase();
      mainContent.innerHTML = `
        <div class="card" style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🚧</div>
          <h3>${state.currentView.toUpperCase()} Module</h3>
          <p style="color: var(--text-muted); margin-top: 8px;">
            This module will be rendered by the upcoming frontend task.
          </p>
          <button class="btn btn-primary" style="margin-top: 20px;" onclick="window.history.back?.() || store.setView('dashboard')">
            Return to Dashboard
          </button>
        </div>
      `;
    }
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
