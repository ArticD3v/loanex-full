import { useSyncExternalStore } from 'react';
import type { User } from '../services/authService';

interface RbacState {
  user: User | null;
  permissions: string[];
  roleName: string | null;
}

let state: RbacState = { user: null, permissions: [], roleName: null };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setRbacUser(user: User | null): void {
  state = {
    user,
    permissions: Array.isArray(user?.permissions) ? user.permissions : [],
    roleName: user?.roleName ?? null,
  };
  notify();
}

export function clearRbac(): void {
  state = { user: null, permissions: [], roleName: null };
  notify();
}

export function getRbacState(): RbacState {
  return state;
}

export function can(permission: string): boolean {
  return state.permissions.includes(permission);
}

export function canAny(...permissions: string[]): boolean {
  return permissions.some((permission) => state.permissions.includes(permission));
}

export function subscribeRbac(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React hook — re-renders the component when permissions change. */
export function useRbac(): RbacState {
  return useSyncExternalStore(subscribeRbac, getRbacState, getRbacState);
}
