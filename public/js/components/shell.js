import { store } from '../store.js';
import { authModal } from './auth-modal.js';

/**
 * Global Application Shell Component (Sidebar + Top Navbar)
 */
export class AppShell {
  constructor(container) {
    this.container = container;
  }

  render() {
    const state = store.getState();
    const unreadNotifications = state.notifications.filter((n) => !n.read).length;

    this.container.innerHTML = `
      <div class="app-container">
        <!-- Sidebar Navigation -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="brand-icon">A</div>
            <div>
              <div class="brand-title">ApexBank <span class="brand-badge">CORE</span></div>
              <div style="font-size: 0.72rem; color: var(--text-subtle);">v1.0.0 Enterprise</div>
            </div>
          </div>

          <nav class="sidebar-nav">
            <a class="nav-item ${state.currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
              <span class="nav-icon">📊</span>
              <span>Overview</span>
            </a>
            <a class="nav-item ${state.currentView === 'accounts' ? 'active' : ''}" data-view="accounts">
              <span class="nav-icon">🏦</span>
              <span>Accounts & Ledger</span>
            </a>
            <a class="nav-item ${state.currentView === 'transfers' ? 'active' : ''}" data-view="transfers">
              <span class="nav-icon">💸</span>
              <span>Pay & Transfer</span>
            </a>
            <a class="nav-item ${state.currentView === 'cards' ? 'active' : ''}" data-view="cards">
              <span class="nav-icon">💳</span>
              <span>Virtual Cards</span>
            </a>
            <a class="nav-item ${state.currentView === 'loans' ? 'active' : ''}" data-view="loans">
              <span class="nav-icon">📈</span>
              <span>Lending & Credit</span>
            </a>
            <a class="nav-item ${state.currentView === 'audit' ? 'active' : ''}" data-view="audit">
              <span class="nav-icon">🛡️</span>
              <span>Audit & WORM Trail</span>
            </a>
          </nav>

          <div style="padding: 16px; border-top: 1px solid var(--border-subtle); background: rgba(0,0,0,0.2);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-subtle);">SYSTEM STATUS</div>
                <div style="font-size: 0.8rem; font-weight: 600; color: #34d399; display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #34d399; display: inline-block;"></span>
                  Five-Nines Active
                </div>
              </div>
              <button id="auth-trigger-btn" class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.75rem;">
                Auth
              </button>
            </div>
          </div>
        </aside>

        <!-- Main Workspace -->
        <div class="main-wrapper">
          <header class="top-navbar">
            <div style="display: flex; align-items: center; gap: 16px;">
              <h2 id="page-title" style="font-size: 1.15rem; font-weight: 600;">Financial Overview</h2>
              <span class="badge badge-success">● FedNow Connected</span>
            </div>

            <div style="display: flex; align-items: center; gap: 20px;">
              <!-- Notifications Dropdown Trigger -->
              <div style="position: relative; cursor: pointer;" id="notif-bell">
                <span style="font-size: 1.25rem;">🔔</span>
                ${
                  unreadNotifications > 0
                    ? `<span style="position: absolute; top: -4px; right: -4px; background: #EF4444; color: #fff; font-size: 0.65rem; font-weight: 700; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">${unreadNotifications}</span>`
                    : ''
                }
              </div>

              <!-- User Profile Chip -->
              <div style="display: flex; align-items: center; gap: 10px; background: var(--bg-card); padding: 6px 14px; border-radius: var(--radius-full); border: 1px solid var(--border-color);">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: #0052FF; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem;">
                  ST
                </div>
                <div style="line-height: 1.2;">
                  <div style="font-size: 0.85rem; font-weight: 600;">${state.user.name}</div>
                  <div style="font-size: 0.7rem; color: #34d399;">KYC Verified (Tier 1)</div>
                </div>
              </div>
            </div>
          </header>

          <main id="main-content" class="page-content">
            <!-- Dynamic Subviews Injected Here -->
          </main>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const view = item.getAttribute('data-view');
        store.setView(view);
      });
    });

    const authBtn = this.container.querySelector('#auth-trigger-btn');
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        authModal.open('LOGIN');
      });
    }

    const notifBell = this.container.querySelector('#notif-bell');
    if (notifBell) {
      notifBell.addEventListener('click', () => {
        const notifs = store.getState().notifications;
        alert(`Notifications:\n\n` + notifs.map((n) => `• ${n.text}`).join('\n'));
      });
    }
  }
}
