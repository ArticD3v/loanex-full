import { jsonDb } from '../../config/json-db';
import { supabase } from '../../config/supabase';
import { v4 as uuidv4 } from 'uuid';

export class AuthRepository {
  private async formatUserWithProfile(user: any) {
    if (!user) return null;
    const profile = jsonDb.findOne('profiles', { id: user.id });
    return {
      ...user,
      profiles: profile || null,
    };
  }

  /**
   * Pick the best account row when duplicates exist (e.g. demo seed + real
   * registration share the same phone). Prefer the row that actually has a
   * password hash so phone+password login verifies against the right account.
   */
  private pickBestUserMatch(rows: any[]): any | null {
    if (!rows || rows.length === 0) return null;
    const hasPassword = (u: any) => {
      const hash = u?.encryptedPassword ?? u?.password ?? '';
      return typeof hash === 'string' && hash.length > 0;
    };
    const withPassword = rows.filter(hasPassword);
    const pool = withPassword.length > 0 ? withPassword : rows;
    return pool.sort((a, b) => {
      const ta = new Date(a.created_at ?? a.createdAt ?? 0).getTime();
      const tb = new Date(b.created_at ?? b.createdAt ?? 0).getTime();
      return tb - ta;
    })[0];
  }

  /**
   * Source-mode serverless instances hydrate once at cold start.
   * Users created on another instance exist in Supabase but not in memory —
   * always fall back to Supabase and seed the local cache on hit.
   */
  private async loadUserFromSupabase(where: {
    id?: string;
    phone?: string;
    email?: string;
  }): Promise<any | null> {
    try {
      let query = supabase.from('users').select('*').limit(20);
      if (where.id) query = query.eq('id', where.id);
      if (where.phone) query = query.eq('phone', where.phone);
      if (where.email) query = query.eq('email', where.email);

      const { data, error } = await query;
      if (error || !data || data.length === 0) return null;

      // Duplicate rows (demo seed + real account) can share a phone/email —
      // prefer the row that carries an encrypted password.
      const best = this.pickBestUserMatch(data);
      if (!best) return null;

      // Seed in-memory cache so subsequent reads in this instance are fast.
      // Mutate local collection only — do not re-mirror a row we just read.
      const collection = jsonDb.getCollection('users');
      const idx = collection.findIndex((u: any) => u.id === best.id);
      if (idx === -1) {
        collection.push(best);
      } else {
        collection[idx] = {
          ...collection[idx],
          ...best,
          encryptedPassword:
            best.encryptedPassword || collection[idx].encryptedPassword,
        };
      }

      // Also pull profile if missing locally.
      if (!jsonDb.findOne('profiles', { id: best.id })) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', best.id)
          .limit(1);
        if (profile && profile.length > 0) {
          jsonDb.getCollection('profiles').push(profile[0]);
        }
      }

      return best;
    } catch (err) {
      console.error('[AuthRepository] Supabase user lookup failed', err);
      return null;
    }
  }

  async findByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const local = this.pickBestUserMatch(jsonDb.findMany('users', { email: normalized }));
    let user = local;
    if (!user) {
      user = await this.loadUserFromSupabase({ email: normalized });
    }
    return this.formatUserWithProfile(user);
  }

  async findByMobile(mobile: string) {
    const phone = mobile.trim();
    const local = this.pickBestUserMatch(jsonDb.findMany('users', { phone }));
    let user = local;
    if (!user) {
      user = await this.loadUserFromSupabase({ phone });
    }
    return this.formatUserWithProfile(user);
  }

  async findById(id: string) {
    const local = this.pickBestUserMatch(jsonDb.findMany('users', { id }));
    let user = local;
    if (!user) {
      user = await this.loadUserFromSupabase({ id });
    }
    return this.formatUserWithProfile(user);
  }

  async findByUuid(uuid: string) {
    return this.findById(uuid);
  }

  async findByIdentifier(identifier: string) {
    const isMobile = /^[6-9]\d{9}$/.test(identifier.trim());
    if (isMobile) {
      return this.findByMobile(identifier.trim());
    }
    return this.findByEmail(identifier.trim().toLowerCase());
  }

  async createUser(data: {
    fullName: string;
    email: string;
    mobile: string;
    password?: string;
    status?: any;
    mobileVerified?: boolean;
    dob?: string;
    gender?: string;
  }) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const status = data.status ?? 'PENDING';
    const mobileVerified =
      data.mobileVerified ?? String(status).toUpperCase() === 'ACTIVE';

    // Await Supabase mirror so password hash is durable across serverless instances.
    const user = await jsonDb.insertAwaited('users', {
      id,
      phone: data.mobile,
      email: data.email,
      encryptedPassword: data.password ?? '',
      role: 'authenticated',
      status,
      mobileVerified,
      mobile_verified: mobileVerified,
      created_at: now,
      updated_at: now,
      createdAt: now,
      updatedAt: now,
    });

    const profile = await jsonDb.insertAwaited('profiles', {
      id,
      mobile_number: data.mobile,
      fullName: data.fullName,
      email: data.email,
      ...(data.dob ? { dob: data.dob } : {}),
      ...(data.gender ? { gender: data.gender } : {}),
      createdAt: now,
      updatedAt: now,
    });

    return { ...user, profiles: profile };
  }

  async updateUser(id: string, data: any) {
    // Ensure row is in memory before update.
    await this.findById(id);
    const updated = await jsonDb.updateAwaited('users', { id }, data);
    return this.formatUserWithProfile(updated);
  }

  async activateUser(id: string) {
    const now = new Date().toISOString();
    await this.findById(id);
    const user = await jsonDb.updateAwaited(
      'users',
      { id },
      {
        status: 'ACTIVE',
        mobileVerified: true,
        mobile_verified: true,
        updatedAt: now,
        updated_at: now,
      },
    );
    return this.formatUserWithProfile(user || jsonDb.findOne('users', { id }));
  }

  async invalidateOtps(mobile: string, purpose: any) {
    const all = jsonDb.findMany('otps');
    for (const row of all) {
      if (row.mobile === mobile && String(row.purpose) === String(purpose) && !row.used) {
        jsonDb.update('otps', { id: row.id }, { used: true, invalidated: true });
      }
    }
  }

  async createOtp(data: {
    mobile: string;
    otp: string;
    purpose: any;
    expiresAt: Date;
    resendCount?: number;
    userId?: string;
  }) {
    return jsonDb.insert('otps', {
      mobile: data.mobile,
      purpose: String(data.purpose),
      otpHash: data.otp,
      expiresAt:
        data.expiresAt instanceof Date
          ? data.expiresAt.toISOString()
          : data.expiresAt,
      attempts: 0,
      resendCount: data.resendCount ?? 1,
      lastSentAt: new Date().toISOString(),
      used: false,
      invalidated: false,
      ...(data.userId ? { userId: data.userId } : {}),
    });
  }

  async findLatestOtp(mobile: string, purpose: any) {
    const rows = jsonDb
      .findMany('otps')
      .filter(
        (r: any) =>
          r.mobile === mobile &&
          String(r.purpose) === String(purpose) &&
          !r.used &&
          !r.invalidated,
      )
      .sort((a: any, b: any) => {
        const ta = a.lastSentAt ? new Date(a.lastSentAt).getTime() : 0;
        const tb = b.lastSentAt ? new Date(b.lastSentAt).getTime() : 0;
        return tb - ta;
      });
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      expiresAt: new Date(row.expiresAt),
      lastSentAt: row.lastSentAt ? new Date(row.lastSentAt) : null,
    };
  }

  async findValidOtp(mobile: string, purpose: any, otpHash: string) {
    const row = await this.findLatestOtp(mobile, purpose);
    if (!row) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;
    if (row.otpHash !== otpHash) return null;
    return row;
  }

  async incrementOtpAttempts(id: string) {
    const row = jsonDb.findOne('otps', { id });
    if (!row) return null;
    return jsonDb.update('otps', { id }, { attempts: Number(row.attempts ?? 0) + 1 });
  }

  async markOtpUsed(id: string) {
    jsonDb.update('otps', { id }, { used: true });
  }

  async createRefreshToken(data: any) {
    const userId = data?.user?.connect?.id;
    if (!userId || !data?.token) return null;
    const expiresAt =
      data.expiresAt instanceof Date
        ? data.expiresAt.toISOString()
        : data.expiresAt;
    const row = {
      token: data.token,
      expiresAt,
      userId,
    };
    try {
      // Preferred table when it exists in Supabase.
      return await jsonDb.insertAwaited('refresh_tokens', row);
    } catch (err) {
      // Production DB is missing public.refresh_tokens (and DATABASE_URL can't DDL).
      // Persist via audit_log so refresh works across serverless instances.
      console.warn(
        '[auth] refresh_tokens unavailable — persisting via audit_log fallback:',
        err instanceof Error ? err.message : err,
      );
      const fallback = await jsonDb.insertAwaited('audit_log', {
        userId,
        action: 'AUTH_REFRESH_TOKEN',
        module: 'auth',
        details: data.token,
        metadata: { token: data.token, expiresAt, userId },
      });
      return {
        id: fallback.id,
        token: data.token,
        expiresAt,
        userId,
      };
    }
  }

  async findRefreshToken(tokenHash: string) {
    await jsonDb.refreshCollection('refresh_tokens');
    let stored = jsonDb.findOne('refresh_tokens', { token: tokenHash });

    if (!stored) {
      await jsonDb.refreshCollection('audit_log');
      const rows = jsonDb.findMany('audit_log', { action: 'AUTH_REFRESH_TOKEN' });
      const hit = rows.find((row: any) => {
        const metaToken = row?.metadata?.token ?? row?.details;
        return metaToken === tokenHash;
      });
      if (hit) {
        stored = {
          id: hit.id,
          token: tokenHash,
          userId: hit.userId ?? hit.metadata?.userId,
          expiresAt: hit.metadata?.expiresAt ?? hit.createdAt,
          _fallbackAuditId: hit.id,
        };
      }
    }

    if (!stored) return null;
    const user = await this.findById(stored.userId);
    if (!user) return null;
    return {
      ...stored,
      expiresAt: new Date(stored.expiresAt),
      user,
    };
  }

  async deleteRefreshToken(tokenHash: string) {
    try {
      await jsonDb.deleteAwaited('refresh_tokens', { token: tokenHash });
    } catch {
      /* table may not exist */
    }
    await jsonDb.refreshCollection('audit_log');
    const rows = jsonDb
      .findMany('audit_log', { action: 'AUTH_REFRESH_TOKEN' })
      .filter((row: any) => (row?.metadata?.token ?? row?.details) === tokenHash);
    for (const row of rows) {
      await jsonDb.deleteAwaited('audit_log', { id: row.id });
    }
  }

  async deleteUserRefreshTokens(userId: string) {
    try {
      await jsonDb.refreshCollection('refresh_tokens');
      const rows = jsonDb.findMany('refresh_tokens', { userId });
      for (const row of rows) {
        await jsonDb.deleteAwaited('refresh_tokens', { id: row.id });
      }
    } catch {
      /* table may not exist */
    }
    await jsonDb.refreshCollection('audit_log');
    const auditRows = jsonDb
      .findMany('audit_log', { action: 'AUTH_REFRESH_TOKEN' })
      .filter((row: any) => row.userId === userId || row?.metadata?.userId === userId);
    for (const row of auditRows) {
      await jsonDb.deleteAwaited('audit_log', { id: row.id });
    }
  }
}

export const authRepository = new AuthRepository();
