import { PanVerificationStatus } from '@prisma/client';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { hashPan, maskPan, normalizePan } from '../../../common/utils/pan';
import { auditLogService } from '../../verification/service/audit-log.service';
import { verificationService } from '../../verification/service/verification.service';
import type { VerifyPanBody } from '../dto/pan-verification.dto';
import { panVerificationRepository } from '../repository/pan-verification.repository';

export class PanVerificationService {
  async getStatus(userId: string) {
    const user = await panVerificationRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const customer = await panVerificationRepository.findCustomerVerification(userId);
    const latest = await panVerificationRepository.findLatestByUserId(userId);
    const panVerified = Boolean(user.panVerified || customer?.panVerified);

    return {
      panVerified,
      aadhaarVerified: Boolean(customer?.aadhaarVerified || user.aadhaarVerified),
      mobileVerified: Boolean(customer?.mobileVerified || user.mobileVerified),
      panNumberMasked: panVerified ? (latest?.panNumberMasked ?? null) : null,
      fullName: panVerified ? (latest?.fullName ?? null) : null,
      status: panVerified
        ? PanVerificationStatus.VERIFIED
        : (latest?.status ?? PanVerificationStatus.PENDING),
      verifiedAt: latest?.verifiedAt ?? null,
    };
  }

  async verify(
    userId: string,
    input: VerifyPanBody,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const user = await panVerificationRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const customer = await panVerificationRepository.findCustomerVerification(userId);
    const aadhaarVerified = Boolean(customer?.aadhaarVerified || user.aadhaarVerified);
    if (!aadhaarVerified) {
      throw new ForbiddenError('Complete Aadhaar verification before verifying PAN.');
    }

    if (user.panVerified || customer?.panVerified) {
      const latest = await panVerificationRepository.findLatestByUserId(userId);
      throw new ConflictError('PAN is already verified', {
        status: PanVerificationStatus.VERIFIED,
        panNumberMasked: latest?.panNumberMasked ?? null,
      });
    }

    const panNumber = normalizePan(input.panNumber);
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
      throw new BadRequestError('Invalid PAN number');
    }

    const panHash = hashPan(panNumber);
    const panNumberMasked = maskPan(panNumber);

    const taken = await panVerificationRepository.findVerifiedByHash(panHash, userId);
    if (taken) {
      throw new ConflictError('This PAN is already linked to another account');
    }

    // Real provider: IDSPay Experian. Never mark verified without provider success.
    const nameParts = input.fullName.trim().split(/\s+/);
    const first_name = nameParts[0] ?? '';
    const last_name = nameParts.slice(1).join(' ') || first_name;

    try {
      await verificationService.verifyPanAndCreditScore(userId, {
        pan: panNumber,
        first_name,
        last_name,
        dob: input.dateOfBirth,
        mobile_no: user.phone ?? user.mobile ?? '',
      });
    } catch (err) {
      throw new BadRequestError(
        err instanceof Error
          ? err.message
          : 'PAN verification provider failed. Please try again.',
        { code: 'PAN_PROVIDER_FAILED' },
      );
    }

    const dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
    const verifiedAt = new Date();

    await panVerificationRepository.create({
      userId,
      panNumberMasked,
      panHash,
      fullName: input.fullName.trim(),
      dateOfBirth,
      status: PanVerificationStatus.VERIFIED,
      verifiedAt,
    });

    await panVerificationRepository.markUserPanVerified(userId);
    await panVerificationRepository.upsertCustomerPanVerified(userId);

    await auditLogService.log({
      userId,
      action: 'PAN_VERIFIED',
      entity: 'pan_verifications',
      metadata: {
        panNumberMasked,
        timestamp: verifiedAt.toISOString(),
        ipAddress: meta?.ipAddress ?? null,
        device: meta?.userAgent ?? null,
        provider: 'IDSPAY_EXPERIAN',
      },
    });

    return {
      status: PanVerificationStatus.VERIFIED,
      panVerified: true as const,
      panNumberMasked,
      nextStep: 'BANK_VERIFICATION' as const,
      verifiedAt,
    };
  }
}

export const panVerificationService = new PanVerificationService();
