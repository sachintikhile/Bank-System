/**
 * Role Definitions & Permission Matrix
 */
export const UserRole = Object.freeze({
  RETAIL_CLIENT: 'RETAIL_CLIENT',
  TELLER: 'TELLER',
  COMPLIANCE_AUDITOR: 'COMPLIANCE_AUDITOR',
  TREASURY_OFFICER: 'TREASURY_OFFICER',
  SUPER_ADMIN: 'SUPER_ADMIN',
});

export const Permissions = Object.freeze({
  ACCOUNT_VIEW: 'ACCOUNT_VIEW',
  TRANSFER_INITIATE: 'TRANSFER_INITIATE',
  TRANSFER_HIGH_VALUE_AUTHORIZE: 'TRANSFER_HIGH_VALUE_AUTHORIZE',
  ACCOUNT_FREEZE: 'ACCOUNT_FREEZE',
  LOAN_ORIGINATE: 'LOAN_ORIGINATE',
  AUDIT_LOG_EXPORT: 'AUDIT_LOG_EXPORT',
});

const ROLE_PERMISSIONS_MAP = {
  [UserRole.RETAIL_CLIENT]: [Permissions.ACCOUNT_VIEW, Permissions.TRANSFER_INITIATE],
  [UserRole.TELLER]: [Permissions.ACCOUNT_VIEW, Permissions.TRANSFER_INITIATE, Permissions.ACCOUNT_FREEZE],
  [UserRole.COMPLIANCE_AUDITOR]: [Permissions.ACCOUNT_VIEW, Permissions.AUDIT_LOG_EXPORT, Permissions.ACCOUNT_FREEZE],
  [UserRole.TREASURY_OFFICER]: [
    Permissions.ACCOUNT_VIEW,
    Permissions.TRANSFER_INITIATE,
    Permissions.TRANSFER_HIGH_VALUE_AUTHORIZE,
    Permissions.LOAN_ORIGINATE,
  ],
  [UserRole.SUPER_ADMIN]: Object.values(Permissions),
};

export class RbacService {
  /**
   * Evaluates if a role has the required permission
   * @param {string} role
   * @param {string} permission
   */
  static hasPermission(role, permission) {
    const list = ROLE_PERMISSIONS_MAP[role] || [];
    return list.includes(permission);
  }
}
