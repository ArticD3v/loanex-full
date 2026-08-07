import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type { AddWishlistItemBody } from '../dto/wishlist.dto';
import { wishlistService } from '../service/wishlist.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class WishlistController {
  list = async (req: Request, res: Response) => {
    const data = await wishlistService.getWishlist(
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Wishlist fetched');
  };

  add = async (req: Request, res: Response) => {
    const data = await wishlistService.addItem(
      requireUserId(req as AuthenticatedRequest),
      req.body as AddWishlistItemBody,
    );
    return sendSuccess(res, data, 'Product added to wishlist');
  };

  remove = async (req: Request, res: Response) => {
    const data = await wishlistService.removeItem(
      requireUserId(req as AuthenticatedRequest),
      String(req.params.wishlistItemId ?? ''),
    );
    return sendSuccess(res, data, 'Wishlist item removed');
  };

  moveToCart = async (req: Request, res: Response) => {
    const data = await wishlistService.moveToCart(
      requireUserId(req as AuthenticatedRequest),
      String(req.params.wishlistItemId ?? ''),
    );
    return sendSuccess(res, data, 'Item moved to cart');
  };

  status = async (req: Request, res: Response) => {
    const variantIdRaw = req.query?.id;
    const variantId =
      typeof variantIdRaw === 'string' && variantIdRaw.trim()
        ? variantIdRaw.trim()
        : undefined;

    const data = await wishlistService.hasProduct(
      requireUserId(req as AuthenticatedRequest),
      String(req.params.productId ?? ''),
      variantId,
    );
    return sendSuccess(res, data, 'Wishlist status fetched');
  };
}

export const wishlistController = new WishlistController();
