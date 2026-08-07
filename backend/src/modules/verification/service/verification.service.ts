import axios from 'axios';
import { env } from '../../../config/env';
import {
  BadRequestError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { panVerificationRepository } from '../../pan-verification/repository/pan-verification.repository';
import { verificationRepository } from '../repository/verification.repository';
import { auditLogService } from './audit-log.service';

const DIGILOCKER_BASE = 'https://javabackend.idspay.in/api/v1/prod';
const DIGILOCKER_ENDPOINT = '/srv2/validation/digilocker-digital-kyc';

function requireDigilockerCredentials(): {
  api_id: string;
  api_key: string;
  token_id: string;
} {
  const api_id = env.DIGILOCKER_API_ID?.trim() || process.env['DIGILOCKER_API_ID']?.trim() || '';
  const api_key =
    env.DIGILOCKER_API_KEY?.trim() || process.env['DIGILOCKER_API_KEY']?.trim() || '';
  const token_id =
    env.DIGILOCKER_TOKEN_ID?.trim() || process.env['DIGILOCKER_TOKEN_ID']?.trim() || '';

  if (!api_id || !api_key || !token_id) {
    throw new BadRequestError(
      'DigiLocker / IDSPay credentials are not configured. KYC cannot proceed.',
      { code: 'KYC_PROVIDER_NOT_CONFIGURED' },
    );
  }

  return { api_id, api_key, token_id };
}

export class VerificationService {
  async getStatus(userId: string) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    return verificationRepository.getStatus(userId);
  }

  async getMobileStatus(userId: string) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    const mobileVerified = Boolean(
      user.mobileVerified === true ||
        user.mobile_verified === true ||
        String(user.status ?? '').toUpperCase() === 'ACTIVE',
    );
    return {
      mobile: user.phone ?? '',
      mobileVerified,
    };
  }

  async digilockerGenerate(userId: string, aadhaarNumber?: string) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    const profileId = user.profiles?.id;
    if (!profileId) {
      throw new BadRequestError('Please complete your profile before KYC.');
    }

    const creds = requireDigilockerCredentials();
    const frontend = env.FRONTEND_URL || 'https://loanex.vercel.app';
    const redirectUrl = `${frontend}/verification`;
    const logoUrl = `${frontend}/assets/logo.png`;

    const payload: Record<string, any> = {
      ...creds,
      methodName: 'generateToken',
      mobile_number: user.phone ?? '',
      redirectUrl,
      logoUrl,
    };

    if (aadhaarNumber && aadhaarNumber.length === 12) {
      payload['aadhaar_number'] = aadhaarNumber;
    }

    const resp = await axios.post(`${DIGILOCKER_BASE}${DIGILOCKER_ENDPOINT}`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });

    const data = resp.data;
    const clientId = data?.data?.client_id;
    const url = data?.data?.url ?? data?.data?.digilocker_url;

    if (!data?.success && data?.status?.code !== 200) {
      throw new BadRequestError(data?.status?.message ?? 'DigiLocker token generation failed.');
    }

    if (!clientId) {
      throw new BadRequestError('DigiLocker token generation failed: missing client_id');
    }

    await verificationRepository.upsertDigilocker(profileId, { clientId });

    await auditLogService.log({
      userId,
      action: 'DIGILOCKER_TOKEN_GENERATED',
      entity: 'digilocker_reports',
      metadata: { client_id: clientId },
    });

    return {
      client_id: clientId,
      digilocker_url: url ?? null,
      message: 'DigiLocker URL generated. Redirect user to complete Aadhaar verification.',
    };
  }

  async digilockerFetch(userId: string, clientId: string) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    const profileId = user.profiles?.id;
    if (!profileId) {
      throw new BadRequestError('Please complete your profile before KYC.');
    }

    const creds = requireDigilockerCredentials();
    const payload = {
      ...creds,
      methodName: 'fetchDetails',
      client_id: clientId,
    };

    let resp;
    try {
      resp = await axios.post(`${DIGILOCKER_BASE}${DIGILOCKER_ENDPOINT}`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.status?.message ||
        err.response?.data?.message ||
        'DigiLocker verification incomplete or not yet authorized.';
      throw new BadRequestError(msg);
    }

    const data = resp.data;
    if (!data?.success && data?.status?.code !== 200) {
      throw new BadRequestError(data?.status?.message ?? 'DigiLocker fetch failed.');
    }

    const d = data.data ?? {};
    const xml = d?.aadhaar_xml_data ?? {};
    const meta = d?.digilocker_metadata ?? {};
    const name = xml.full_name ?? meta.name ?? '';

    if (!name && !xml.masked_aadhaar) {
      throw new BadRequestError(
        'DigiLocker authorization pending. Please complete login in the popup window.',
      );
    }

    await verificationRepository.upsertDigilocker(profileId, {
      clientId: d.client_id ?? clientId,
      name: xml.full_name ?? meta.name ?? '',
      gender: xml.gender ?? meta.gender ?? '',
      dob: xml.dob ?? meta.dob ?? '',
      careOf: xml.care_of ?? '',
      yob: xml.yob ?? '',
      zip: xml.zip ?? '',
      masked_aadhaar: xml.masked_aadhaar ?? '',
      fullAddress: xml.full_address ?? '',
      father_name: xml.father_name ?? '',
      profileImage: xml.profile_image ?? '',
      xml_url: d.xml_url ?? '',
      rawData: d,
    });

    await verificationRepository.upsertKyc(userId, {
      aadharVerified: true,
      aadhar_number: xml.masked_aadhaar ?? '',
      aadharRawData: d,
      fullName: xml.full_name ?? meta.name ?? '',
      dob: xml.dob ?? meta.dob ?? '',
      gender: xml.gender ?? meta.gender ?? '',
      address: xml.address ?? {},
    });

    await auditLogService.log({
      userId,
      action: 'DIGILOCKER_AADHAAR_VERIFIED',
      entity: 'customer_kyc',
      metadata: { masked_aadhaar: xml.masked_aadhaar },
    });

    return {
      verified: true,
      name: xml.full_name ?? meta.name ?? '',
      gender: xml.gender ?? meta.gender ?? '',
      dob: xml.dob ?? meta.dob ?? '',
      masked_aadhaar: xml.masked_aadhaar ?? '',
      father_name: xml.father_name ?? '',
      address: xml.address ?? {},
      profile_image: xml.profile_image ?? '',
      message: 'Aadhaar verified successfully via DigiLocker.',
    };
  }

  async getAadhaarStatus(userId: string) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    const profileId = user.profiles?.id;
    const kyc = await verificationRepository.findKycByUserId(userId);
    const digilocker = profileId
      ? await verificationRepository.findDigilockerByProfileId(profileId)
      : null;

    return {
      aadhaarVerified: Boolean(kyc?.aadharVerified),
      masked_aadhaar: kyc?.aadhar_number ?? digilocker?.masked_aadhaar ?? null,
      name: kyc?.fullName ?? digilocker?.name ?? null,
      gender: kyc?.gender ?? digilocker?.gender ?? null,
      dob: kyc?.dob ?? digilocker?.dob ?? null,
      client_id: digilocker?.clientId ?? null,
      profileImage: digilocker?.profileImage ?? null,
    };
  }

  async verifyPanAndCreditScore(userId: string, payload: any) {
    const user = await verificationRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    const kyc = await verificationRepository.findKycByUserId(userId);
    if (!kyc?.aadharVerified) {
      throw new BadRequestError('Aadhaar must be verified before fetching credit report.');
    }

    const { mobile_no, pan, first_name, last_name, dob } = payload;
    if (!pan) {
      throw new BadRequestError('PAN is required.');
    }

    const creds = requireDigilockerCredentials();
    const requestPayload = {
      ...creds,
      mobile_no: mobile_no ? String(mobile_no).replace(/\D/g, '').slice(-10) : '',
      pan,
      first_name,
      last_name,
      dob,
    };

    let resp;
    try {
      const endpoint =
        'https://javabackend.idspay.in/api/v1/prod/srv2/credit-report/experian';
      resp = await axios.post(endpoint, requestPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
      });
    } catch (err: any) {
      throw new BadRequestError(err.response?.data?.message ?? 'Experian API failed');
    }

    const data = resp.data;
    const isSuccess =
      data?.status?.code === 200 ||
      data?.statuscode === '200' ||
      data?.statusCode === 200 ||
      data?.status === true;

    if (!isSuccess) {
      const errorMessage =
        data?.statusMessage || data?.message || data?.status?.message || 'Verification failed';
      throw new BadRequestError(`Experian Error: ${errorMessage}`);
    }

    const findScore = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.BureauScore) return String(obj.BureauScore);
      for (const key in obj) {
        const found = findScore(obj[key]);
        if (found) return found;
      }
      return null;
    };

    const extractedScore = findScore(data.data?.result_json) || data.data?.BureauScore || '0';
    const score = parseInt(extractedScore, 10);

    await verificationRepository.upsertKyc(userId, {
      pan_verified: true,
      panNumber: pan,
      cibil_score: score,
      experianRawData: data,
    });

    // Keep bank-verification gates in sync (they read users/customerVerification.panVerified).
    // Does not change Experian verification logic — only mirrors the success flag.
    panVerificationRepository.markUserPanVerified(userId);
    await panVerificationRepository.upsertCustomerPanVerified(userId);

    return {
      verified: true,
      score,
      message: 'PAN verified and credit score fetched successfully.',
      data: data.data,
      nextStep: 'BANK_VERIFICATION' as const,
    };
  }

  async verifyFaceMatch(userId: string, capturedImage: string) {
    const kyc = await verificationRepository.findKycByUserId(userId);
    if (!kyc || !kyc.aadharRawData) {
      throw new BadRequestError('Aadhaar verification must be completed first.');
    }

    const d: any = kyc.aadharRawData;
    const aadhaarPhoto =
      d?.aadhaar_xml_data?.profile_image || d?.digilocker_metadata?.profile_image;
    if (!aadhaarPhoto) {
      throw new BadRequestError('No photo found in Aadhaar data.');
    }

    const cleanCaptured = capturedImage.replace(/^data:image\/[a-z]+;base64,/, '');
    const cleanAadhaar = aadhaarPhoto.replace(/^data:image\/[a-z]+;base64,/, '');
    const creds = requireDigilockerCredentials();

    const requestPayload = {
      ...creds,
      person: cleanCaptured,
      card: cleanAadhaar,
    };

    let resp;
    try {
      const endpoint = 'https://javabackend.idspay.in/api/v1/prod/srv2/face-api/match';
      resp = await axios.post(endpoint, requestPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45_000,
      });
    } catch (err: any) {
      throw new BadRequestError(err.response?.data?.message ?? 'Face verification failed');
    }

    const data = resp.data;
    if (data?.status !== 'success' && data?.statusCode !== '200') {
      throw new BadRequestError(data?.message ?? 'Failed to verify face');
    }

    const result = data?.result;
    if (!result?.is_same_face) {
      throw new BadRequestError('Face mismatch. Please try again in better lighting.');
    }

    await verificationRepository.upsertKyc(userId, {
      face_verified: true,
      faceMatchScore: result.same_face_confidence,
      faceRawData: data,
    });

    return {
      verified: true,
      score: result.same_face_confidence,
      message: 'Face verified successfully',
    };
  }
}

export const verificationService = new VerificationService();
