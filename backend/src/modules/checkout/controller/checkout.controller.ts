import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type { CreateCheckoutBody } from '../dto/checkout.dto';
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
    const variantIdRaw = req.query?.id;
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
}

export const checkoutController = new CheckoutController();
