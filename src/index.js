import { Account, AccountType } from './ledger/account.js';
import { LedgerEngine, EntryDirection } from './ledger/ledger.js';

console.log('🏦 ApexBank Core Engine - System Initialization...\n');

const ledger = new LedgerEngine();

// 1. Chart of Accounts setup
const vaultCash = new Account({
  id: 'ACC_ASSET_VAULT_CASH',
  name: 'Central Bank Vault Cash Reserve',
  type: AccountType.ASSET,
});

const customerAliceChecking = new Account({
  id: 'ACC_LIAB_CUST_ALICE',
  name: 'Alice Cooper Checking Account',
  type: AccountType.LIABILITY,
  customerId: 'CUST_001',
});

const customerBobChecking = new Account({
  id: 'ACC_LIAB_CUST_BOB',
  name: 'Bob Marley Savings Account',
  type: AccountType.LIABILITY,
  customerId: 'CUST_002',
});

ledger.registerAccount(vaultCash);
ledger.registerAccount(customerAliceChecking);
ledger.registerAccount(customerBobChecking);

console.log('✅ Registered Chart of Accounts:');
console.log(` - ${vaultCash.name} [${vaultCash.type}]`);
console.log(` - ${customerAliceChecking.name} [${customerAliceChecking.type}]`);
console.log(` - ${customerBobChecking.name} [${customerBobChecking.type}]\n`);

// 2. Initial Deposit: Alice deposits $1,000.00 cash into her checking account
// Accounting: Debit Vault Cash (Asset +$1000), Credit Alice Checking (Liability +$1000)
console.log('💵 Posting Initial Deposit: Alice deposits $1,000.00...');
ledger.postTransaction({
  transactionId: 'TXN_DEP_001',
  idempotencyKey: 'idem_key_deposit_alice_1000',
  description: 'Cash deposit via branch ATM',
  entries: [
    { accountId: vaultCash.id, direction: EntryDirection.DEBIT, amountInCents: 100000 },
    { accountId: customerAliceChecking.id, direction: EntryDirection.CREDIT, amountInCents: 100000 },
  ],
});

// 3. P2P Transfer: Alice sends $250.00 to Bob
// Accounting: Debit Alice Checking (Liability -$250), Credit Bob Savings (Liability +$250)
console.log('💸 Posting Real-Time Transfer: Alice sends $250.00 to Bob...');
ledger.postTransaction({
  transactionId: 'TXN_P2P_002',
  idempotencyKey: 'idem_key_p2p_alice_bob_250',
  description: 'P2P Transfer for Dinner Bill',
  entries: [
    { accountId: customerAliceChecking.id, direction: EntryDirection.DEBIT, amountInCents: 25000 },
    { accountId: customerBobChecking.id, direction: EntryDirection.CREDIT, amountInCents: 25000 },
  ],
});

// 4. Print Balances
console.log('\n📊 Real-Time Settled Balances:');
console.table([
  ledger.getAccountBalance(vaultCash.id),
  ledger.getAccountBalance(customerAliceChecking.id),
  ledger.getAccountBalance(customerBobChecking.id),
]);

console.log(`\n🎉 Core Ledger Status: All postings balanced. Total Journal Entries: ${ledger.journalEntries.length}`);
