import { jsonDb } from '../../config/json-db';

export class RolesRepository {
  list(): any[] {
    return jsonDb
      .findMany('roles', {})
      .sort((a: any, b: any) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
  }

  findById(id: string): any | null {
    return jsonDb.findOne('roles', { id });
  }

  findByName(name: string): any | null {
    return jsonDb.findOne('roles', { name });
  }

  /** Await the Supabase mirror so role CRUD is durable across serverless instances. */
  async create(data: { name: string; description?: string; permissions?: string[]; isSystem?: boolean }) {
    const now = new Date().toISOString();
    return jsonDb.insertAwaited('roles', {
      name: data.name,
      description: data.description ?? '',
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      is_system: Boolean(data.isSystem),
      isSystem: Boolean(data.isSystem),
      created_at: now,
      updated_at: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(id: string, data: Partial<{ name: string; description: string; permissions: string[] }>) {
    const patch: Record<string, any> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.permissions !== undefined) patch.permissions = data.permissions;
    patch.updated_at = new Date().toISOString();
    return jsonDb.updateAwaited('roles', { id }, patch);
  }

  async remove(id: string) {
    return jsonDb.deleteAwaited('roles', { id });
  }

  countUsersWithRole(roleId: string): number {
    return jsonDb.count('users', { role_id: roleId });
  }
}

export const rolesRepository = new RolesRepository();
