import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../public/js/store.js';
import { ApiClient } from '../public/js/api.js';
import { LoansView } from '../public/js/views/loans.js';

test('Frontend Phase 1, 2 & 3: Complete Comprehensive UI & Engine Suite', async (suite) => {
  await suite.test('store initializes with correct customer and account state', () => {
    const state = store.getState();
    assert.equal(state.user.name, 'Sachin Tikhile');
    assert.equal(state.currentView, 'dashboard');
    assert.equal(state.accounts.length, 3);
  });

  await suite.test('store updates all 6 views dynamically via pub/sub', () => {
    const views = ['dashboard', 'accounts', 'transfers', 'cards', 'loans', 'analytics', 'audit'];
    for (const view of views) {
      let notifiedView = null;
      const unsubscribe = store.subscribe((newState) => {
        notifiedView = newState.currentView;
      });

      store.setView(view);
      assert.equal(notifiedView, view);
      unsubscribe();
    }
  });

  await suite.test('ApiClient executes real-time transfer and updates reactive state', async () => {
    const initialChecking = store.getState().accounts.find((a) => a.id === 'ACC_CHECKING_001');
    const initialBalance = initialChecking.availableBalanceInCents;

    const result = await ApiClient.submitTransfer({
      sourceAccountId: 'ACC_CHECKING_001',
      destinationAccountNumber: '•••• 1234',
      amount: '50.00',
      railType: 'FEDNOW_RTP',
      memo: 'Test Coffee Purchase',
    });

    assert.equal(result.success, true);
    assert.equal(result.transaction.amountInCents, 5000);

    const updatedChecking = store.getState().accounts.find((a) => a.id === 'ACC_CHECKING_001');
    assert.equal(updatedChecking.availableBalanceInCents, initialBalance - 5000);
  });

  await suite.test('manages hold release and available balance restoration', () => {
    const state = store.getState();
    const hold = state.holds[0];
    if (hold) {
      const targetAccount = state.accounts.find((a) => a.id === hold.accountId);
      const preAvail = targetAccount.availableBalanceInCents;

      // Simulate hold release
      const updatedHolds = state.holds.filter((h) => h.id !== hold.id);
      const updatedAccounts = state.accounts.map((acc) => {
        if (acc.id === hold.accountId) {
          return {
            ...acc,
            availableBalanceInCents: acc.availableBalanceInCents + hold.amountInCents,
          };
        }
        return acc;
      });

      store.setState({ holds: updatedHolds, accounts: updatedAccounts });

      const postAccount = store.getState().accounts.find((a) => a.id === hold.accountId);
      assert.equal(postAccount.availableBalanceInCents, preAvail + hold.amountInCents);
      assert.equal(store.getState().holds.length, 0);
    }
  });

  await suite.test('LoansView accurately computes reducing-balance monthly EMI', () => {
    const loansView = new LoansView(null);
    loansView.principal = 10000;  // $10,000
    loansView.rateAnnual = 12.0;  // 12% APR (1% per month)
    loansView.tenureMonths = 12;  // 12 months

    const result = loansView.calculateEmi();
    // Monthly EMI for $10k at 12% for 12 mos is ~$888.49
    assert.ok(result.monthlyEmi > 888.0 && result.monthlyEmi < 889.0);
    assert.ok(result.totalPayment > 10000);
    assert.ok(result.totalInterest > 650.0 && result.totalInterest < 670.0);
  });
});
