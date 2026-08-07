import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { hashAccountNumber, maskAccountNumber, normalizeIfsc } from '../../../common/utils/bank';
import { env } from '../../../config/env';
import { jsonDb } from '../../../config/json-db';
import type { VerifyBankBody } from '../dto/bank-verification.dto';
import { verifyBankAccountWithIdsPay } from '../client/idspay-bank.client';
import { bankVerificationRepository } from '../repository/bank-verification.repository';

const BankVerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
} as const;

type BankAccountType = 'SAVINGS' | 'CURRENT';

function requireGeo(): { latitude: string; longitude: string } {
  const latitude =
    process.env['BANK_VERIFICATION_LATITUDE']?.trim() ||
    process.env['IDSPAY_LATITUDE']?.trim() ||
    '28.6139';
  const longitude =
    process.env['BANK_VERIFICATION_LONGITUDE']?.trim() ||
    process.env['IDSPAY_LONGITUDE']?.trim() ||
    '77.2090';
  return { latitude, longitude };
}

/**
 * Bank account verification via IDSPay POST /bank/verify-account.
 * Statement PDF analysis temporarily disabled (IDSPay: not authorized for that service).
 */
export class BankVerificationService {
  async getStatus(userId: string) {
    const user = await bankVerificationRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const customer = await bankVerificationRepository.findCustomerVerification(userId);
    const latest = await bankVerificationRepository.findLatestByUserId(userId);
    const kyc = jsonDb.findOne('customer_kyc', { userId });
    const bankVerified = Boolean(user.bankVerified || customer?.bankVerified);

    return {
      bankVerified,
      panVerified: Boolean(customer?.panVerified || user.panVerified || kyc?.pan_verified),
      aadhaarVerified: Boolean(
        customer?.aadhaarVerified || user.aadhaarVerified || kyc?.aadharVerified,
      ),
      mobileVerified: Boolean(customer?.mobileVerified || user.mobileVerified || true),
      accountNumberMasked: bankVerified ? (latest?.accountNumberMasked ?? null) : null,
      bankName: bankVerified ? (latest?.bankName ?? null) : null,
      accountType: bankVerified ? (latest?.accountType ?? null) : null,
      ifscCode: bankVerified ? (latest?.ifscCode ?? null) : null,
      status: bankVerified
        ? BankVerificationStatus.VERIFIED
        : (latest?.status ?? BankVerificationStatus.PENDING),
      verifiedAt: latest?.verifiedAt ?? null,
      verificationStatus: customer?.status ?? 'NOT_STARTED',
      providerConfigured: Boolean(env.BANK_VERIFICATION_PROVIDER?.trim()),
    };
  }

  async verify(
    userId: string,
    input: VerifyBankBody,
    _meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const provider = (env.BANK_VERIFICATION_PROVIDER?.trim() || 'IDSPAY').toUpperCase();
    if (!provider) {
      throw new BadRequestError(
        'Bank verification provider is not configured. Penny-drop / account verification cannot proceed. Do not treat bank details as verified.',
        { code: 'BANK_PROVIDER_NOT_CONFIGURED' },
      );
    }

    if (provider !== 'IDSPAY') {
      throw new BadRequestError(
        `Bank verification provider "${provider}" is not supported. Configure IDSPAY.`,
        { code: 'BANK_PROVIDER_UNSUPPORTED' },
      );
    }

    const user = await bankVerificationRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const customer = await bankVerificationRepository.findCustomerVerification(userId);
    const kyc = jsonDb.findOne('customer_kyc', { userId });
    const panVerified = Boolean(
      customer?.panVerified || user.panVerified || kyc?.pan_verified,
    );
    if (!panVerified) {
      throw new ForbiddenError('Complete PAN verification before verifying bank account.');
    }

    if (user.bankVerified || customer?.bankVerified) {
      const latest = await bankVerificationRepository.findLatestByUserId(userId);
      throw new ConflictError('Bank account is already verified', {
        status: BankVerificationStatus.VERIFIED,
        accountNumberMasked: latest?.accountNumberMasked ?? null,
      });
    }

    if (input.accountNumber !== input.confirmAccountNumber) {
      throw new BadRequestError('Account number and confirm account number must match');
    }

    const ifscCode = normalizeIfsc(input.ifscCode);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      throw new BadRequestError('Invalid IFSC code');
    }

    const accountNumberHash = hashAccountNumber(input.accountNumber);
    const duplicate = bankVerificationRepository.findVerifiedByHash(accountNumberHash, userId);
    if (duplicate) {
      throw new ConflictError('This bank account is already linked to another user.');
    }

    const referenceId = `LXB${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const geo = requireGeo();

    const providerResult = await verifyBankAccountWithIdsPay({
      accountNumber: input.accountNumber.replace(/\D/g, ''),
      bankIfsc: ifscCode,
      referenceId,
      latitude: geo.latitude,
      longitude: geo.longitude,
    });

    const verifiedAt = new Date();
    const accountNumberMasked = maskAccountNumber(input.accountNumber);
    const resolvedHolderName =
      providerResult.accountHolderName?.trim() || input.accountHolderName;

    await bankVerificationRepository.create({
      userId,
      accountHolderName: resolvedHolderName,
      bankName: input.bankName,
      accountNumberMasked,
      accountNumberHash,
      ifscCode,
      accountType: input.accountType as BankAccountType,
      status: BankVerificationStatus.VERIFIED,
      verifiedAt,
    });

    const latest = await bankVerificationRepository.findLatestByUserId(userId);
    if (latest?.id) {
      jsonDb.update(
        'bankVerification',
        { id: latest.id },
        {
          provider: 'IDSPAY',
          providerReferenceId: providerResult.referenceId,
          providerResponse: providerResult.raw,
          providerStatus: providerResult.verificationStatus,
        },
      );
    }

    bankVerificationRepository.markUserBankVerified(userId);
    await bankVerificationRepository.upsertCustomerBankVerified(userId);

    return {
      status: 'VERIFIED' as const,
      bankVerified: true as const,
      accountNumberMasked,
      bankName: input.bankName,
      verificationStatus: 'COMPLETED',
      nextStep: 'VERIFICATION_SUMMARY' as const,
      verifiedAt: verifiedAt.toISOString(),
      providerReferenceId: providerResult.referenceId,
    };
  }

  // --- Statement PDF upload/fetch (temporarily disabled) ---
  // async uploadAndVerify(...) { ... }
  // async fetchDetails(...) { ... }
}

export const bankVerificationService = new BankVerificationService();
