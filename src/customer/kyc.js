/**
 * KYC Verification States & Risk Tiers
 */
export const KycStatus = Object.freeze({
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
});

export const RiskTier = Object.freeze({
  TIER_1: { code: 'TIER_1', name: 'Low Risk', dailyTransferLimitInCents: 10000000 },    // $100,000/day
  TIER_2: { code: 'TIER_2', name: 'Standard Risk', dailyTransferLimitInCents: 2500000 }, // $25,000/day
  TIER_3: { code: 'TIER_3', name: 'Enhanced Due Diligence', dailyTransferLimitInCents: 500000 }, // $5,000/day
});
