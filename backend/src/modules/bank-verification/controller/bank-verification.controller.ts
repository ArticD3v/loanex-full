import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type { VerifyBankBody } from '../dto/bank-verification.dto';
import { bankVerificationService } from '../service/bank-verification.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class BankVerificationController {
  getStatus = async (req: Request, res: Response) => {
    const data = await bankVerificationService.getStatus(
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Bank verification status fetched');
  };

  verify = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data = await bankVerificationService.verify(
      requireUserId(authReq),
      req.body as VerifyBankBody,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    );

    return res.status(200).json({
      success: true,
      message: 'Bank Account Verified Successfully',
      status: data.status,
      data,
    });
  };

  // --- Statement PDF (temporarily disabled) ---
  // upload = async (...) { ... }
  // fetch = async (...) { ... }
}

export const bankVerificationController = new BankVerificationController();
