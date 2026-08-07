import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import { emiHistoryService } from '../service/emi-history.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

function queryString(req: Request): Record<string, string | undefined> {
  return {
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    paymentType: typeof req.query.paymentType === 'string' ? req.query.paymentType : undefined,
    dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
    dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    format: typeof req.query.format === 'string' ? req.query.format : undefined,
  };
}

export class EmiHistoryController {
  getHistory = async (req: Request, res: Response) => {
    const data = await emiHistoryService.getPaymentHistory(
      requireUserId(req as AuthenticatedRequest),
      queryString(req),
    );
    return sendSuccess(res, data, 'Payment history fetched');
  };

  getPaymentById = async (req: Request, res: Response) => {
    const paymentId = String(req.params.paymentId ?? '');
    const data = await emiHistoryService.getPaymentById(
      paymentId,
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Payment details fetched');
  };

  exportHistory = async (req: Request, res: Response) => {
    const userId = requireUserId(req as AuthenticatedRequest);
    const query = queryString(req);
    const format = (query.format ?? 'excel').toLowerCase();

    const file =
      format === 'pdf'
        ? await emiHistoryService.exportPaymentHistoryPdf(userId, query)
        : await emiHistoryService.exportPaymentHistoryExcel(userId, query);

    const contentType =
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return res.sendFile(file.absolutePath);
  };

  getReceipt = async (req: Request, res: Response) => {
    const paymentId = String(req.params.paymentId ?? '');
    const receipt = await emiHistoryService.getReceipt(
      paymentId,
      requireUserId(req as AuthenticatedRequest),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.fileName}"`);
    return res.sendFile(receipt.absolutePath);
  };

  getStatement = async (req: Request, res: Response) => {
    const data = await emiHistoryService.getStatement(
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Loan statement fetched');
  };

  getStatementPdf = async (req: Request, res: Response) => {
    const file = await emiHistoryService.getStatementPdf(
      requireUserId(req as AuthenticatedRequest),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return res.sendFile(file.absolutePath);
  };
}

export const emiHistoryController = new EmiHistoryController();
