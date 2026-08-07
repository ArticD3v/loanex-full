import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type { AddCartItemBody, UpdateCartItemBody } from '../dto/cart.dto';
import { cartService } from '../service/cart.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class CartController {
  getCart = async (req: Request, res: Response) => {
    const data = await cartService.getCart(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'Cart fetched');
  };

  addItem = async (req: Request, res: Response) => {
    const data = await cartService.addItem(
      requireUserId(req as AuthenticatedRequest),
      req.body as AddCartItemBody,
    );
    return sendSuccess(res, data, 'Product added to cart');
  };

  updateItem = async (req: Request, res: Response) => {
    const data = await cartService.updateItem(
      requireUserId(req as AuthenticatedRequest),
      String(req.params.cartItemId ?? ''),
      req.body as UpdateCartItemBody,
    );
    return sendSuccess(res, data, 'Cart item updated');
  };

  removeItem = async (req: Request, res: Response) => {
    const data = await cartService.removeItem(
      requireUserId(req as AuthenticatedRequest),
      String(req.params.cartItemId ?? ''),
    );
    return sendSuccess(res, data, 'Cart item removed');
  };

  clear = async (req: Request, res: Response) => {
    const data = await cartService.clear(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'Cart cleared');
  };

  moveToWishlist = async (req: Request, res: Response) => {
    const data = await cartService.moveToWishlist(
      requireUserId(req as AuthenticatedRequest),
      String(req.params.cartItemId ?? ''),
    );
    return sendSuccess(res, data, 'Item moved to wishlist');
  };
}

export const cartController = new CartController();
