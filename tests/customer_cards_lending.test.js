import test from 'node:test';
import assert from 'node:assert/strict';
import { CustomerService } from '../src/customer/customer_service.js';
import { KycStatus } from '../src/customer/kyc.js';
import { CardService, CardStatus } from '../src/cards/card_service.js';
import { TokenizationService } from '../src/cards/tokenization.js';
import { LoanService, LoanStatus } from '../src/lending/loan_service.js';
import { AccrualEngine } from '../src/lending/accrual_engine.js';
import { RbacService, UserRole, Permissions } from '../src/security/rbac.js';
import { FourEyesService, ApprovalStatus } from '../src/security/four_eyes.js';

test('Task 6: Customer, Cards, Lending & Security Suite', async (suite) => {
  await suite.test('CustomerService: handles onboarding, CIF assignment, and KYC verification', () => {
    const service = new CustomerService();

    // 1. Successful onboarding
    const customer = service.registerCustomer({
      firstName: 'Sachin',
      lastName: 'Tikhile',
      email: 'sachin@apexbank.io',
    });

    assert.ok(customer.id.startsWith('CUST_'));
    assert.ok(customer.cifNumber.startsWith('CIF-'));
    assert.equal(customer.kycStatus, KycStatus.PENDING);

    // 2. Submit KYC Document
    service.submitKycDocument(customer.id, {
      type: 'PASSPORT',
      number: 'Z9876543',
    });

    const verifiedCustomer = service.getCustomer(customer.id);
    assert.equal(verifiedCustomer.kycStatus, KycStatus.VERIFIED);

    // 3. Blocklist rejection
    assert.throws(
      () => {
        service.registerCustomer({
          firstName: 'Vladimir',
          lastName: 'Bad Actor',
          email: 'blocked@entity.com',
        });
      },
      { message: /matched international sanction blocklist/ }
    );
  });

  await suite.test('CardService: issues virtual cards and enforces dynamic spend rules', () => {
    const cardService = new CardService();

    const card = cardService.issueVirtualCard({
      accountId: 'ACC_CHECKING_001',
      cardholderName: 'Sachin Tikhile',
      monthlyLimitInCents: 100000, // $1,000.00
      controls: { allowOnline: true, allowInternational: false, allowAtm: false },
    });

    assert.equal(card.status, CardStatus.ACTIVE);
    assert.ok(card.maskedPan.startsWith('•••• •••• •••• '));

    // 1. Approved domestic online purchase ($250.00)
    const auth1 = cardService.evaluateAuthorization({
      cardId: card.cardId,
      amountInCents: 25000,
      isOnline: true,
      isInternational: false,
    });
    assert.equal(auth1.authorized, true);
    assert.ok(auth1.authCode.startsWith('AUTH_'));

    // 2. Rejected international purchase (disallowed by policy)
    const auth2 = cardService.evaluateAuthorization({
      cardId: card.cardId,
      amountInCents: 5000,
      isInternational: true,
    });
    assert.equal(auth2.authorized, false);
    assert.match(auth2.rejectionReason, /International cross-border transactions disabled/);

    // 3. Rejected: exceeds monthly limit
    const auth3 = cardService.evaluateAuthorization({
      cardId: card.cardId,
      amountInCents: 80000, // $800 + $250 = $1050 > $1000
      isOnline: true,
    });
    assert.equal(auth3.authorized, false);
    assert.match(auth3.rejectionReason, /exceeds monthly ceiling/);
  });

  await suite.test('LoanService & AccrualEngine: computes reducing-balance schedule and daily interest', () => {
    const loanService = new LoanService();

    const loan = loanService.originateLoan({
      customerId: 'CUST_001',
      accountId: 'ACC_CHECKING_001',
      principalInCents: 1000000, // $10,000.00
      annualRatePercent: 12.0,   // 12% APR
      tenureMonths: 12,
    });

    assert.equal(loan.status, LoanStatus.ACTIVE);
    assert.equal(loan.schedule.length, 12);
    assert.ok(loan.monthlyEmiInCents > 88000 && loan.monthlyEmiInCents < 89000);

    // Daily accrual calculation on $10,000 at 12% APR:
    // (10,000 * 0.12) / 365 = ~$3.287 -> 329 cents
    const dailyInterest = loanService.runDailyAccrual(loan.loanId);
    assert.equal(dailyInterest, 329);
    assert.equal(loan.accumulatedAccruedInterestInCents, 329);

    // Process repayment of $1,000.00
    const repayment = loanService.processRepayment(loan.loanId, 100000);
    assert.equal(repayment.interestPaid, 329);
    assert.equal(repayment.principalPaid, 100000 - 329);
    assert.equal(loan.accumulatedAccruedInterestInCents, 0);
  });

  await suite.test('RbacService & FourEyesService: enforces dual authorization and permissions', () => {
    // 1. RBAC Check
    assert.equal(RbacService.hasPermission(UserRole.RETAIL_CLIENT, Permissions.TRANSFER_INITIATE), true);
    assert.equal(RbacService.hasPermission(UserRole.RETAIL_CLIENT, Permissions.ACCOUNT_FREEZE), false);
    assert.equal(RbacService.hasPermission(UserRole.SUPER_ADMIN, Permissions.ACCOUNT_FREEZE), true);

    // 2. Four-Eyes Dual Authorization Workflow
    const fourEyes = new FourEyesService(2500000); // $25,000 threshold

    assert.equal(fourEyes.requiresDualApproval(1000000), false); // $10,000 -> No
    assert.equal(fourEyes.requiresDualApproval(5000000), true);  // $50,000 -> Yes

    // Maker initiates high-value wire request
    const req = fourEyes.submitRequest({
      makerUserId: 'OPERATOR_ALICE',
      actionType: 'HIGH_VALUE_WIRE',
      amountInCents: 5000000,
      payload: { destination: 'IBAN_CORP_9912' },
    });
    assert.equal(req.status, ApprovalStatus.PENDING_CHECKER);

    // Violation: Maker cannot approve their own request!
    assert.throws(
      () => {
        fourEyes.decideRequest({
          requestId: req.requestId,
          checkerUserId: 'OPERATOR_ALICE', // Same as maker!
          approved: true,
        });
      },
      { message: /The Checker cannot be the same user as the Maker/ }
    );

    // Valid Checker approves
    const approvedResult = fourEyes.decideRequest({
      requestId: req.requestId,
      checkerUserId: 'OPERATOR_BOB',
      approved: true,
      reason: 'Verified supporting invoice documentation.',
    });
    assert.equal(approvedResult.status, ApprovalStatus.APPROVED);
    assert.equal(approvedResult.checkerUserId, 'OPERATOR_BOB');
  });
});
