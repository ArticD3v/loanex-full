import type { Gender } from '../../../types/database.types';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { auditLogService } from '../../verification/service/audit-log.service';
import type {
  CreateAddressBody,
  UpdateAddressBody,
  UpdatePersonalBody,
  UpsertProfileBody,
} from '../dto/profile.dto';
import { profileRepository } from '../repository/profile.repository';

function toDateOnlyIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  try {
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function mapAddress(row: {
  id: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  addressType: string;
  createdAt: Date;
  updatedAt: Date;
} | null) {
  if (!row) return null;
  return {
    id: row.id,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    landmark: row.landmark,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    country: row.country,
    isDefault: row.isDefault,
    addressType: row.addressType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type JwtIdentity = { email?: string; mobile?: string; fullName?: string };

export class ProfileService {
  /**
   * Resolve the authenticated user for profile ops.
   * Order: local/Supabase hydrate → JWT claims (token already verified).
   */
  private async resolveUser(userId: string, identity?: JwtIdentity) {
    const hydrated = await profileRepository.findUserById(userId);
    if (hydrated) {
      return {
        ...hydrated,
        email: hydrated.email || identity?.email || '',
        mobile: hydrated.mobile || identity?.mobile || '',
        fullName:
          hydrated.fullName && hydrated.fullName !== 'Customer'
            ? hydrated.fullName
            : identity?.fullName?.trim() || hydrated.fullName || 'Customer',
      };
    }

    if (identity?.mobile || identity?.email) {
      return {
        id: userId,
        fullName: identity.fullName?.trim() || 'Customer',
        email: identity.email ?? '',
        mobile: identity.mobile ?? '',
      };
    }

    return null;
  }

  async get(userId: string, identity?: JwtIdentity) {
    const user = await this.resolveUser(userId, identity);
    if (!user) throw new NotFoundError('User not found.');

    const profile = await profileRepository.findProfile(userId);
    const addresses = await profileRepository.findAddresses(userId);
    const shipping =
      addresses.find((row) => row.addressType === 'SHIPPING' && row.isDefault) ??
      addresses.find((row) => row.addressType === 'SHIPPING') ??
      null;
    const billing = addresses.find((row) => row.addressType === 'BILLING') ?? null;
    const billingSameAsShipping = !billing;

    return {
      profile: profile
        ? {
            id: profile.id,
            fullName: profile.fullName,
            email: profile.email,
            mobile: profile.mobileNumber ?? profile.mobile_number ?? user.mobile ?? '',
            dob: toDateOnlyIso(profile.dob),
            gender: profile.gender,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          }
        : {
            id: null,
            fullName: user.fullName,
            email: user.email,
            mobile: user.mobile,
            dob: null,
            gender: null,
            createdAt: null,
            updatedAt: null,
          },
      address: mapAddress(shipping),
      billingAddress: mapAddress(billingSameAsShipping ? shipping : billing),
      billingSameAsShipping,
      addresses: addresses.map((row) => mapAddress(row)!),
      hasProfile: Boolean(profile),
      hasAddress: Boolean(shipping),
    };
  }

  async create(userId: string, input: UpsertProfileBody, identity?: JwtIdentity) {
    const existing = await profileRepository.findProfile(userId);
    if (existing) {
      throw new ConflictError('Profile already exists. Use PUT to update.');
    }
    return this.save(userId, input, 'PROFILE_CREATED', identity);
  }

  async update(userId: string, input: UpsertProfileBody, identity?: JwtIdentity) {
    return this.save(userId, input, 'PROFILE_UPDATED', identity);
  }

  async updatePersonal(
    userId: string,
    input: UpdatePersonalBody,
    identity?: JwtIdentity,
  ) {
    const user = await this.resolveUser(userId, identity);
    if (!user) throw new NotFoundError('User not found.');

    const dob = new Date(`${input.dob}T00:00:00.000Z`);
    if (Number.isNaN(dob.getTime())) {
      throw new BadRequestError('Invalid date of birth.');
    }

    await profileRepository.upsertProfile({
      userId,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      mobile: user.mobile,
      dob,
      gender: input.gender as Gender,
    });
    await profileRepository.syncUserIdentity(userId, input.fullName, input.email.toLowerCase());

    await auditLogService.log({
      userId,
      action: 'PROFILE_PERSONAL_UPDATED',
      entity: 'user_profiles',
      metadata: { timestamp: new Date().toISOString() },
    });

    return this.get(userId, identity);
  }

  async listAddresses(userId: string) {
    const addresses = await profileRepository.findAddresses(userId);
    return {
      items: addresses.map((row) => mapAddress(row)!),
      totalItems: addresses.length,
    };
  }

  async createAddress(userId: string, input: CreateAddressBody) {
    const created = await profileRepository.createAddress(userId, input, {
      isDefault: input.isDefault,
      addressType: input.addressType,
    });

    await auditLogService.log({
      userId,
      action: 'ADDRESS_CREATED',
      entity: 'user_addresses',
      metadata: {
        addressId: created.id,
        isDefault: created.isDefault,
        timestamp: new Date().toISOString(),
      },
    });

    return this.listAddresses(userId);
  }

  async updateAddress(userId: string, addressId: string, input: UpdateAddressBody) {
    const updated = await profileRepository.updateAddress(addressId, userId, input, {
      isDefault: input.isDefault,
      addressType: input.addressType,
    });
    if (!updated) throw new NotFoundError('Address not found.');

    await auditLogService.log({
      userId,
      action: 'ADDRESS_UPDATED',
      entity: 'user_addresses',
      metadata: {
        addressId: updated.id,
        timestamp: new Date().toISOString(),
      },
    });

    return this.listAddresses(userId);
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await profileRepository.findAddressByIdForUser(addressId, userId);
    if (!existing) throw new NotFoundError('Address not found.');

    if (existing.addressType === 'SHIPPING') {
      const count = await profileRepository.countShippingAddresses(userId);
      if (count <= 1) {
        throw new BadRequestError('You must keep at least one shipping address.', {
          code: 'LAST_SHIPPING_ADDRESS',
        });
      }
    }

    await profileRepository.deleteAddress(addressId, userId);

    await auditLogService.log({
      userId,
      action: 'ADDRESS_DELETED',
      entity: 'user_addresses',
      metadata: {
        addressId,
        timestamp: new Date().toISOString(),
      },
    });

    return this.listAddresses(userId);
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const updated = await profileRepository.setDefaultAddress(addressId, userId);
    if (!updated) throw new NotFoundError('Address not found.');

    await auditLogService.log({
      userId,
      action: 'ADDRESS_DEFAULT_SET',
      entity: 'user_addresses',
      metadata: {
        addressId: updated.id,
        timestamp: new Date().toISOString(),
      },
    });

    return this.listAddresses(userId);
  }

  private async save(
    userId: string,
    input: UpsertProfileBody,
    action: string,
    identity?: JwtIdentity,
  ) {
    const user = await this.resolveUser(userId, identity);
    if (!user) throw new NotFoundError('User not found.');

    if (user.mobile && !/^[6-9]\d{9}$/.test(user.mobile) && user.mobile.length > 0) {
      // Soft check — log but don't block non-standard mobiles registered via OTP
      console.warn(`[Profile] mobile ${user.mobile} does not match strict Indian format`);
    }

    const dob = new Date(`${input.dob}T00:00:00.000Z`);
    if (Number.isNaN(dob.getTime())) {
      throw new BadRequestError('Invalid date of birth.');
    }

    const result = await profileRepository.saveProfileWithAddresses({
      userId,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      mobile: user.mobile,
      dob,
      gender: input.gender as Gender,
      shipping: input.address,
      billingSameAsShipping: input.billingSameAsShipping,
      billing: input.billingSameAsShipping ? undefined : input.billingAddress,
    });

    await auditLogService.log({
      userId,
      action,
      entity: 'user_profiles',
      metadata: {
        userId: result.profile.id,
        shippingAddressId: result.shipping.id,
        billingSameAsShipping: result.billingSameAsShipping,
        timestamp: new Date().toISOString(),
      },
    });

    return this.get(userId, identity);
  }
}

export const profileService = new ProfileService();
