import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import { emiPaymentService } from '../service/emi-payment.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class EmiPaymentController {
  getByEmiId = async (req: Request, res: Response) => {
    const emiId = String(req.params.emiId ?? '');
    const data = await emiPaymentService.getByEmiId(
      emiId,
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'EMI payment details fetched');
  };

  createOrder = async (req: Request, res: Response) => {
    const body = req.body as { emiId?: string };
    const data = await emiPaymentService.createOrder(
      String(body.emiId ?? ''),
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'EMI Razorpay order created');
  };

  verify = async (req: Request, res: Response) => {
    const body = req.body as {
      emiId?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    };
    const data = await emiPaymentService.verify(requireUserId(req as AuthenticatedRequest), {
      emiId: String(body.emiId ?? ''),
      razorpayOrderId: String(body.razorpayOrderId ?? ''),
      razorpayPaymentId: String(body.razorpayPaymentId ?? ''),
      razorpaySignature: String(body.razorpaySignature ?? ''),
    });
    return sendSuccess(res, data, data.message);
  };

  createDevBypassSignature = async (req: Request, res: Response) => {
    const body = req.body as { razorpayOrderId?: string };
    const data = await emiPaymentService.createDevBypassSignature(
      requireUserId(req as AuthenticatedRequest),
      String(body.razorpayOrderId ?? ''),
    );
    return sendSuccess(res, data, 'Dev EMI payment signature created');
  };

  getReceipt = async (req: Request, res: Response) => {
    const emiId = String(req.params.emiId ?? '');
    const receipt = await emiPaymentService.getReceipt(
      emiId,
      requireUserId(req as AuthenticatedRequest),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.fileName}"`);
    return res.sendFile(receipt.absolutePath);
  };

  listForAdmin = async (req: Request, res: Response) => {
    const loanId = typeof req.query.loanId === 'string' ? req.query.loanId : undefined;
    const data = await emiPaymentService.listForAdmin(loanId);
    return sendSuccess(res, data, 'Admin EMI payments fetched');
  };
}

export const emiPaymentController = new EmiPaymentController();
