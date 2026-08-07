import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type { VerifyPanBody } from '../dto/pan-verification.dto';
import { panVerificationService } from '../service/pan-verification.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class PanVerificationController {
  getStatus = async (req: Request, res: Response) => {
    const data = await panVerificationService.getStatus(
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'PAN verification status fetched');
  };

  verify = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data = await panVerificationService.verify(
      requireUserId(authReq),
      req.body as VerifyPanBody,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    );

    return res.status(200).json({
      success: true,
      message: 'PAN Verified Successfully',
      status: data.status,
      data,
    });
  };
}

export const panVerificationController = new PanVerificationController();
