import api from './api';
import { Role } from '../types/role';

function mapRole(raw: any): Role {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? '',
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
    isSystem: Boolean(raw.isSystem ?? raw.is_system ?? false),
    userCount: Number(raw.userCount ?? 0),
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

export const getRoles = async (): Promise<Role[]> => {
  const response = await api.get('/admin/roles');
  const data = response.data?.data ?? [];
  return Array.isArray(data) ? data.map(mapRole) : [];
};

export const getRoleById = async (roleId: string): Promise<Role | undefined> => {
  const response = await api.get(`/admin/roles/${roleId}`);
  const data = response.data?.data;
  return data ? mapRole(data) : undefined;
};

export const createRole = async (input: {
  name: string;
  description?: string;
  permissions: string[];
}): Promise<Role> => {
  const response = await api.post('/admin/roles', input);
  return mapRole(response.data?.data);
};

export const updateRole = async (
  roleId: string,
  input: { name?: string; description?: string; permissions?: string[] },
): Promise<Role> => {
  const response = await api.patch(`/admin/roles/${roleId}`, input);
  return mapRole(response.data?.data);
};

export const deleteRole = async (roleId: string): Promise<void> => {
  await api.delete(`/admin/roles/${roleId}`);
};
