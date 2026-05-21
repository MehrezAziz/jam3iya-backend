/**
 * Idempotent catalog seed (safe to re-run on production VPS):
 *   - permission catalog (incl. new platform.* perms)
 *   - system roles + role↔permission links
 *   - hidden "__platform__" org + Platform department
 *
 * Platform super-admin account:
 *   - Created ONLY when no platform_admin user exists yet.
 *   - NEVER overwrites an existing admin email or password on re-seed.
 *   - Credentials come from env (never commit real passwords to git):
 *       SEED_PLATFORM_ADMIN_EMAIL
 *       SEED_PLATFORM_ADMIN_PASSWORD  (min 12 chars)
 *       SEED_PLATFORM_ADMIN_NAME      (optional)
 *   - Local dev fallback (non-production only): root@platform.local / RootPlatformPass123!
 *
 * Production: leave SEED_* unset after first bootstrap; re-run seed anytime for new permissions.
 *
 * Run: npm run db:seed  |  deploy/run-seed.sh (VPS)
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PLATFORM_ORG_SLUG = '__platform__';
const PLATFORM_ADMIN_ROLE = 'platform_admin';

interface PermDef {
  code: string;
  resource: string;
  action: string;
  description: string;
  dangerous?: boolean;
}

const PERMISSIONS: PermDef[] = [
  // platform-level (only the platform super admin holds these)
  { code: 'platform.org.create', resource: 'platform', action: 'org.create', description: 'Create a new organization account', dangerous: true },
  { code: 'platform.org.read_all', resource: 'platform', action: 'org.read_all', description: 'List/read all organizations on the platform' },
  { code: 'platform.org.update', resource: 'platform', action: 'org.update', description: 'Update any organization (legal name, settings, public flag)', dangerous: true },
  { code: 'platform.org.suspend', resource: 'platform', action: 'org.suspend', description: 'Suspend or reactivate an organization', dangerous: true },
  { code: 'platform.org.delete', resource: 'platform', action: 'org.delete', description: 'Permanently delete an organization', dangerous: true },
  { code: 'platform.user.impersonate', resource: 'platform', action: 'user.impersonate', description: 'Impersonate a user (audited)', dangerous: true },
  {
    code: 'platform.org.admin.reset_password',
    resource: 'platform',
    action: 'org.admin.reset_password',
    description: 'Reset an organization admin password (forgotten password recovery)',
    dangerous: true,
  },
  {
    code: 'platform.org.admin.update',
    resource: 'platform',
    action: 'org.admin.update',
    description: 'Update organization admin profile and login credentials',
    dangerous: true,
  },

  // tenant
  { code: 'org.read', resource: 'org', action: 'read', description: 'Read organization profile' },
  { code: 'org.update', resource: 'org', action: 'update', description: 'Update organization profile', dangerous: true },
  { code: 'org.manage_settings', resource: 'org', action: 'manage_settings', description: 'Manage org settings', dangerous: true },
  { code: 'department.create', resource: 'department', action: 'create', description: 'Create a department' },
  { code: 'department.read', resource: 'department', action: 'read', description: 'List departments' },
  { code: 'department.update', resource: 'department', action: 'update', description: 'Update a department' },
  { code: 'department.delete', resource: 'department', action: 'delete', description: 'Delete a department', dangerous: true },
  // iam
  { code: 'role.read', resource: 'role', action: 'read', description: 'List roles' },
  { code: 'role.create', resource: 'role', action: 'create', description: 'Create a custom role' },
  { code: 'role.update', resource: 'role', action: 'update', description: 'Update a role' },
  { code: 'role.delete', resource: 'role', action: 'delete', description: 'Delete a role', dangerous: true },
  { code: 'user.invite', resource: 'user', action: 'invite', description: 'Invite a staff user', dangerous: true },
  { code: 'user.read', resource: 'user', action: 'read', description: 'List users' },
  { code: 'user.update', resource: 'user', action: 'update', description: 'Update a user' },
  { code: 'user.suspend', resource: 'user', action: 'suspend', description: 'Suspend a user', dangerous: true },
  { code: 'user.delete', resource: 'user', action: 'delete', description: 'Delete a user', dangerous: true },
  { code: 'user.assign_role', resource: 'user', action: 'assign_role', description: 'Assign a role to a user', dangerous: true },
  { code: 'user.reset_password', resource: 'user', action: 'reset_password', description: 'Trigger password reset for a user' },
  { code: 'user.reset_2fa', resource: 'user', action: 'reset_2fa', description: 'Reset 2FA for a user', dangerous: true },

  // beneficiary
  { code: 'beneficiary.create', resource: 'beneficiary', action: 'create', description: 'Create a beneficiary file' },
  { code: 'beneficiary.read.summary', resource: 'beneficiary', action: 'read.summary', description: 'Read non-PII summary' },
  { code: 'beneficiary.read.full', resource: 'beneficiary', action: 'read.full', description: 'Read full PP file (PII)', dangerous: true },
  { code: 'beneficiary.update', resource: 'beneficiary', action: 'update', description: 'Update a beneficiary file' },
  { code: 'beneficiary.archive', resource: 'beneficiary', action: 'archive', description: 'Archive a PP file' },
  { code: 'beneficiary.export', resource: 'beneficiary', action: 'export', description: 'Export beneficiary data', dangerous: true },
  { code: 'beneficiary.verify', resource: 'beneficiary', action: 'verify', description: 'Verify a case' },
  { code: 'beneficiary.approve', resource: 'beneficiary', action: 'approve', description: 'Approve a case' },
  { code: 'beneficiary.reject', resource: 'beneficiary', action: 'reject', description: 'Reject a case' },

  // donations / donors
  { code: 'donor.read', resource: 'donor', action: 'read', description: 'List donors' },
  { code: 'donor.update', resource: 'donor', action: 'update', description: 'Update a donor profile' },
  { code: 'donation.create.cash', resource: 'donation', action: 'create.cash', description: 'Record a cash donation' },
  { code: 'donation.create.card', resource: 'donation', action: 'create.card', description: 'Record a card donation' },
  { code: 'donation.create.gateway', resource: 'donation', action: 'create.gateway', description: 'Initiate gateway donation' },
  { code: 'donation.create.in_kind', resource: 'donation', action: 'create.in_kind', description: 'Record an in-kind donation' },
  { code: 'donation.update', resource: 'donation', action: 'update', description: 'Update donation metadata' },
  { code: 'donation.cancel', resource: 'donation', action: 'cancel', description: 'Cancel a donation', dangerous: true },
  { code: 'pledge.create', resource: 'pledge', action: 'create', description: 'Create a pledge' },
  { code: 'pledge.read', resource: 'pledge', action: 'read', description: 'Read pledges' },
  { code: 'pledge.update', resource: 'pledge', action: 'update', description: 'Update a pledge' },
  { code: 'pledge.send_reminder', resource: 'pledge', action: 'send_reminder', description: 'Send a pledge reminder' },
  { code: 'payment.read', resource: 'payment', action: 'read', description: 'Read payments' },
  { code: 'payment.refund', resource: 'payment', action: 'refund', description: 'Refund a payment', dangerous: true },

  // distribution / inventory
  { code: 'distribution.plan', resource: 'distribution', action: 'plan', description: 'Plan a distribution' },
  { code: 'distribution.deliver', resource: 'distribution', action: 'deliver', description: 'Mark distribution as delivered' },
  { code: 'distribution.cancel', resource: 'distribution', action: 'cancel', description: 'Cancel a distribution' },
  { code: 'distribution.read', resource: 'distribution', action: 'read', description: 'List distributions' },
  { code: 'inventory.read', resource: 'inventory', action: 'read', description: 'Read inventory and stock' },
  { code: 'inventory.item.manage', resource: 'inventory', action: 'item.manage', description: 'Manage inventory items' },
  { code: 'inventory.lot.manage', resource: 'inventory', action: 'lot.manage', description: 'Manage stock lots' },
  { code: 'inventory.adjust', resource: 'inventory', action: 'adjust', description: 'Manual stock adjustment', dangerous: true },

  // campaigns / occasions
  { code: 'campaign.read', resource: 'campaign', action: 'read', description: 'Read campaigns' },
  { code: 'campaign.manage', resource: 'campaign', action: 'manage', description: 'Manage campaigns' },
  { code: 'occasion.read', resource: 'occasion', action: 'read', description: 'Read occasions' },
  { code: 'occasion.manage', resource: 'occasion', action: 'manage', description: 'Manage occasions' },

  // expenses / bills / ledger
  { code: 'expense.create', resource: 'expense', action: 'create', description: 'Create an expense' },
  { code: 'expense.read', resource: 'expense', action: 'read', description: 'Read expenses' },
  { code: 'expense.update', resource: 'expense', action: 'update', description: 'Update an expense' },
  { code: 'expense.delete', resource: 'expense', action: 'delete', description: 'Delete an expense', dangerous: true },
  { code: 'bill.template.manage', resource: 'bill', action: 'template.manage', description: 'Manage bill templates' },
  { code: 'bill.issue', resource: 'bill', action: 'issue', description: 'Issue a bill / receipt' },
  { code: 'bill.read', resource: 'bill', action: 'read', description: 'Read bills' },
  { code: 'bill.cancel', resource: 'bill', action: 'cancel', description: 'Cancel a bill' },
  { code: 'ledger.read', resource: 'ledger', action: 'read', description: 'Read ledger entries' },
  { code: 'ledger.export', resource: 'ledger', action: 'export', description: 'Export ledger', dangerous: true },

  // reporting
  { code: 'report.read.financial', resource: 'report', action: 'read.financial', description: 'Read financial reports' },
  { code: 'report.read.beneficiary_anonymized', resource: 'report', action: 'read.beneficiary_anonymized', description: 'Read anonymized beneficiary reports' },
  { code: 'report.read.beneficiary_full', resource: 'report', action: 'read.beneficiary_full', description: 'Read full beneficiary reports (PII)', dangerous: true },
  { code: 'report.export', resource: 'report', action: 'export', description: 'Export reports', dangerous: true },

  // audit
  { code: 'audit.read.own', resource: 'audit', action: 'read.own', description: 'See my own audit trail' },
  { code: 'audit.read.department', resource: 'audit', action: 'read.department', description: 'See department audit trail' },
  { code: 'audit.read.organization', resource: 'audit', action: 'read.organization', description: 'See org-wide audit trail' },

  // security
  { code: 'security.session.revoke_others', resource: 'security', action: 'session.revoke_others', description: 'Revoke other users\' sessions' },
  { code: 'security.2fa.enforce', resource: 'security', action: '2fa.enforce', description: 'Enforce 2FA' },

  // volunteer
  { code: 'shift.manage', resource: 'shift', action: 'manage', description: 'Manage shifts' },
  { code: 'shift.read', resource: 'shift', action: 'read', description: 'Read shifts' },
  { code: 'shift.checkin', resource: 'shift', action: 'checkin', description: 'Check in/out of a shift' },

  // donor self-service
  { code: 'me.donation.read', resource: 'me', action: 'donation.read', description: 'Read my own donations' },
  { code: 'me.donation.create', resource: 'me', action: 'donation.create', description: 'Make a donation' },
  { code: 'me.receipt.download', resource: 'me', action: 'receipt.download', description: 'Download my own receipts' },
  { code: 'me.profile.update', resource: 'me', action: 'profile.update', description: 'Update my donor profile' },
  { code: 'me.recurring.manage', resource: 'me', action: 'recurring.manage', description: 'Manage my recurring donation' },
  { code: 'me.pp_visibility.read', resource: 'me', action: 'pp_visibility.read', description: 'See PPs my money helped' },
];

interface RoleDef {
  name: string;
  description: string;
  privilegeLevel: number;
  isSystem: boolean;
  permissions: string[];
}

const ROLES: RoleDef[] = [
  {
    name: PLATFORM_ADMIN_ROLE,
    description: 'Platform super administrator (only role that can create organizations)',
    privilegeLevel: 200,
    isSystem: true,
    permissions: PERMISSIONS.filter((p) => p.code.startsWith('platform.') || p.code === 'audit.read.own').map((p) => p.code),
  },
  {
    name: 'org_admin',
    description: 'Organization administrator',
    privilegeLevel: 100,
    isSystem: true,
    permissions: PERMISSIONS
      .filter((p) => !p.code.startsWith('me.') && !p.code.startsWith('platform.'))
      .map((p) => p.code),
  },
  {
    name: 'department_admin',
    description: 'Department administrator',
    privilegeLevel: 80,
    isSystem: true,
    permissions: [
      'org.read', 'department.read', 'department.update',
      'role.read', 'user.read', 'user.invite', 'user.assign_role',
      'beneficiary.create', 'beneficiary.read.summary', 'beneficiary.read.full',
      'beneficiary.update', 'beneficiary.archive', 'beneficiary.verify', 'beneficiary.approve',
      'donor.read', 'donation.create.cash', 'donation.create.card', 'donation.create.gateway',
      'donation.create.in_kind', 'donation.update', 'donation.cancel',
      'pledge.create', 'pledge.read', 'pledge.update', 'pledge.send_reminder',
      'distribution.plan', 'distribution.deliver', 'distribution.cancel', 'distribution.read',
      'inventory.read', 'inventory.item.manage', 'inventory.lot.manage',
      'campaign.read', 'campaign.manage', 'occasion.read', 'occasion.manage',
      'expense.create', 'expense.read', 'expense.update',
      'bill.issue', 'bill.read', 'bill.cancel',
      'report.read.financial', 'report.read.beneficiary_anonymized', 'report.read.beneficiary_full',
      'audit.read.own', 'audit.read.department',
      'shift.manage', 'shift.read',
    ],
  },
  {
    name: 'employee',
    description: 'Paid staff member',
    privilegeLevel: 50,
    isSystem: true,
    permissions: [
      'org.read', 'department.read', 'user.read',
      'beneficiary.create', 'beneficiary.read.summary', 'beneficiary.read.full',
      'beneficiary.update', 'beneficiary.verify',
      'donor.read', 'donation.create.cash', 'donation.create.card', 'donation.create.gateway',
      'donation.create.in_kind',
      'pledge.read', 'pledge.send_reminder',
      'distribution.plan', 'distribution.deliver', 'distribution.read',
      'inventory.read', 'inventory.item.manage', 'inventory.lot.manage',
      'campaign.read', 'occasion.read',
      'expense.create', 'expense.read',
      'bill.issue', 'bill.read',
      'report.read.financial', 'report.read.beneficiary_anonymized',
      'audit.read.own',
      'shift.read', 'shift.checkin',
    ],
  },
  {
    name: 'benefactor',
    description: 'Volunteer (no salary)',
    privilegeLevel: 40,
    isSystem: true,
    permissions: [
      'org.read', 'department.read',
      'beneficiary.read.summary',
      'donor.read', 'donation.create.cash', 'donation.create.in_kind',
      'pledge.read', 'pledge.send_reminder',
      'distribution.deliver', 'distribution.read',
      'inventory.read', 'campaign.read', 'occasion.read',
      'audit.read.own', 'shift.read', 'shift.checkin',
    ],
  },
  {
    name: 'temporary',
    description: 'Temporary helper, time-limited',
    privilegeLevel: 20,
    isSystem: true,
    permissions: ['org.read', 'beneficiary.read.summary', 'audit.read.own', 'shift.read', 'shift.checkin'],
  },
  {
    name: 'viewer',
    description: 'Read-only auditor',
    privilegeLevel: 30,
    isSystem: true,
    permissions: [
      'org.read', 'department.read', 'user.read', 'role.read',
      'beneficiary.read.summary',
      'donor.read', 'pledge.read', 'distribution.read',
      'inventory.read', 'campaign.read', 'occasion.read',
      'expense.read', 'bill.read', 'ledger.read',
      'report.read.financial', 'report.read.beneficiary_anonymized',
      'audit.read.own', 'audit.read.department',
    ],
  },
  {
    name: 'donor',
    description: 'Donor self-service',
    privilegeLevel: 10,
    isSystem: true,
    permissions: [
      'me.donation.read', 'me.donation.create',
      'me.receipt.download', 'me.profile.update',
      'me.recurring.manage', 'me.pp_visibility.read',
      'audit.read.own',
    ],
  },
];

async function main(): Promise<void> {
  console.log('Seeding permissions...');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        resource: p.resource,
        action: p.action,
        description: p.description,
        isDangerous: p.dangerous ?? false,
      },
      update: { description: p.description, isDangerous: p.dangerous ?? false },
    });
  }
  console.log(`  ${PERMISSIONS.length} permissions seeded.`);

  console.log('Seeding system roles...');
  for (const r of ROLES) {
    const existing = await prisma.role.findFirst({
      where: { name: r.name, organizationId: null, isSystem: true },
    });
    const role = existing
      ? await prisma.role.update({
          where: { id: existing.id },
          data: {
            description: r.description,
            privilegeLevel: r.privilegeLevel,
            isSystem: r.isSystem,
          },
        })
      : await prisma.role.create({
          data: {
            name: r.name,
            description: r.description,
            privilegeLevel: r.privilegeLevel,
            isSystem: r.isSystem,
          },
        });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const perms = await prisma.permission.findMany({ where: { code: { in: r.permissions } } });
    if (perms.length) {
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
    console.log(`  Role ${r.name}: ${perms.length} permissions`);
  }

  console.log('Seeding platform org & admin bootstrap...');
  const platformOrg = await prisma.organization.upsert({
    where: { slug: PLATFORM_ORG_SLUG },
    create: {
      legalName: 'Jam3iya Platform',
      slug: PLATFORM_ORG_SLUG,
      country: 'TN',
      defaultCurrency: 'TND',
      defaultLanguage: 'en',
      timezone: 'Africa/Tunis',
      publicPageEnabled: false,
    },
    update: { publicPageEnabled: false },
  });
  const platformDept = await prisma.department.upsert({
    where: { organizationId_name: { organizationId: platformOrg.id, name: 'Platform' } },
    create: {
      organizationId: platformOrg.id,
      name: 'Platform',
      description: 'Platform-level administration',
      isMain: true,
    },
    update: {},
  });
  const platformRole = await prisma.role.findFirst({ where: { name: PLATFORM_ADMIN_ROLE, isSystem: true } });
  if (!platformRole) throw new Error('platform_admin role missing after seeding roles');

  await ensurePlatformAdmin(platformOrg.id, platformDept.id, platformRole.id);

  console.log('Done.');
  console.log(`Platform login slug: ${PLATFORM_ORG_SLUG}`);
  console.log('Create organizations at /platform/organizations/new after login.');
}

/** Existing production admin — never touch password or email. */
async function findExistingPlatformAdmin(organizationId: string) {
  return prisma.user.findFirst({
    where: {
      organizationId,
      deletedAt: null,
      kind: 'staff',
      departmentRoles: {
        some: {
          deletedAt: null,
          role: { name: PLATFORM_ADMIN_ROLE, isSystem: true, deletedAt: null },
        },
      },
    },
    select: { id: true, email: true },
  });
}

function resolveBootstrapCredentials(): { email: string; password: string; fullName: string } | null {
  const envEmail = process.env.SEED_PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.SEED_PLATFORM_ADMIN_PASSWORD;
  const envName = process.env.SEED_PLATFORM_ADMIN_NAME?.trim();

  if (envEmail && envPassword) {
    if (envPassword.length < 12) {
      throw new Error('SEED_PLATFORM_ADMIN_PASSWORD must be at least 12 characters');
    }
    return { email: envEmail, password: envPassword, fullName: envName || 'Platform Root' };
  }

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) return null;

  // Local dev only — not used when NODE_ENV=production
  return {
    email: 'root@platform.local',
    password: 'RootPlatformPass123!',
    fullName: 'Platform Root',
  };
}

async function ensurePlatformAdmin(
  organizationId: string,
  departmentId: string,
  roleId: string,
): Promise<void> {
  const existing = await findExistingPlatformAdmin(organizationId);
  if (existing) {
    console.log(`  Platform admin already present (${existing.email}) — password and email left unchanged.`);
    await prisma.userDepartmentRole.upsert({
      where: {
        userId_departmentId_roleId: {
          userId: existing.id,
          departmentId,
          roleId,
        },
      },
      create: { userId: existing.id, departmentId, roleId },
      update: { deletedAt: null, validTo: null },
    });
    return;
  }

  const creds = resolveBootstrapCredentials();
  if (!creds) {
    console.warn(
      '  No platform admin in database. Set SEED_PLATFORM_ADMIN_EMAIL and SEED_PLATFORM_ADMIN_PASSWORD in deploy/.env, run seed once, then remove those lines.',
    );
    return;
  }

  const passwordHash = await argon2.hash(creds.password, { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { organizationId_email: { organizationId, email: creds.email } },
    create: {
      organizationId,
      email: creds.email,
      fullName: creds.fullName,
      passwordHash,
      status: 'active',
      locale: 'en',
      emailVerifiedAt: new Date(),
      lastPasswordChangeAt: new Date(),
    },
    // User row may exist without platform_admin role — never reset password on update
    update: {
      fullName: creds.fullName,
      status: 'active',
      deletedAt: null,
    },
  });

  await prisma.userDepartmentRole.upsert({
    where: {
      userId_departmentId_roleId: {
        userId: user.id,
        departmentId,
        roleId,
      },
    },
    create: { userId: user.id, departmentId, roleId },
    update: { deletedAt: null, validTo: null },
  });

  console.log(`  Created platform admin: ${creds.email}`);
  const isProd = process.env.NODE_ENV === 'production';
  const fromEnv = !!process.env.SEED_PLATFORM_ADMIN_PASSWORD;
  if (!isProd && !fromEnv) {
    console.log(`  Dev password (local only): ${creds.password}`);
  } else {
    console.log('  Password was taken from SEED_PLATFORM_ADMIN_PASSWORD (not printed).');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
