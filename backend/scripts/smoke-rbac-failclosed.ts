/**
 * Smoke test for the fail-closed RBAC surface:
 *
 *  1. rolesService.resolveUserPermissions(userId):
 *     - role_id set + role found        → role's permissions
 *     - role_id set + role MISSING      → [] (deny) — NEVER Super Admin, even
 *       when the legacy role string is 'admin'
 *     - legacy 'admin', no role_id      → SUPER_ADMIN_PERMISSIONS (back-compat)
 *     - customer / unknown user         → []
 *  2. admin.controller resolveRbacForUser(user) — same parity (the sync
 *     in-memory variant used when serializing user responses)
 *  3. requirePermission(permission) middleware:
 *     - missing req.user        → ForbiddenError
 *     - user lacks permission   → ForbiddenError
 *     - unknown permission key  → ForbiddenError (graceful, no 500 / no crash)
 *     - user has permission     → next() called
 *
 * Run: npx tsx scripts/smoke-rbac-failclosed.ts
 */
import { jsonDb } from '../src/config/json-db';
import { rolesService } from '../src/modules/rbac/roles.service';
import { resolveRbacForUser } from '../src/modules/admin/admin.controller';
import { requirePermission } from '../src/common/middleware/require-permission';
import { SUPER_ADMIN_PERMISSIONS } from '../src/modules/rbac/permissions';
import { ForbiddenError } from '../src/common/errors/app-error';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

function makeUser(overrides: Record<string, unknown>) {
  return {
    id: 'smoke-rbac-user',
    phone: '9000000001',
    email: null,
    role: 'customer',
    role_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeRole(overrides: Record<string, unknown>) {
  return {
    id: 'smoke-rbac-role',
    name: 'Smoke Role',
    description: 'Smoke-test role',
    permissions: ['orders.view', 'customers.view'],
    is_system: false,
    isSystem: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

async function main() {
  // Wait for the cold-start Supabase hydrate to finish BEFORE seeding test
  // rows — hydrate replaces the in-memory arrays wholesale, which would
  // otherwise wipe our rows mid-test and turn granted checks into denies.
  await jsonDb.ready;

  const results: Record<string, unknown> = {};
  const failures: string[] = [];

  const check = async (label: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      results[label] = 'ok';
    } catch (err) {
      failures.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      results[label] = 'FAILED';
    }
  };

  // Manipulate only the in-memory collections (no jsonDb.insert/delete → no
  // db.json writes or Supabase mirrors). Restore originals in finally.
  const usersCol = jsonDb.getCollection('users');
  const rolesCol = jsonDb.getCollection('roles');
  const origUsers = [...usersCol];
  const origRoles = [...rolesCol];

  try {
    const creditOfficer = makeRole({ id: 'smoke-rbac-role-co', name: 'Credit Officer' });
    const userWithRole = makeUser({ id: 'smoke-rbac-user-role', role_id: creditOfficer.id });
    const userMissingRole = makeUser({ id: 'smoke-rbac-user-missing', role: 'admin', role_id: 'role-that-does-not-exist' });
    const legacyAdmin = makeUser({ id: 'smoke-rbac-user-legacy', role: 'admin', role_id: null });
    const customer = makeUser({ id: 'smoke-rbac-user-customer', role: 'customer', role_id: null });

    usersCol.push(userWithRole, userMissingRole, legacyAdmin, customer);
    rolesCol.push(creditOfficer);

    // 1. rolesService.resolveUserPermissions
    await check('roles-service-role-found', async () => {
      const perms = await rolesService.resolveUserPermissions(userWithRole.id);
      assert(
        perms.includes('orders.view') && perms.includes('customers.view') && !perms.includes('products.delete'),
        `role found → got ${JSON.stringify(perms)}`,
      );
    });

    await check('roles-service-role-missing-denies', async () => {
      const perms = await rolesService.resolveUserPermissions(userMissingRole.id);
      assert(
        perms.length === 0,
        `role_id set + role missing → expected [] (deny), got ${JSON.stringify(perms)}`,
      );
      assert(
        !perms.includes('products.view'),
        'role_id set + role missing must NEVER grant any Super Admin permission',
      );
    });

    await check('roles-service-legacy-admin', async () => {
      const perms = await rolesService.resolveUserPermissions(legacyAdmin.id);
      assert(
        perms.length === SUPER_ADMIN_PERMISSIONS.length &&
          perms.includes('roles.create') &&
          perms.includes('settings.edit'),
        `legacy admin → expected Super Admin perms, got ${JSON.stringify(perms)}`,
      );
    });

    await check('roles-service-customer-denies', async () => {
      const perms = await rolesService.resolveUserPermissions(customer.id);
      assert(perms.length === 0, `customer → expected [], got ${JSON.stringify(perms)}`);
    });

    await check('roles-service-unknown-user-denies', async () => {
      const perms = await rolesService.resolveUserPermissions('smoke-rbac-user-nobody');
      assert(perms.length === 0, `unknown user → expected [], got ${JSON.stringify(perms)}`);
    });

    // 2. admin.controller resolveRbacForUser — parity with roles.service
    await check('controller-role-found', () => {
      const rbac = resolveRbacForUser(userWithRole);
      assert(
        rbac.roleId === creditOfficer.id &&
          rbac.roleName === 'Credit Officer' &&
          rbac.permissions.includes('orders.view'),
        `controller role found → got ${JSON.stringify(rbac)}`,
      );
    });

    await check('controller-role-missing-denies', () => {
      const rbac = resolveRbacForUser(userMissingRole);
      assert(
        rbac.permissions.length === 0,
        `controller role_id set + role missing → expected [] (deny), got ${JSON.stringify(rbac.permissions)}`,
      );
      assert(
        rbac.roleName === null,
        `controller must not label a missing-role user 'Super Admin', got ${String(rbac.roleName)}`,
      );
    });

    await check('controller-legacy-admin', () => {
      const rbac = resolveRbacForUser(legacyAdmin);
      assert(
        rbac.permissions.length === SUPER_ADMIN_PERMISSIONS.length,
        `controller legacy admin → expected Super Admin perms, got ${JSON.stringify(rbac.permissions)}`,
      );
    });

    await check('controller-customer-denies', () => {
      const rbac = resolveRbacForUser(customer);
      assert(rbac.permissions.length === 0, `controller customer → expected [], got ${JSON.stringify(rbac.permissions)}`);
    });

    // 3. requirePermission middleware
    const callMiddleware = (permission: string, req: any) =>
      new Promise<{ error?: unknown; called?: boolean }>((resolve) => {
        const mw = requirePermission(permission);
        mw(req, {} as any, (err?: unknown) => {
          if (err) resolve({ error: err });
          else resolve({ called: true });
        });
      });

    await check('middleware-missing-user-rejects', async () => {
      const result = await callMiddleware('orders.view', {});
      assert(result.error instanceof ForbiddenError, `missing user → expected ForbiddenError, got ${String(result.error)}`);
    });

    await check('middleware-lacks-permission-rejects', async () => {
      const result = await callMiddleware('roles.delete', { user: { sub: userWithRole.id } });
      assert(result.error instanceof ForbiddenError, `lacking permission → expected ForbiddenError, got ${String(result.error)}`);
    });

    await check('middleware-unknown-permission-graceful', async () => {
      // An unknown permission key (typo / not in registry) must reject cleanly
      // with 403-style ForbiddenError — not crash, not 500, not escalate.
      const result = await callMiddleware('totally.unknown-permission', { user: { sub: legacyAdmin.id } });
      assert(result.error instanceof ForbiddenError, `unknown permission → expected ForbiddenError, got ${String(result.error)}`);
    });

    await check('middleware-granted-passes', async () => {
      const result = await callMiddleware('orders.view', { user: { sub: userWithRole.id } });
      assert(result.called === true, `granted permission → expected next() without error, got ${JSON.stringify(result)}`);
    });
  } finally {
    usersCol.length = 0;
    usersCol.push(...origUsers);
    rolesCol.length = 0;
    rolesCol.push(...origRoles);
  }

  console.log(
    JSON.stringify(
      {
        checks: results,
        failures,
        ok: failures.length === 0,
      },
      null,
      2,
    ),
  );
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
