import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type {
  CreateReviewBody,
  ProductIdParam,
  ReviewIdParam,
  UpdateReviewBody,
} from '../dto/reviews.dto';
import { reviewsService } from '../service/reviews.service';

function getUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

function getOptionalUserId(req: AuthenticatedRequest): string | undefined {
  return req.user?.sub;
}

export class ReviewsController {
  create = async (req: Request, res: Response) => {
    const data = await reviewsService.create(
      getUserId(req as AuthenticatedRequest),
      req.body as CreateReviewBody,
    );
    return sendSuccess(res, data, 'Review created', 201);
  };

  listByProduct = async (req: Request, res: Response) => {
    const { productId } = req.validatedParams as ProductIdParam;
    const data = await reviewsService.listByProduct(
      productId,
      getOptionalUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Reviews fetched');
  };

  update = async (req: Request, res: Response) => {
    const { reviewId } = req.validatedParams as ReviewIdParam;
    const data = await reviewsService.update(
      getUserId(req as AuthenticatedRequest),
      reviewId,
      req.body as UpdateReviewBody,
    );
    return sendSuccess(res, data, 'Review updated');
  };

  delete = async (req: Request, res: Response) => {
    const { reviewId } = req.validatedParams as ReviewIdParam;
    const data = await reviewsService.delete(
      getUserId(req as AuthenticatedRequest),
      reviewId,
    );
    return sendSuccess(res, data, 'Review deleted');
  };
}

export const reviewsController = new ReviewsController();
