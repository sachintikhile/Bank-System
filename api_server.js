import http from 'node:http';
import { ChartOfAccounts, AccountType, JournalEngine, BalanceService, HoldService, EntryDirection } from './src/ledger/index.js';
import { PaymentRailRouter, FraudEngine, PaymentSagaOrchestrator, TransactionService, PaymentRailType } from './src/transactions/index.js';
import { CustomerService } from './src/customer/customer_service.js';
import { CardService } from './src/cards/card_service.js';
import { LoanService } from './src/lending/loan_service.js';
import { FourEyesService } from './src/security/four_eyes.js';

// 1. Initialize Customer & CIF Master
const customerService = new CustomerService();
const customer = customerService.registerCustomer({
  firstName: 'Sachin',
  lastName: 'Tikhile',
  email: 'sachin@apexbank.io',
});
customerService.submitKycDocument(customer.id, { type: 'PASSPORT', number: 'PASS-892189' });

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
    { accountId: vaultCash.id, direction: EntryDirection.DEBIT, amountInCents: 2500000 },
    { accountId: checking.id, direction: EntryDirection.CREDIT, amountInCents: 2500000 },
  ],
});

// 5. Initialize Cards Engine
const cardService = new CardService();
const defaultCard = cardService.issueVirtualCard({
  accountId: checking.id,
  cardholderName: customer.fullName,
  monthlyLimitInCents: 500000,
});

// 6. Initialize Lending Engine
const loanService = new LoanService();
const defaultLoan = loanService.originateLoan({
  customerId: customer.id,
  accountId: checking.id,
  principalInCents: 5000000,
  annualRatePercent: 7.5,
  tenureMonths: 24,
});

// 7. Initialize Transactions & Saga
const fraudEngine = new FraudEngine();
const railRouter = new PaymentRailRouter();
const sagaOrchestrator = new PaymentSagaOrchestrator({ holdService, journalEngine: journal, fraudEngine, railRouter });
const transactionService = new TransactionService({ sagaOrchestrator, journalEngine: journal, balanceService });

// 8. Security & Four-Eyes
const fourEyes = new FourEyesService();

// Helper to parse JSON body
function getJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
  });
  res.end(JSON.stringify(data, null, 2));
}

// REST HTTP Server
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  try {
    // Health Check
    if (pathname === '/api/health') {
      return sendJson(res, 200, {
        status: 'UP',
        engine: 'ApexBank Financial Core',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    }

    // Customer Profile & KYC
    if (pathname === '/api/customer' && req.method === 'GET') {
      return sendJson(res, 200, { customer: customerService.getCustomer(customer.id) });
    }

    // Accounts & Balances
    if (pathname === '/api/accounts' && req.method === 'GET') {
      const accounts = coa.listAccounts().map((acc) => {
        const bal = balanceService.getBalance(acc.id);
        const avail = holdService.getAvailableBalance(acc.id);
        return {
          ...acc,
          ...bal,
          availableBalanceInCents: avail.availableBalanceInCents,
        };
      });
      return sendJson(res, 200, { accounts });
    }

    // General Ledger Trial Balance
    if (pathname === '/api/ledger/trial-balance' && req.method === 'GET') {
      return sendJson(res, 200, balanceService.generateTrialBalance('USD'));
    }

    // Payments: Execute Transfer
    if (pathname === '/api/payments/transfers' && req.method === 'POST') {
      const body = await getJsonBody(req);
      const idempotencyKey = req.headers['idempotency-key'] || body.idempotencyKey;

      const result = await transactionService.transfer({
        idempotencyKey,
        sourceAccountId: body.sourceAccountId || checking.id,
        destinationAccountId: body.destinationAccountId || savings.id,
        amountInCents: Number(body.amountInCents) || 10000,
        railType: body.railType || PaymentRailType.FEDNOW_RTP,
        memo: body.memo || 'API Transfer',
      });

      return sendJson(res, result.status === 'SETTLED' ? 200 : 422, result);
    }

    // Transaction Ledger History
    if (pathname === '/api/transactions' && req.method === 'GET') {
      return sendJson(res, 200, {
        totalEntries: journal.entries.length,
        entries: journal.entries,
      });
    }

    // Virtual Cards
    if (pathname === '/api/cards' && req.method === 'GET') {
      return sendJson(res, 200, { cards: Array.from(cardService.cards.values()) });
    }

    // Lending Facilities
    if (pathname === '/api/loans' && req.method === 'GET') {
      return sendJson(res, 200, { loans: Array.from(loanService.loans.values()) });
    }

    // Audit Trail Cryptographic Verification
    if (pathname === '/api/audit/verify' && req.method === 'GET') {
      const verification = journal.verifyChainIntegrity();
      return sendJson(res, 200, {
        tamperFree: verification.valid,
        entriesVerified: verification.entriesVerified,
        latestBlockHash: journal.latestBlockHash,
      });
    }

    // Fallback 404
    sendJson(res, 404, { error: 'API route not found', path: pathname });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

const PORT = process.env.API_PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 ApexBank Backend REST API running at: http://localhost:${PORT}`);
});
