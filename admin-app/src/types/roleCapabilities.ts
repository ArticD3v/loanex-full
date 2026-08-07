/**
 * Future role-based visibility flags.
 * Phase 1: do not implement permission logic — keep defaults false / undefined.
 * Backend will later return the logged-in role; screens pass derived capabilities.
 */
export interface FiRoleCapabilities {
  canCapturePhoto?: boolean;
  canUploadPhoto?: boolean;
  canCaptureGps?: boolean;
  canEnterRemarks?: boolean;
  canSubmitFi?: boolean;
  canReview?: boolean;
  canApprove?: boolean;
}

export const DEFAULT_FI_ROLE_CAPABILITIES: Required<FiRoleCapabilities> = {
  canCapturePhoto: false,
  canUploadPhoto: false,
  canCaptureGps: false,
  canEnterRemarks: false,
  canSubmitFi: false,
  canReview: false,
  canApprove: false,
};
