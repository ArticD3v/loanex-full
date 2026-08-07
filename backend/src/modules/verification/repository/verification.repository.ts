import { jsonDb } from '../../../config/json-db';

export class VerificationRepository {
  // ─── KYC status from customer_kyc ───────────────────────────────────────────

  async findKycByUserId(userId: string) {
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
    const existing = jsonDb.findOne('customer_kyc', { userId });
    if (existing) {
      jsonDb.update('customer_kyc', { id: existing.id }, data);
      return jsonDb.findOne('customer_kyc', { id: existing.id });
    }
    return jsonDb.insert('customer_kyc', { userId, ...data });
  }

  // ─── DigiLocker reports ──────────────────────────────────────────────────────

  async findDigilockerByProfileId(profileId: string) {
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
    const existing = jsonDb.findOne('digilocker_reports', { profileId });
    if (existing) {
      jsonDb.update('digilocker_reports', { id: existing.id }, data);
      return jsonDb.findOne('digilocker_reports', { id: existing.id });
    }
    return jsonDb.insert('digilocker_reports', { profileId, ...data });
  }

  // ─── User helpers ────────────────────────────────────────────────────────────

  findUserById(userId: string) {
    const user = jsonDb.findOne('users', { id: userId });
    if (!user) return null;
    const profile = jsonDb.findOne('profiles', { id: userId });
    return { ...user, profiles: profile || null };
  }

  findProfileById(userId: string) {
    return jsonDb.findOne('profiles', { id: userId });
  }

  // ─── KYC status summary ──────────────────────────────────────────────────────

  async getStatus(userId: string) {
    const kyc = await this.findKycByUserId(userId);
    const user = jsonDb.findOne('users', { id: userId });
    const customer = jsonDb.findOne('customerVerification', { userId });

    const mobileVerified = true; // OTP login = mobile verified
    const aadhaarVerified = Boolean(kyc?.aadharVerified || customer?.aadhaarVerified || user?.aadhaarVerified);
    const panVerified = Boolean(kyc?.pan_verified || customer?.panVerified || user?.panVerified);
    const faceVerified = Boolean(kyc?.face_verified);
    const bankVerified = Boolean(customer?.bankVerified || user?.bankVerified);

    const completedSteps = [mobileVerified, aadhaarVerified, panVerified, bankVerified].filter(
      Boolean,
    ).length;

    // Face is optional / not part of the live Aadhaar → PAN → Bank → EMI flow.
    const totalSteps = 4;
    const overallProgress = Math.round((completedSteps / totalSteps) * 100);

    return {
      mobileVerified,
      aadhaarVerified,
      panVerified,
      faceVerified,
      bankVerified,
      overallProgress,
      completedSteps,
      totalSteps,
      verificationStatus:
        completedSteps === 0
          ? 'NOT_STARTED'
          : completedSteps === totalSteps
            ? 'COMPLETED'
            : 'IN_PROGRESS',
      kyc,
      message: 'Status fetched',
    };
  }
}

export const verificationRepository = new VerificationRepository();
