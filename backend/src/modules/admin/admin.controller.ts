import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { jsonDb } from '../../config/json-db';
import { sendSuccess } from '../../common/utils/api-response';
import { NotFoundError, BadRequestError } from '../../common/errors/app-error';
import { hashPassword } from '../../common/utils/password';

const MASTER_COLLECTIONS = ['suppliers', 'dealers', 'warehouses'] as const;

function toProfile(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    mobile_number: row.mobile_number ?? row.mobileNumber ?? '',
    fullName: row.fullName ?? '',
    email: row.email ?? '',
    dob: row.dob ?? '',
    gender: row.gender ?? '',
    kyc_status: row.kyc_status ?? 'Pending',
    branches: Array.isArray(row.branches) ? row.branches : [],
    pincodes: Array.isArray(row.pincodes) ? row.pincodes : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function serializeUser(user: any) {
  const profile = toProfile(jsonDb.findOne('profiles', { id: user.id }));
  return {
    id: user.id,
    phone: user.phone ?? '',
    email: user.email ?? '',
    role: user.role ?? 'customer',
    created_at: user.created_at ?? user.createdAt,
    updated_at: user.updated_at ?? user.updatedAt,
    profile,
  };
}

export class AdminController {
  /** GET /admin/users — every user with profile (customer + staff). */
  listUsers = async (_req: Request, res: Response) => {
    const users = jsonDb
      .findMany('users', {})
      .sort((a: any, b: any) =>
        String(b.created_at || '').localeCompare(String(a.created_at || '')),
      )
      .map(serializeUser);
    return sendSuccess(res, users, 'Users fetched');
  };

  /** POST /admin/users — create a user (staff or customer) with profile. */
  createUser = async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const mobile = String(body.mobile ?? '').trim();
    const role = body.role === 'admin' || (body.role && body.role !== 'customer') ? 'admin' : 'customer';

    if (!name && !email && !mobile) {
      throw new BadRequestError('At least a name, email or mobile is required');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const existingEmail = email ? jsonDb.findOne('users', { email }) : null;
    const existingMobile = mobile ? jsonDb.findOne('users', { phone: mobile }) : null;
    if (existingEmail || existingMobile) {
      throw new BadRequestError('A user with this email or mobile already exists');
    }

    const encryptedPassword = body.password ? await hashPassword(String(body.password)) : undefined;

    const user = jsonDb.insert('users', {
      id,
      phone: mobile || null,
      email: email || null,
      role,
      encryptedPassword: encryptedPassword ?? '',
      created_at: now,
      updated_at: now,
    });

    jsonDb.insert('profiles', {
      id,
      mobile_number: mobile,
      fullName: name || (email ? email.split('@')[0] : `User ${id.slice(0, 6)}`),
      email: email || null,
      kyc_status: body.kyc_status ?? 'Pending',
      branches: Array.isArray(body.branches) ? body.branches : [],
      pincodes: Array.isArray(body.pincodes) ? body.pincodes : [],
      createdAt: now,
      updatedAt: now,
    });

    return sendSuccess(res, serializeUser(user), 'User created', 201);
  };

  /** PATCH /admin/users/:id — update user + profile (name, email, phone, branches, pincodes, status). */
  updateUser = async (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const body = req.body ?? {};
    const existing = jsonDb.findOne('users', { id });
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    const updates: Record<string, any> = {};
    if (body.email !== undefined) updates.email = String(body.email).trim().toLowerCase() || null;
    if (body.mobile !== undefined) updates.phone = String(body.mobile).trim() || null;
    if (body.role !== undefined) {
      updates.role = body.role === 'admin' || (body.role && body.role !== 'customer') ? 'admin' : 'customer';
    }
    if (body.password) {
      updates.encryptedPassword = await hashPassword(String(body.password));
    }

    const updatedUser = jsonDb.update('users', { id }, updates) ?? existing;

    const profile = jsonDb.findOne('profiles', { id });
    const profileUpdates: Record<string, any> = {};
    if (body.name !== undefined) profileUpdates.fullName = String(body.name).trim();
    if (body.mobile !== undefined) profileUpdates.mobile_number = String(body.mobile).trim();
    if (body.email !== undefined) profileUpdates.email = String(body.email).trim() || null;
    if (body.kyc_status !== undefined) profileUpdates.kyc_status = String(body.kyc_status);
    if (Array.isArray(body.branches)) profileUpdates.branches = body.branches;
    if (Array.isArray(body.pincodes)) profileUpdates.pincodes = body.pincodes;

    if (profile) {
      jsonDb.update('profiles', { id }, profileUpdates);
    } else {
      jsonDb.insert('profiles', {
        id,
        mobile_number: profileUpdates.mobile_number ?? '',
        fullName: profileUpdates.fullName ?? '',
        email: profileUpdates.email ?? null,
        kyc_status: profileUpdates.kyc_status ?? 'Pending',
        branches: profileUpdates.branches ?? [],
        pincodes: profileUpdates.pincodes ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return sendSuccess(res, serializeUser(updatedUser), 'User updated');
  };

  /** GET /admin/kyc — all customer KYC records. */
  listKyc = async (_req: Request, res: Response) => {
    const records = jsonDb
      .findMany('customer_kyc', {})
      .sort((a: any, b: any) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
      );
    return sendSuccess(res, records, 'KYC records fetched');
  };

  /** GET /admin/fi-cases — all FI (field investigation) cases. */
  listFiCases = async (_req: Request, res: Response) => {
    const cases = jsonDb
      .findMany('fi_cases', {})
      .sort((a: any, b: any) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
      );
    return sendSuccess(res, cases, 'FI cases fetched');
  };

  /** GET /admin/fi-cases/:fiCaseId */
  getFiCase = async (req: Request, res: Response) => {
    const id = String(req.params.fiCaseId ?? '');
    const item = jsonDb.findOne('fi_cases', { id });
    if (!item) {
      throw new NotFoundError('FI case not found');
    }
    return sendSuccess(res, item, 'FI case fetched');
  };

  /** PATCH /admin/fi-cases/:fiCaseId */
  updateFiCase = async (req: Request, res: Response) => {
    const id = String(req.params.fiCaseId ?? '');
    const existing = jsonDb.findOne('fi_cases', { id });
    if (!existing) {
      throw new NotFoundError('FI case not found');
    }
    const updated = jsonDb.update('fi_cases', { id }, req.body ?? {});
    return sendSuccess(res, updated, 'FI case updated');
  };

  /** GET /admin/suppliers|dealers|warehouses */
  listMaster = async (req: Request, res: Response) => {
    const collection = this.resolveMasterCollection(req.path);
    const items = jsonDb.findMany(collection, {});
    return sendSuccess(res, items, 'Master data fetched');
  };

  /** POST /admin/suppliers|dealers|warehouses */
  createMaster = async (req: Request, res: Response) => {
    const collection = this.resolveMasterCollection(req.path);
    const created = jsonDb.insert(collection, req.body ?? {});
    return sendSuccess(res, created, 'Master record created', 201);
  };

  /** PUT /admin/suppliers|dealers|warehouses/:id */
  updateMaster = async (req: Request, res: Response) => {
    const collection = this.resolveMasterCollection(req.path);
    const id = String(req.params.id ?? '');
    const existing = jsonDb.findOne(collection, { id });
    if (!existing) {
      throw new NotFoundError('Master record not found');
    }
    const updated = jsonDb.update(collection, { id }, req.body ?? {});
    return sendSuccess(res, updated, 'Master record updated');
  };

  /** DELETE /admin/suppliers|dealers|warehouses/:id */
  deleteMaster = async (req: Request, res: Response) => {
    const collection = this.resolveMasterCollection(req.path);
    const id = String(req.params.id ?? '');
    const existing = jsonDb.findOne(collection, { id });
    if (!existing) {
      throw new NotFoundError('Master record not found');
    }
    jsonDb.delete(collection, { id });
    return sendSuccess(res, { deleted: true }, 'Master record deleted');
  };

  private resolveMasterCollection(path: string): string {
    const match = MASTER_COLLECTIONS.find((c) => path.startsWith(`/${c}`));
    if (!match) {
      throw new BadRequestError('Unknown master collection');
    }
    return match;
  }
}

export const adminController = new AdminController();
