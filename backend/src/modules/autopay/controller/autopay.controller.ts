import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import { AutopayMandateStatus } from '../repository/autopay.repository';
import { autopayService } from '../service/autopay.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class AutopayController {
  getStatus = async (req: Request, res: Response) => {
    const data = await autopayService.getStatus(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'AutoPay status fetched');
  };

  createMandate = async (req: Request, res: Response) => {
    const body = req.body as {
      paymentMethod?: string;
      bankName?: string;
      upiId?: string;
      maximumDebitAmount?: number;
    };
    const data = await autopayService.createMandate(requireUserId(req as AuthenticatedRequest), {
      paymentMethod: String(body.paymentMethod ?? ''),
      bankName: body.bankName,
      upiId: body.upiId,
      maximumDebitAmount: body.maximumDebitAmount,
    });
    return sendSuccess(res, data, data.message);
  };

  cancelMandate = async (req: Request, res: Response) => {
    const data = await autopayService.cancelMandate(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, data.message);
  };

  getHistory = async (req: Request, res: Response) => {
    const data = await autopayService.getHistory(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'AutoPay history fetched');
  };

  listForAdmin = async (req: Request, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const data = await autopayService.listForAdmin(status);
    return sendSuccess(res, data, 'Admin AutoPay list fetched');
  };

  getForAdmin = async (req: Request, res: Response) => {
    const loanId = String(req.params.loanId ?? '');
    const data = await autopayService.getForAdmin(loanId);
    return sendSuccess(res, data, 'Admin AutoPay details fetched');
  };

  adminUpdate = async (req: Request, res: Response) => {
    const loanId = String(req.params.loanId ?? '');
    const body = req.body as { status?: AutopayMandateStatus; remarks?: string };
    const data = await autopayService.adminUpdate(loanId, {
      status: body.status as AutopayMandateStatus,
      remarks: body.remarks,
      updatedBy: (req as AuthenticatedRequest).user?.sub ?? 'admin',
    });
    return sendSuccess(res, data, 'AutoPay mandate updated');
  };
}

export const autopayController = new AutopayController();
