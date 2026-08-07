import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type {
  CreateAddressBody,
  UpdateAddressBody,
  UpdatePersonalBody,
  UpsertProfileBody,
} from '../dto/profile.dto';
import { profileService } from '../service/profile.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

function jwtIdentity(req: AuthenticatedRequest) {
  return {
    email: req.user?.email,
    mobile: req.user?.mobile,
  };
}

export class ProfileController {
  get = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data = await profileService.get(requireUserId(authReq), jwtIdentity(authReq));
    return sendSuccess(res, data, 'Profile fetched');
  };

  create = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data = await profileService.create(
      requireUserId(authReq),
      req.body as UpsertProfileBody,
      jwtIdentity(authReq),
    );
    return sendSuccess(res, data, 'Profile created');
  };

  update = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data = await profileService.update(
      requireUserId(authReq),
      req.body as UpsertProfileBody,
      jwtIdentity(authReq),
    );
    return sendSuccess(res, data, 'Profile updated');
  };

  updatePersonal = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data = await profileService.updatePersonal(
      requireUserId(authReq),
      req.body as UpdatePersonalBody,
      jwtIdentity(authReq),
    );
    return sendSuccess(res, data, 'Personal details updated');
  };

  listAddresses = async (req: Request, res: Response) => {
    const data = await profileService.listAddresses(
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Addresses fetched');
  };

  createAddress = async (req: Request, res: Response) => {
    const data = await profileService.createAddress(
      requireUserId(req as AuthenticatedRequest),
      req.body as CreateAddressBody,
    );
    return sendSuccess(res, data, 'Address added', 201);
  };

  updateAddress = async (req: Request, res: Response) => {
    const addressId =
      (req.validatedParams as { addressId?: string } | undefined)?.addressId ??
      String(req.params.addressId ?? '');
    const data = await profileService.updateAddress(
      requireUserId(req as AuthenticatedRequest),
      addressId,
      req.body as UpdateAddressBody,
    );
    return sendSuccess(res, data, 'Address updated');
  };

  deleteAddress = async (req: Request, res: Response) => {
    const addressId =
      (req.validatedParams as { addressId?: string } | undefined)?.addressId ??
      String(req.params.addressId ?? '');
    const data = await profileService.deleteAddress(
      requireUserId(req as AuthenticatedRequest),
      addressId,
    );
    return sendSuccess(res, data, 'Address removed');
  };

  setDefaultAddress = async (req: Request, res: Response) => {
    const addressId =
      (req.validatedParams as { addressId?: string } | undefined)?.addressId ??
      String(req.params.addressId ?? '');
    const data = await profileService.setDefaultAddress(
      requireUserId(req as AuthenticatedRequest),
      addressId,
    );
    return sendSuccess(res, data, 'Default address updated');
  };
}

export const profileController = new ProfileController();
