import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type { CreateCheckoutBody } from '../dto/checkout.dto';
import type { VerifyPaymentBody } from '../../payment/validator/payment.validator';
import { checkoutService } from '../service/checkout.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class CheckoutController {
  getSummary = async (req: Request, res: Response) => {
    const quantityRaw = req.query.quantity;
    const quantity =
      typeof quantityRaw === 'string' && quantityRaw.trim()
        ? Number(quantityRaw)
        : 1;
    // Prefer ?variantId=; keep ?id= as a backwards-compatible alias.
    const variantIdRaw = req.query?.variantId ?? req.query?.id;
    const variantId =
      typeof variantIdRaw === 'string' && variantIdRaw.trim()
        ? variantIdRaw.trim()
        : undefined;
    const modeRaw = String(req.query.mode || '').toUpperCase();
    const mode = modeRaw === 'CART' ? 'CART' : 'BUY_NOW';

    const data = await checkoutService.getSummary(
      requireUserId(req as AuthenticatedRequest),
      String(req.params.productId ?? ''),
      Number.isFinite(quantity) ? quantity : 1,
      variantId,
      mode,
    );
    return sendSuccess(res, data, 'Checkout summary fetched');
  };

  create = async (req: Request, res: Response) => {
    const data = await checkoutService.create(
      requireUserId(req as AuthenticatedRequest),
      req.body as CreateCheckoutBody,
    );
    return sendSuccess(res, data, 'Checkout session created');
  };

  getSession = async (req: Request, res: Response) => {
    const data = await checkoutService.getSession(
      requireUserId(req as AuthenticatedRequest),
      String(req.params.sessionId ?? ''),
    );
    return sendSuccess(res, data, 'Checkout session fetched');
  };

  createPaymentOrder = async (req: Request, res: Response) => {
    const sessionId = String(req.params.sessionId ?? '');
    const data = await checkoutService.createPaymentOrder(
      requireUserId(req as AuthenticatedRequest),
      sessionId,
    );
    return sendSuccess(res, data, 'Razorpay order created', 201);
  };

  verifyPayment = async (req: Request, res: Response) => {
    const sessionId = String(req.params.sessionId ?? '');
    const body = req.body as VerifyPaymentBody;
    const data = await checkoutService.verifyPayment(
      requireUserId(req as AuthenticatedRequest),
      sessionId,
      body,
    );
    return sendSuccess(res, data, 'Payment verified successfully');
  };

  createDevBypassSignature = async (req: Request, res: Response) => {
    const sessionId = String(req.params.sessionId ?? '');
    const data = await checkoutService.createDevBypassSignature(
      requireUserId(req as AuthenticatedRequest),
      sessionId,
    );
    return sendSuccess(res, data, 'Dev payment signature created');
  };
}

export const checkoutController = new CheckoutController();
