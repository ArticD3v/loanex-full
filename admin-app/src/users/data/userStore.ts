import { AppUser } from '../../types/user';

let users: AppUser[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getUsers(): AppUser[] {
  return users;
}

export function getUserById(id: string): AppUser | undefined {
  return users.find((user) => user.id === id);
}

export function subscribeUsers(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function addUser(input: Omit<AppUser, 'id'>): AppUser {
  const nextNumber = users.reduce((max, user) => {
    const n = Number(user.id.replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 10000);
  const created: AppUser = {
    ...input,
    branches: [...input.branches],
    pincodes: [...input.pincodes],
    id: `USR-${nextNumber + 1}`,
  };
  users = [created, ...users];
  notify();
  return created;
}

export function updateUser(id: string, input: Omit<AppUser, 'id'>): AppUser | undefined {
  let updated: AppUser | undefined;
  users = users.map((user) => {
    if (user.id !== id) return user;
    updated = {
      ...user,
      ...input,
      id,
      branches: [...input.branches],
      pincodes: [...input.pincodes],
    };
    return updated;
  });
  if (updated) notify();
  return updated;
}

export function setUserBlocked(id: string, blocked: boolean): AppUser | undefined {
  let updated: AppUser | undefined;
  users = users.map((user) => {
    if (user.id !== id) return user;
    updated = { ...user, blocked };
    return updated;
  });
  if (updated) notify();
  return updated;
}

export function updateUserAccess(
  id: string,
  access: { branches?: string[]; pincodes?: string[] },
): AppUser | undefined {
  let updated: AppUser | undefined;
  users = users.map((user) => {
    if (user.id !== id) return user;
    updated = {
      ...user,
      branches: access.branches ? [...access.branches] : user.branches,
      pincodes: access.pincodes ? [...access.pincodes] : user.pincodes,
    };
    return updated;
  });
  if (updated) notify();
  return updated;
}
