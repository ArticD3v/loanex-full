import { jsonDb } from '../../../config/json-db';
import { v4 as uuidv4 } from 'uuid';
import { authRepository } from '../../auth/auth.repository';
import type { AddressBody } from '../dto/profile.dto';

/** Per-user serialization for create/setDefault on a single Node instance. */
const addressLocks = new Map<string, Promise<void>>();

async function withAddressLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const previous = addressLocks.get(userId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const current = previous.catch(() => undefined).then(() => gate);
  addressLocks.set(userId, current);
  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (addressLocks.get(userId) === current) {
      addressLocks.delete(userId);
    }
  }
}

function ownerIds(row: any): string[] {
  return [row?.profileId, row?.profile_id, row?.userId, row?.user_id]
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export function addressBelongsToUser(row: any, userId: string): boolean {
  return ownerIds(row).includes(userId);
}

/** BILLING stays billing; legacy labels like Home are shipping. */
export function resolveAddressType(rowOrType: any): 'SHIPPING' | 'BILLING' {
  const raw =
    typeof rowOrType === 'string'
      ? rowOrType
      : (rowOrType?.addressType ?? rowOrType?.label ?? 'SHIPPING');
  return String(raw).trim().toUpperCase() === 'BILLING' ? 'BILLING' : 'SHIPPING';
}

function normalizeLine(value: unknown): string {
  return String(value ?? '').trim();
}

function isExactAddressMatch(row: any, address: AddressBody): boolean {
  const line1 = normalizeLine(row.house_number ?? row.addressLine1);
  const line2 = normalizeLine(row.street ?? row.addressLine2);
  if (!line1 && !normalizeLine(row.city)) return false;
  return (
    line1 === normalizeLine(address.addressLine1) &&
    line2 === normalizeLine(address.addressLine2) &&
    normalizeLine(row.city) === normalizeLine(address.city) &&
    normalizeLine(row.state) === normalizeLine(address.state) &&
    normalizeLine(row.pincode) === normalizeLine(address.pincode)
  );
}

function ownershipFields(userId: string) {
  return {
    profileId: userId,
    profile_id: userId,
    userId,
    user_id: userId,
  };
}

function fullAddressText(address: AddressBody): string {
  return `${address.addressLine1}, ${address.addressLine2}, ${address.city}, ${address.state} - ${address.pincode}`;
}

function createdAtOf(row: any): number {
  const raw = row.createdAt ?? row.created_at;
  return raw ? new Date(raw).getTime() : 0;
}

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
        fullName: profile?.fullName ?? profile?.full_name ?? 'Customer',
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
      fullName: profile?.fullName ?? profile?.full_name ?? 'Customer',
      email: user?.email ?? profile?.email ?? '',
      mobile: user?.phone ?? profile?.mobile_number ?? profile?.mobileNumber ?? '',
    };
  }

  async findProfile(userId: string) {
    return jsonDb.findOne('profiles', { id: userId });
  }

  private rawAddressesForUser(userId: string): any[] {
    const all = jsonDb.findMany('addresses');
    const forUser = all.filter((r: any) => addressBelongsToUser(r, userId));
    const seen = new Set<string>();
    return forUser.filter((r: any) => {
      if (!r?.id || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }

  async findAddresses(userId: string): Promise<any[]> {
    const unique = this.rawAddressesForUser(userId);
    unique.sort((a: any, b: any) => {
      if (Boolean(b.is_default) !== Boolean(a.is_default)) {
        return Boolean(b.is_default) ? 1 : -1;
      }
      return createdAtOf(a) - createdAtOf(b);
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
      addressLine1: r.house_number ?? r.addressLine1 ?? r.fullAddress?.split(',')[0] ?? r.full_address?.split(',')[0] ?? '',
      addressLine2: r.street ?? r.addressLine2 ?? r.area ?? '',
      landmark: r.landmark ?? null,
      city: r.city ?? '',
      state: r.state ?? '',
      pincode: r.pincode ?? '',
      country: 'India',
      isDefault: effectiveDefault,
      addressType: resolveAddressType(r),
      createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
      updatedAt: r.updatedAt ?? r.updated_at ?? new Date().toISOString(),
    };
    });
  }

  async findAddressByType(userId: string, addressType: string) {
    const addresses = await this.findAddresses(userId);
    const normalized = resolveAddressType(addressType);
    return addresses.find((a) => a.addressType === normalized) ?? null;
  }

  async findAddressByIdForUser(addressId: string, userId: string) {
    const addresses = await this.findAddresses(userId);
    return addresses.find((a) => a.id === addressId) ?? null;
  }

  async countShippingAddresses(userId: string) {
    const addresses = await this.findAddresses(userId);
    return addresses.filter((a) => a.addressType === 'SHIPPING').length;
  }

  private unsetDefaultShipping(userId: string, exceptId?: string): void {
    for (const row of this.rawAddressesForUser(userId)) {
      if (!row.is_default) continue;
      if (resolveAddressType(row) !== 'SHIPPING') continue;
      if (exceptId && row.id === exceptId) continue;
      jsonDb.update('addresses', { id: row.id }, {
        is_default: false,
        ...ownershipFields(userId),
      });
    }
  }

  private setDefaultShipping(addressId: string, userId: string): void {
    this.unsetDefaultShipping(userId, addressId);
    jsonDb.update('addresses', { id: addressId }, {
      is_default: true,
      ...ownershipFields(userId),
    });
  }

  async createAddress(
    userId: string,
    address: AddressBody,
    options: { isDefault?: boolean; addressType?: string } = {},
  ) {
    return withAddressLock(userId, async () => {
      const addressType = resolveAddressType(options.addressType ?? 'SHIPPING');
      const shippingCount =
        addressType === 'SHIPPING' ? await this.countShippingAddresses(userId) : 0;
      const makeDefault =
        Boolean(options.isDefault) || (addressType === 'SHIPPING' && shippingCount === 0);

      const userAddressesOfType = this.rawAddressesForUser(userId).filter(
        (r: any) => resolveAddressType(r) === addressType,
      );

      // Exact duplicate → reuse existing row (idempotent create).
      const exactMatch = userAddressesOfType.find((r: any) => isExactAddressMatch(r, address));
      if (exactMatch) {
        if (makeDefault && addressType === 'SHIPPING') {
          this.setDefaultShipping(exactMatch.id, userId);
          return { id: exactMatch.id, isDefault: true };
        }
        return { id: exactMatch.id, isDefault: Boolean(exactMatch.is_default) };
      }

      if (makeDefault && addressType === 'SHIPPING') {
        this.unsetDefaultShipping(userId);
      }

      // Repair empty/corrupt row of the same type instead of inserting another.
      const corruptExisting = userAddressesOfType.find((r: any) => !normalizeLine(r.city));
      if (corruptExisting) {
        const updated = jsonDb.update('addresses', { id: corruptExisting.id }, {
          ...ownershipFields(userId),
          house_number: normalizeLine(address.addressLine1),
          street: normalizeLine(address.addressLine2),
          landmark: address.landmark?.trim() || null,
          city: normalizeLine(address.city),
          state: normalizeLine(address.state),
          pincode: normalizeLine(address.pincode),
          label: addressType,
          addressType,
          is_default: makeDefault,
          fullAddress: fullAddressText(address),
          full_address: fullAddressText(address),
        });
        return { id: updated?.id ?? corruptExisting.id, isDefault: makeDefault };
      }

      const created = jsonDb.insert('addresses', {
        id: uuidv4(),
        ...ownershipFields(userId),
        house_number: normalizeLine(address.addressLine1),
        street: normalizeLine(address.addressLine2),
        landmark: address.landmark?.trim() || null,
        city: normalizeLine(address.city),
        state: normalizeLine(address.state),
        pincode: normalizeLine(address.pincode),
        label: addressType,
        addressType,
        is_default: makeDefault,
        fullAddress: fullAddressText(address),
        full_address: fullAddressText(address),
      });

      return { id: created.id, isDefault: makeDefault };
    });
  }

  async updateAddress(
    addressId: string,
    _userId: string,
    address: AddressBody,
    _options: { isDefault?: boolean; addressType?: string } = {},
  ) {
    const updated = jsonDb.update('addresses', { id: addressId }, {
      house_number: normalizeLine(address.addressLine1),
      street: normalizeLine(address.addressLine2),
      landmark: address.landmark?.trim() || null,
      city: normalizeLine(address.city),
      state: normalizeLine(address.state),
      pincode: normalizeLine(address.pincode),
      fullAddress: fullAddressText(address),
      full_address: fullAddressText(address),
    });
    return { id: updated?.id ?? addressId };
  }

  async deleteAddress(addressId: string, _userId: string) {
    return jsonDb.delete('addresses', { id: addressId });
  }

  async setDefaultAddress(addressId: string, userId: string) {
    return withAddressLock(userId, async () => {
      const existing = this.rawAddressesForUser(userId).find((r: any) => r.id === addressId);
      if (!existing) return null;
      if (resolveAddressType(existing) !== 'SHIPPING') {
        // Keep non-shipping rows out of the shipping-default rule.
        jsonDb.update('addresses', { id: addressId }, { is_default: true, ...ownershipFields(userId) });
        return { id: addressId };
      }
      this.setDefaultShipping(addressId, userId);
      return { id: addressId };
    });
  }

  async upsertProfile(input: {
    userId: string;
    fullName: string;
    email: string;
    mobile: string;
    dob: Date;
    gender: any;
  }) {
    const dob =
      input.dob instanceof Date ? input.dob.toISOString().split('T')[0] : input.dob;
    const payload = {
      fullName: input.fullName,
      full_name: input.fullName,
      email: input.email,
      mobile_number: input.mobile,
      dob,
      gender: input.gender,
    };
    const existing = jsonDb.findOne('profiles', { id: input.userId });
    if (existing) {
      return jsonDb.update('profiles', { id: input.userId }, payload);
    }
    return jsonDb.insert('profiles', {
      id: input.userId,
      ...payload,
    });
  }

  async syncUserIdentity(userId: string, fullName: string, email: string) {
    jsonDb.update('users', { id: userId }, { email });
    return jsonDb.update('profiles', { id: userId }, {
      fullName,
      full_name: fullName,
      email,
    });
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
