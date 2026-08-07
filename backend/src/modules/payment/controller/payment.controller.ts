import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type { VerifyPaymentBody } from '../validator/payment.validator';
import { paymentService } from '../service/payment.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class PaymentController {
  getContext = async (req: Request, res: Response) => {
    const data = await paymentService.getDownPaymentContext(
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Down payment context loaded');
  };

  createOrder = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data = await paymentService.createOrder(requireUserId(authReq), {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return sendSuccess(res, data, 'Razorpay order created', 201);
  };

  verify = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as VerifyPaymentBody;
    const data = await paymentService.verifyPayment(requireUserId(authReq), body, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return sendSuccess(res, data, 'Payment verified successfully');
  };

  fetchPayment = async (req: Request, res: Response) => {
    const paymentId = String(req.params.paymentId ?? '');
    const data = await paymentService.fetchPayment(
      requireUserId(req as AuthenticatedRequest),
      paymentId,
    );
    return sendSuccess(res, data, 'Payment fetched from Razorpay');
  };

  refund = async (req: Request, res: Response) => {
    const body = req.body as {
      razorpayPaymentId?: string;
      amountInr?: number;
      reason?: string;
    };
    const data = await paymentService.refundPayment(
      requireUserId(req as AuthenticatedRequest),
      {
        razorpayPaymentId: String(body.razorpayPaymentId ?? ''),
        amountInr: body.amountInr,
        reason: body.reason,
      },
    );
    return sendSuccess(res, data, 'Refund initiated');
  };

  webhook = async (req: Request, res: Response) => {
    const signature = req.get('x-razorpay-signature') ?? undefined;
    const rawBody =
      (req as Request & { rawBody?: Buffer }).rawBody ??
      Buffer.from(JSON.stringify(req.body ?? {}));

    const data = await paymentService.handleWebhook(rawBody, signature, req.body);
    // Always 200 to Razorpay after signature validation passed (or failed with throw).
    return sendSuccess(res, data, 'Webhook processed');
  };

  getByApplicationId = async (req: Request, res: Response) => {
    const applicationId = String(req.params.applicationId ?? '');
    const data = await paymentService.getByApplicationId(
      applicationId,
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Payment details fetched');
  };

  getOrderConfirmation = async (req: Request, res: Response) => {
    const orderNumber =
      typeof req.query.orderNumber === 'string' ? req.query.orderNumber : undefined;
    const data = await paymentService.getOrderConfirmation(
      requireUserId(req as AuthenticatedRequest),
      orderNumber,
    );
    return sendSuccess(res, data, 'Order confirmation loaded');
  };

  createDevBypassSignature = async (req: Request, res: Response) => {
    const razorpayOrderId = String(
      (req.body as { razorpayOrderId?: string })?.razorpayOrderId ?? '',
    );
    const data = await paymentService.createDevBypassSignature(
      requireUserId(req as AuthenticatedRequest),
      razorpayOrderId,
    );
    return sendSuccess(res, data, 'Dev payment signature created');
  };
}

export const paymentController = new PaymentController();
