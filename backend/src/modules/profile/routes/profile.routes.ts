import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { profileController } from '../controller/profile.controller';
import {
  addressIdParamSchema,
  createAddressBodySchema,
  updateAddressBodySchema,
  updatePersonalBodySchema,
  upsertProfileBodySchema,
} from '../validator/profile.validator';

const limiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many profile requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const profileRouter = Router();

profileRouter.use(authenticate);
profileRouter.use(limiter);

profileRouter.get('/', asyncHandler(profileController.get));
profileRouter.post(
  '/',
  validateRequest(upsertProfileBodySchema),
  asyncHandler(profileController.create),
);
profileRouter.put(
  '/',
  validateRequest(upsertProfileBodySchema),
  asyncHandler(profileController.update),
);
profileRouter.put(
  '/personal',
  validateRequest(updatePersonalBodySchema),
  asyncHandler(profileController.updatePersonal),
);

profileRouter.get('/addresses', asyncHandler(profileController.listAddresses));
profileRouter.post(
  '/addresses',
  validateRequest(createAddressBodySchema),
  asyncHandler(profileController.createAddress),
);
profileRouter.put(
  '/addresses/:addressId',
  validateRequest(addressIdParamSchema, 'params'),
  validateRequest(updateAddressBodySchema),
  asyncHandler(profileController.updateAddress),
);
profileRouter.delete(
  '/addresses/:addressId',
  validateRequest(addressIdParamSchema, 'params'),
  asyncHandler(profileController.deleteAddress),
);
profileRouter.post(
  '/addresses/:addressId/default',
  validateRequest(addressIdParamSchema, 'params'),
  asyncHandler(profileController.setDefaultAddress),
);
