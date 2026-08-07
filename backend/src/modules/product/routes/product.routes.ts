import { Router } from 'express';

import { createRateLimiter } from '../../../common/middleware/rate-limiter';

import { validateRequest } from '../../../common/middleware/validate';

import { asyncHandler } from '../../../common/utils/async-handler';

import { env } from '../../../config/env';

import { productController } from '../controller/product.controller';

import {
  listProductsQuerySchema,
  productIdParamSchema,
  productSlugParamSchema,
  createProductBodySchema,
} from '../validator/product.validator';



const limiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {

    success: false,

    message: 'Too many product requests. Please try again later.',

    code: 'TOO_MANY_REQUESTS',

  },
});



export const productRouter = Router();



productRouter.use(limiter);



productRouter.get(

  '/',

  validateRequest(listProductsQuerySchema, 'query'),
  asyncHandler(productController.list),
);

productRouter.post(
  '/',
  validateRequest(createProductBodySchema, 'body'),
  asyncHandler(productController.create),
);

productRouter.get(
  '/slug/:slug',

  validateRequest(productSlugParamSchema, 'params'),

  asyncHandler(productController.getBySlug),

);

productRouter.get(
  '/:productId',
  validateRequest(productIdParamSchema, 'params'),
  asyncHandler(productController.getById),
);

productRouter.put(
  '/:productId',
  validateRequest(productIdParamSchema, 'params'),
  asyncHandler(productController.update),
);

productRouter.delete(
  '/:productId',
  validateRequest(productIdParamSchema, 'params'),
  asyncHandler(productController.remove),
);

