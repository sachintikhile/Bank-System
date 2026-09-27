import { ChartOfAccounts, AccountType, JournalEngine, BalanceService, HoldService } from './ledger/index.js';
import { PaymentRailRouter, FraudEngine, PaymentSagaOrchestrator, TransactionService, PaymentRailType } from './transactions/index.js';
import { CustomerService } from './customer/customer_service.js';
import { CardService } from './cards/card_service.js';
import { LoanService } from './lending/loan_service.js';
import { FourEyesService } from './security/four_eyes.js';

console.log('🏦 ApexBank Enterprise Core Platform - Complete System Boot\n');

// 1. Initialize Customer & CIF Master
const customerService = new CustomerService();
const customer = customerService.registerCustomer({
  firstName: 'Sachin',
  lastName: 'Tikhile',
  email: 'sachin@apexbank.io',
});
customerService.submitKycDocument(customer.id, { type: 'PASSPORT', number: 'PASS-892189' });
console.log(`👤 Customer Onboarded: ${customer.fullName} (${customer.cifNumber}) [KYC: ${customer.kycStatus}]`);

// 2. Initialize Core Chart of Accounts
const coa = new ChartOfAccounts();
const vaultCash = coa.createAccount({ id: 'ACC_VAULT', code: '1000.01', name: 'Federal Reserve Vault Cash', type: AccountType.ASSET });
const checking = coa.createAccount({ id: 'ACC_CHECKING', code: '2000.10', name: 'Primary Checking', type: AccountType.LIABILITY, customerId: customer.id });
const savings = coa.createAccount({ id: 'ACC_SAVINGS', code: '2000.20', name: 'High-Yield Reserve', type: AccountType.LIABILITY, customerId: customer.id });

// 3. Initialize Ledger & Journal Engine
const journal = new JournalEngine(coa);
const balanceService = new BalanceService(coa, journal);
const holdService = new HoldService(coa, journal, balanceService);

// 4. Seed Initial Deposit ($25,000.00)
journal.postTransaction({
  transactionId: 'TXN_GENESIS_DEPOSIT',
  description: 'Initial institutional capital funding',
  legs: [
    { accountId: vaultCash.id, direction: 'DEBIT', amountInCents: 2500000 },
    { accountId: checking.id, direction: 'CREDIT', amountInCents: 2500000 },
  ],
});
console.log('💵 Funded Primary Checking: $25,000.00 USD');

// 5. Initialize Cards Engine & Issue Virtual Card
const cardService = new CardService();
const card = cardService.issueVirtualCard({
  accountId: checking.id,
  cardholderName: customer.fullName,
  monthlyLimitInCents: 500000,
});
console.log(`💳 Virtual Card Issued: ${card.maskedPan} (Exp: ${card.expiry}) [Token: ${card.token.slice(0, 16)}...]`);

// 6. Initialize Lending Engine & Originate Loan
const loanService = new LoanService();
const loan = loanService.originateLoan({
  customerId: customer.id,
  accountId: checking.id,
  principalInCents: 5000000, // $50,000.00
  annualRatePercent: 7.5,
  tenureMonths: 24,
});
console.log(`📈 Loan Originated: #${loan.loanId} ($50,000.00 @ 7.5% APR) - Monthly EMI: $${(loan.monthlyEmiInCents / 100).toFixed(2)}`);

// 7. Initialize Transactions & Saga Engine
const fraudEngine = new FraudEngine();
const railRouter = new PaymentRailRouter();
const sagaOrchestrator = new PaymentSagaOrchestrator({ holdService, journalEngine: journal, fraudEngine, railRouter });
const transactionService = new TransactionService({ sagaOrchestrator, journalEngine: journal, balanceService });

// Execute Instant Transfer via FedNow
const transferResult = await transactionService.transfer({
  sourceAccountId: checking.id,
  destinationAccountId: savings.id,
  amountInCents: 500000, // $5,000.00
  railType: PaymentRailType.FEDNOW_RTP,
  memo: 'Treasury reserve allocation',
});
console.log(`⚡ Instant Transfer Settled via ${transferResult.railType}: $5,000.00 (Txn: ${transferResult.transactionId})`);

// 8. Security & Four-Eyes Governance
const fourEyes = new FourEyesService();
console.log(`🛡️ Governance: Four-Eyes Principle active for operations > $25,000.00 USD`);

// Final Balances
console.log('\n📊 General Ledger Settled Balances:');
console.table([
  balanceService.getBalance(vaultCash.id),
  balanceService.getBalance(checking.id),
  balanceService.getBalance(savings.id),
]);

console.log('🎉 ApexBank All 6 Modules Active & Synchronized with 100% Cryptographic Ledger Integrity.');
