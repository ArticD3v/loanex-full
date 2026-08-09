/**
 * Smoke test for resolveRoleAssignment — the admin payload → role assignment
 * mapper in admin.controller.ts.
 *
 * Covers:
 *  - every seeded role name (Super Admin, Branch Manager, Credit Officer,
 *    FI Executive, Sales Executive) → resolves to that role's id
 *  - a custom role name (inserted into jsonDb just for this run) → resolves
 *  - 'customer' (and case variants / undefined) → customer, no roleId
 *  - the legacy 'admin' string → admin with null roleId (Super Admin fallback
 *    happens later in resolveRbacForUser, not here)
 *  - an unknown role string → throws instead of silently escalating to
 *    Super Admin (fail closed)
 *
 * Run: npx tsx scripts/smoke-role-assignment.ts
 */
import { jsonDb } from '../src/config/json-db';
import { resolveRoleAssignment } from '../src/modules/admin/admin.controller';
import { BadRequestError } from '../src/common/errors/app-error';

const SEEDED_ROLE_NAMES = [
  'Super Admin',
  'Branch Manager',
  'Credit Officer',
  'FI Executive',
  'Sales Executive',
];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function main() {
  const results: Record<string, unknown> = {};
  const failures: string[] = [];

  const check = (label: string, fn: () => void) => {
    try {
      fn();
      results[label] = 'ok';
    } catch (err) {
      failures.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      results[label] = 'FAILED';
    }
  };

  // 1. Every seeded role name resolves to that role's id.
  check('seeded-roles', () => {
    const roles = jsonDb.findMany('roles', {});
    for (const name of SEEDED_ROLE_NAMES) {
      const seeded = jsonDb.findOne('roles', { name });
      assert(seeded, `seeded role missing from data: ${name}`);
      const assignment = resolveRoleAssignment({ role: name });
      assert(
        assignment.role === 'admin' && assignment.roleId === seeded.id,
        `seeded role "${name}" → got ${JSON.stringify(assignment)}, expected roleId ${seeded.id}`,
      );
    }
    assert(roles.length >= SEEDED_ROLE_NAMES.length, 'roles collection too small');
  });

  // 2. A custom role (not seeded) also resolves by name — simulate the Roles UI.
  // Manipulate the in-memory collection only (no jsonDb.insert/delete) so the
  // run never rewrites data/db.json or fires Supabase mirrors.
  const rolesCollection = jsonDb.getCollection('roles');
  const originalRoles = [...rolesCollection];
  const customRole = {
    id: 'smoke-custom-role-id',
    name: 'Regional Auditor',
    description: 'Smoke-test custom role',
    permissions: ['orders.view'],
    is_system: false,
    isSystem: false,
  };
  try {
    rolesCollection.push(customRole);
    check('custom-role', () => {
      const assignment = resolveRoleAssignment({ role: 'Regional Auditor' });
      assert(
        assignment.role === 'admin' && assignment.roleId === customRole.id,
        `custom role → got ${JSON.stringify(assignment)}, expected roleId ${customRole.id}`,
      );
    });
  } finally {
    rolesCollection.length = 0;
    rolesCollection.push(...originalRoles);
  }

  // 3. Customer strings resolve to customer (no role).
  check('customer-role', () => {
    for (const value of ['customer', 'Customer', 'CUSTOMER', undefined, null]) {
      const assignment = resolveRoleAssignment({ role: value });
      assert(
        assignment.role === 'customer' && assignment.roleId === null,
        `customer input ${JSON.stringify(value)} → got ${JSON.stringify(assignment)}`,
      );
    }
  });

  // 4. Legacy 'admin' string → admin, null roleId (Super Admin fallback is a
  // separate concern in resolveRbacForUser).
  check('legacy-admin', () => {
    const assignment = resolveRoleAssignment({ role: 'admin' });
    assert(
      assignment.role === 'admin' && assignment.roleId === null,
      `legacy admin → got ${JSON.stringify(assignment)}`,
    );
  });

  // 5. roleId path — a real role id resolves, an unknown id throws.
  check('role-id-path', () => {
    const seeded = jsonDb.findOne('roles', { name: 'Credit Officer' });
    assert(seeded, 'Credit Officer missing');
    const byId = resolveRoleAssignment({ roleId: seeded.id });
    assert(
      byId.role === 'admin' && byId.roleId === seeded.id,
      `roleId → got ${JSON.stringify(byId)}`,
    );
    let threw = false;
    try {
      resolveRoleAssignment({ roleId: 'no-such-role-id' });
    } catch (err) {
      threw = err instanceof BadRequestError;
    }
    assert(threw, 'unknown roleId did not throw BadRequestError');
  });

  // 6. Unknown role string → throws BadRequestError (never escalates).
  check('unknown-role-throws', () => {
    for (const value of ['CEO', 'unknown-role', '  ']) {
      let threw = false;
      let message = '';
      try {
        resolveRoleAssignment({ role: value });
      } catch (err) {
        threw = err instanceof BadRequestError;
        message = err instanceof Error ? err.message : String(err);
      }
      assert(threw, `unknown role "${value}" did not throw BadRequestError`);
      assert(
        !/super admin/i.test(message),
        `unknown role "${value}" escalated to Super Admin: ${message}`,
      );
    }
  });

  console.log(
    JSON.stringify(
      {
        seededRoles: SEEDED_ROLE_NAMES,
        checks: results,
        failures,
        ok: failures.length === 0,
      },
      null,
      2,
    ),
  );
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
