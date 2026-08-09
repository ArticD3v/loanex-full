import { jsonDb } from '../../../config/json-db';
import { authRepository } from '../../auth/auth.repository';

export class VerificationRepository {
  // ─── KYC status from customer_kyc ───────────────────────────────────────────

  /**
   * Always refresh from MongoDB (when primary) so warm serverless instances
   * see KYC writes performed by other instances.
   */
  async findKycByUserId(userId: string) {
    await jsonDb.refreshCollection('customer_kyc');
    return jsonDb.findOne('customer_kyc', { userId });
  }

  async upsertKyc(
    userId: string,
    data: {
      aadharVerified?: boolean;
      aadhar_number?: string;
      aadharRawData?: any;
      fullName?: string;
      dob?: string;
      gender?: string;
      address?: any;
      pan_verified?: boolean;
      panNumber?: string;
      cibil_score?: number;
      experianRawData?: any;
      kycCompleted?: boolean;
      kycCompletedAt?: Date;
      face_verified?: boolean;
      faceMatchScore?: number;
      faceRawData?: any;
    },
  ) {
    await jsonDb.refreshCollection('customer_kyc');
    const existing = jsonDb.findOne('customer_kyc', { userId });
    if (existing) {
      return jsonDb.updateAwaited('customer_kyc', { id: existing.id }, data);
    }
    return jsonDb.insertAwaited('customer_kyc', { userId, ...data });
  }

  // ─── DigiLocker reports ──────────────────────────────────────────────────────

  async findDigilockerByProfileId(profileId: string) {
    await jsonDb.refreshCollection('digilocker_reports');
    const records = jsonDb.findMany('digilocker_reports', { profileId });
    if (records.length === 0) return null;
    return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  async upsertDigilocker(
    profileId: string,
    data: {
      clientId?: string;
      name?: string;
      gender?: string;
      dob?: string;
      careOf?: string;
      yob?: string;
      zip?: string;
      masked_aadhaar?: string;
      fullAddress?: string;
      father_name?: string;
      profileImage?: string;
      xml_url?: string;
      rawData?: any;
    },
  ) {
    await jsonDb.refreshCollection('digilocker_reports');
    const existing = jsonDb.findOne('digilocker_reports', { profileId });
    if (existing) {
      return jsonDb.updateAwaited('digilocker_reports', { id: existing.id }, data);
    }
    return jsonDb.insertAwaited('digilocker_reports', { profileId, ...data });
  }

  // ─── User helpers ────────────────────────────────────────────────────────────

  /**
   * Use auth repository so serverless instances that hydrated before this
   * user was created still resolve the account from Supabase (same as login).
   */
  async findUserById(userId: string) {
    return authRepository.findById(userId);
  }

  findProfileById(userId: string) {
    return jsonDb.findOne('profiles', { id: userId });
  }

  // ─── KYC status summary ──────────────────────────────────────────────────────

  async getStatus(userId: string) {
    const kyc = await this.findKycByUserId(userId);
    const user = await this.findUserById(userId);
    const customer = jsonDb.findOne('customerVerification', { userId });

    const mobileVerified = true; // OTP login = mobile verified
    const aadhaarVerified = Boolean(kyc?.aadharVerified || customer?.aadhaarVerified || user?.aadhaarVerified);
    const panVerified = Boolean(kyc?.pan_verified || customer?.panVerified || user?.panVerified);
    const faceVerified = Boolean(kyc?.face_verified);
    const bankVerified = Boolean(customer?.bankVerified || user?.bankVerified);

    // Bank verification is temporarily disabled — the live KYC flow is
    // Aadhaar (DigiLocker) → PAN/Experian → EMI. Completion is derived from
    // the same core steps the web uses (mobile + Aadhaar + PAN); face is a
    // security re-check on every EMI application, not a completion gate.
    const coreSteps = [mobileVerified, aadhaarVerified, panVerified].filter(
      Boolean,
    ).length;
    const totalSteps = 3;
    const overallProgress = Math.round((coreSteps / totalSteps) * 100);

    return {
      mobileVerified,
      aadhaarVerified,
      panVerified,
      faceVerified,
      bankVerified,
      overallProgress,
      completedSteps: coreSteps,
      totalSteps,
      verificationStatus:
        coreSteps === 0
          ? 'NOT_STARTED'
          : coreSteps === totalSteps
            ? 'COMPLETED'
            : 'IN_PROGRESS',
      kycCompleted: coreSteps === totalSteps,
      kyc,
      message: 'Status fetched',
    };
  }
}

export const verificationRepository = new VerificationRepository();
