import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import { LoanStatus } from '../repository/loan.repository';
import { loanService } from '../service/loan.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class LoanController {
  getCurrent = async (req: Request, res: Response) => {
    const data = await loanService.getCurrent(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'Current loan fetched');
  };

  getDashboard = async (req: Request, res: Response) => {
    const data = await loanService.getDashboard(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'EMI dashboard fetched');
  };

  getPaymentHistory = async (req: Request, res: Response) => {
    const data = await loanService.getPaymentHistory(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'EMI payment history fetched');
  };

  getStatement = async (req: Request, res: Response) => {
    const file = await loanService.getStatement(requireUserId(req as AuthenticatedRequest));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return res.sendFile(file.absolutePath);
  };

  getAgreement = async (req: Request, res: Response) => {
    const file = await loanService.getAgreement(requireUserId(req as AuthenticatedRequest));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return res.sendFile(file.absolutePath);
  };

  listForAdmin = async (req: Request, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const data = await loanService.listForAdmin(status);
    return sendSuccess(res, data, 'Admin loans fetched');
  };

  getForAdmin = async (req: Request, res: Response) => {
    const loanId = String(req.params.loanId ?? '');
    const data = await loanService.getForAdmin(loanId);
    return sendSuccess(res, data, 'Admin loan fetched');
  };

  getEmiSchedule = async (req: Request, res: Response) => {
    const loanId = String(req.params.loanId ?? '');
    const userId = requireUserId(req as AuthenticatedRequest);
    // Owner-scoped — never use getForAdmin on customer routes (IDOR).
    const schedule = await loanService.getEmiScheduleForUser(userId, loanId);
    return sendSuccess(res, schedule, 'EMI schedule fetched');
  };

  adminUpdate = async (req: Request, res: Response) => {
    const loanId = String(req.params.loanId ?? '');
    const body = req.body as { loanStatus?: LoanStatus; remarks?: string };
    const data = await loanService.adminUpdate(loanId, {
      loanStatus: body.loanStatus as LoanStatus,
      remarks: body.remarks,
      updatedBy: (req as AuthenticatedRequest).user?.sub ?? 'admin',
    });
    return sendSuccess(res, data, 'Loan updated');
  };
}

export const loanController = new LoanController();
