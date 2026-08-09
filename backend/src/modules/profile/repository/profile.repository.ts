import { jsonDb } from '../../../config/json-db';
import { v4 as uuidv4 } from 'uuid';
import { authRepository } from '../../auth/auth.repository';
import type { AddressBody } from '../dto/profile.dto';

export class ProfileRepository {
  async findUserById(userId: string) {
    // Auth repo hydrates from Supabase when this serverless instance's
    // in-memory cache missed the user (common after cold start / other instance login).
    const authUser = await authRepository.findById(userId);
    if (authUser) {
      const profile =
        authUser.profiles ?? jsonDb.findOne('profiles', { id: userId });
      return {
        id: userId,
        fullName: profile?.fullName ?? 'Customer',
        email: authUser.email ?? profile?.email ?? '',
        mobile:
          authUser.phone ??
          profile?.mobile_number ??
          profile?.mobileNumber ??
          '',
      };
    }

    const user = jsonDb.findOne('users', { id: userId });
    const profile = jsonDb.findOne('profiles', { id: userId });

    // Reconstruct identity from profile so GET/POST /profile stays consistent
    // when users row is missing but profile already exists.
    if (!user && !profile) return null;

    return {
      id: userId,
      fullName: profile?.fullName ?? 'Customer',
      email: user?.email ?? profile?.email ?? '',
      mobile: user?.phone ?? profile?.mobile_number ?? profile?.mobileNumber ?? '',
    };
  }

  async findProfile(userId: string) {
    return jsonDb.findOne('profiles', { id: userId });
  }

  async findAddresses(userId: string): Promise<any[]> {
    const all = jsonDb.findMany('addresses');
    const forUser = all.filter(
      (r: any) => r.profileId === userId || r.userId === userId,
    );
    // Deduplicate and sort (is_default DESC, createdAt ASC)
    const seen = new Set<string>();
    const unique = forUser.filter((r: any) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    unique.sort((a: any, b: any) => {
      if (Boolean(b.is_default) !== Boolean(a.is_default)) {
        return Boolean(b.is_default) ? 1 : -1;
      }
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
    // Self-heal: legacy/imported data can mark several rows default for one
    // user. Only the first (newest) default row is reported as default so the
    // UI never shows two "Default" badges for the same account.
    let defaultSeen = false;
    return unique.map((r: any) => {
      const isDefault = Boolean(r.is_default ?? r.isDefault);
      const effectiveDefault = isDefault && !defaultSeen;
      if (isDefault) defaultSeen = true;
      return {
      id: r.id,
      addressLine1: r.house_number ?? r.addressLine1 ?? r.fullAddress?.split(',')[0] ?? '',
      addressLine2: r.street ?? r.addressLine2 ?? r.area ?? '',
      landmark: r.landmark ?? null,
      city: r.city ?? '',
      state: r.state ?? '',
      pincode: r.pincode ?? '',
      country: 'India',
      isDefault: effectiveDefault,
      addressType: r.label ?? r.addressType ?? 'SHIPPING',
      createdAt: r.createdAt ?? new Date().toISOString(),
      updatedAt: r.updatedAt ?? new Date().toISOString(),
    };
    });
  }

  async findAddressByType(userId: string, addressType: string) {
    const addresses = await this.findAddresses(userId);
    return addresses.find((a) => a.addressType === addressType) ?? null;
  }

  async findAddressByIdForUser(addressId: string, userId: string) {
    const addresses = await this.findAddresses(userId);
    return addresses.find((a) => a.id === addressId) ?? null;
  }

  async countShippingAddresses(userId: string) {
    const addresses = await this.findAddresses(userId);
    return addresses.filter((a) => a.addressType === 'SHIPPING').length;
  }

  async createAddress(
    userId: string,
    address: AddressBody,
    options: { isDefault?: boolean; addressType?: string } = {},
  ) {
    const addressType = options.addressType ?? 'SHIPPING';
    const shippingCount =
      addressType === 'SHIPPING' ? await this.countShippingAddresses(userId) : 0;
    const makeDefault =
      Boolean(options.isDefault) || (addressType === 'SHIPPING' && shippingCount === 0);

    const all = jsonDb.findMany('addresses');
    const userAddressesOfType = all.filter(
      (r: any) => (r.profileId === userId || r.userId === userId) &&
        (r.label ?? r.addressType ?? 'SHIPPING') === addressType,
    );

    // Check for exact duplicate (same location)
    const exactMatch = userAddressesOfType.find(
      (r: any) =>
        (r.house_number ?? r.addressLine1 ?? r.city ?? '') !== '' && // not empty/corrupt
        (r.house_number ?? r.addressLine1 ?? '') === address.addressLine1 &&
        (r.street ?? r.addressLine2 ?? '') === address.addressLine2 &&
        r.city === address.city &&
        r.state === address.state &&
        r.pincode === address.pincode,
    );
    if (exactMatch) {
      return { id: exactMatch.id, isDefault: exactMatch.is_default ?? false };
    }

    if (makeDefault) {
      // Unset all current defaults for this user (both field spellings — the
      // legacy camelCase `isDefault` predates the Mongo migration and must not
      // keep marking rows as default).
      all
        .filter(
          (r: any) =>
            (r.profileId === userId || r.userId === userId) &&
            (r.is_default || r.isDefault),
        )
        .forEach((r: any) =>
          jsonDb.update('addresses', { id: r.id }, { is_default: false, isDefault: false }),
        );
    }

    // If there's an empty/corrupt existing address for this user+type, update it instead of creating a new one
    const corruptExisting = userAddressesOfType.find(
      (r: any) => !r.city || r.city.trim() === '',
    );
    if (corruptExisting) {
      const updated = jsonDb.update('addresses', { id: corruptExisting.id }, {
        profileId: userId,
        userId,
        house_number: address.addressLine1,
        street: address.addressLine2,
        landmark: address.landmark?.trim() || null,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        label: addressType,
        addressType,
        is_default: makeDefault,
        fullAddress: `${address.addressLine1}, ${address.addressLine2}, ${address.city}, ${address.state} - ${address.pincode}`,
      });
      return { id: updated.id, isDefault: makeDefault };
    }

    const created = jsonDb.insert('addresses', {
      id: uuidv4(),
      profileId: userId,
      userId,
      house_number: address.addressLine1,
      street: address.addressLine2,
      landmark: address.landmark?.trim() || null,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      label: addressType,
      addressType,
      is_default: makeDefault,
      fullAddress: `${address.addressLine1}, ${address.addressLine2}, ${address.city}, ${address.state} - ${address.pincode}`,
    });

    return { id: created.id, isDefault: makeDefault };
  }

  async updateAddress(
    addressId: string,
    _userId: string,
    address: AddressBody,
    _options: { isDefault?: boolean; addressType?: string } = {},
  ) {
    const updated = jsonDb.update('addresses', { id: addressId }, {
      house_number: address.addressLine1,
      street: address.addressLine2,
      landmark: address.landmark?.trim() || null,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      fullAddress: `${address.addressLine1}, ${address.addressLine2}, ${address.city}, ${address.state} - ${address.pincode}`,
    });
    return { id: updated?.id ?? addressId };
  }

  async deleteAddress(addressId: string, _userId: string) {
    return jsonDb.delete('addresses', { id: addressId });
  }

  async setDefaultAddress(addressId: string, userId: string) {
    // Unset all (both field spellings)
    const all = jsonDb.findMany('addresses');
    all
      .filter(
        (r: any) =>
          (r.profileId === userId || r.userId === userId) &&
          (r.is_default || r.isDefault),
      )
      .forEach((r: any) =>
        jsonDb.update('addresses', { id: r.id }, { is_default: false, isDefault: false }),
      );
    // Set new default (legacy `isDefault` is dropped by the data cleanup)
    jsonDb.update('addresses', { id: addressId }, { is_default: true });
    return { id: addressId };
  }

  async upsertProfile(input: {
    userId: string;
    fullName: string;
    email: string;
    mobile: string;
    dob: Date;
    gender: any;
  }) {
    const existing = jsonDb.findOne('profiles', { id: input.userId });
    if (existing) {
      return jsonDb.update('profiles', { id: input.userId }, {
        fullName: input.fullName,
        email: input.email,
        mobile_number: input.mobile,
        dob: input.dob instanceof Date ? input.dob.toISOString().split('T')[0] : input.dob,
        gender: input.gender,
      });
    }
    return jsonDb.insert('profiles', {
      id: input.userId,
      fullName: input.fullName,
      email: input.email,
      mobile_number: input.mobile,
      dob: input.dob instanceof Date ? input.dob.toISOString().split('T')[0] : input.dob,
      gender: input.gender,
    });
  }

  async syncUserIdentity(userId: string, fullName: string, email: string) {
    jsonDb.update('users', { id: userId }, { email });
    return jsonDb.update('profiles', { id: userId }, { fullName, email });
  }

  async saveProfileWithAddresses(input: {
    userId: string;
    fullName: string;
    email: string;
    mobile: string;
    dob: Date;
    gender: any;
    shipping: AddressBody;
    billingSameAsShipping: boolean;
    billing?: AddressBody;
  }) {
    const profile = await this.upsertProfile({
      userId: input.userId,
      fullName: input.fullName,
      email: input.email,
      mobile: input.mobile,
      dob: input.dob,
      gender: input.gender,
    });

    const shippingResult = await this.createAddress(input.userId, input.shipping, {
      isDefault: true,
      addressType: 'SHIPPING',
    });

    return {
      profile,
      shipping: shippingResult,
      billingSameAsShipping: input.billingSameAsShipping,
    };
  }
}

export const profileRepository = new ProfileRepository();
