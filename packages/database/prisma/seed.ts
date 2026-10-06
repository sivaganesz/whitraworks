import { PrismaClient, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const STANDARD_PERMISSIONS = [
  {
    code: 'workspace:read',
    name: 'Read Workspace',
    category: 'workspace',
    description: 'View workspace settings and details',
  },
  {
    code: 'workspace:update',
    name: 'Update Workspace',
    category: 'workspace',
    description: 'Update workspace profile and configurations',
  },
  {
    code: 'members:read',
    name: 'Read Members',
    category: 'members',
    description: 'View workspace member list and roles',
  },
  {
    code: 'members:invite',
    name: 'Invite Members',
    category: 'members',
    description: 'Send invitations to new workspace members',
  },
  {
    code: 'members:update',
    name: 'Update Members',
    category: 'members',
    description: 'Update workspace member roles and status',
  },
  {
    code: 'members:remove',
    name: 'Remove Members',
    category: 'members',
    description: 'Revoke memberships and remove users',
  },
  {
    code: 'roles:read',
    name: 'Read Roles',
    category: 'roles',
    description: 'View roles and their permission assignments',
  },
  {
    code: 'roles:manage',
    name: 'Manage Roles',
    category: 'roles',
    description: 'Create and update custom workspace roles',
  },
  {
    code: 'capabilities:read',
    name: 'Read Capabilities',
    category: 'capabilities',
    description: 'View enabled capabilities and their configurations',
  },
  {
    code: 'audit:read',
    name: 'Read Audit Logs',
    category: 'audit',
    description: 'View workspace security and operation audit trail',
  },
];

const SYSTEM_ROLES = [
  {
    code: 'OWNER',
    name: 'Owner',
    description: 'Full workspace ownership and billing privileges',
    permissions: STANDARD_PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'ADMIN',
    name: 'Admin',
    description: 'Workspace administration and member management',
    permissions: STANDARD_PERMISSIONS.filter((p) => p.code !== 'roles:manage').map((p) => p.code),
  },
  {
    code: 'STAFF',
    name: 'Staff',
    description: 'General operational access without administration privileges',
    permissions: ['workspace:read', 'members:read', 'capabilities:read'],
  },
];

async function main() {
  console.log('🌱 Starting WhitraWorks database seeding...');

  // 1. Seed Permissions
  console.log('  -> Seeding global permissions...');
  for (const perm of STANDARD_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        category: perm.category,
        description: perm.description,
      },
      create: perm,
    });
  }
  console.log(`     ✓ Upserted ${STANDARD_PERMISSIONS.length} permissions.`);

  // 2. Seed System Role Templates (Global roles with tenantId = null)
  console.log('  -> Seeding system role templates...');
  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map((p) => [p.code, p.id]));

  for (const roleDef of SYSTEM_ROLES) {
    // Upsert role template where tenantId is null
    const existing = await prisma.role.findFirst({
      where: {
        tenantId: null,
        code: roleDef.code,
      },
    });

    const role = existing
      ? await prisma.role.update({
          where: { id: existing.id },
          data: {
            name: roleDef.name,
            description: roleDef.description,
            isSystemRole: true,
          },
        })
      : await prisma.role.create({
          data: {
            tenantId: null,
            code: roleDef.code,
            name: roleDef.name,
            description: roleDef.description,
            isSystemRole: true,
          },
        });

    // Assign permissions
    for (const permCode of roleDef.permissions) {
      const permissionId = permMap.get(permCode);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId,
          },
        });
      }
    }
  }
  console.log(`     ✓ Upserted ${SYSTEM_ROLES.length} system role templates.`);

  // 3. Seed Initial Platform Superadmin
  console.log('  -> Seeding Root Platform Superadmin...');
  const superadminEmail = process.env.INITIAL_SUPERADMIN_EMAIL || 'superadmin@whitraworks.com';
  const superadminPassword = process.env.INITIAL_SUPERADMIN_PASSWORD || ' ';
  const passwordHash = await argon2.hash(superadminPassword);

  const superadmin = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {
      passwordHash,
      isPlatformSuperadmin: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: superadminEmail,
      passwordHash,
      firstName: process.env.INITIAL_SUPERADMIN_FIRST_NAME || 'Root',
      lastName: process.env.INITIAL_SUPERADMIN_LAST_NAME || 'Superadmin',
      isPlatformSuperadmin: true,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`     ✓ Platform superadmin ready: ${superadmin.email} (ID: ${superadmin.id})`);

  // 4. Seed Demo Tenants & Workspaces
  console.log('  -> Seeding Demo Tenants & Workspaces...');
  const defaultOwnerPassword = await argon2.hash('OwnerPassword123!');
  const defaultStaffPassword = await argon2.hash('StaffPassword123!');

  const demoTenants = [
    {
      slug: 'abchotel',
      name: 'ABC Hotel & Dining',
      status: 'ACTIVE' as const,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      capabilities: ['catalog', 'orders', 'kitchen'],
      owner: {
        email: 'owner@abchotel.com',
        firstName: 'Alice',
        lastName: 'Hotelier',
      },
      staff: {
        email: 'staff@abchotel.com',
        firstName: 'Bob',
        lastName: 'Manager',
      },
    },
    {
      slug: 'metrocafe',
      name: 'Metro Café & Bakery',
      status: 'ACTIVE' as const,
      currency: 'USD',
      timezone: 'America/New_York',
      capabilities: ['catalog', 'orders'],
      owner: {
        email: 'owner@metrocafe.com',
        firstName: 'Carlos',
        lastName: 'Baker',
      },
    },
    {
      slug: 'zenithretail',
      name: 'Zenith Retail Stores',
      status: 'SUSPENDED' as const,
      currency: 'EUR',
      timezone: 'Europe/Paris',
      capabilities: ['catalog'],
      owner: {
        email: 'owner@zenithretail.com',
        firstName: 'Diana',
        lastName: 'Merchant',
      },
    },
  ];

  for (const t of demoTenants) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        status: t.status,
        currency: t.currency,
        timezone: t.timezone,
      },
      create: {
        slug: t.slug,
        name: t.name,
        status: t.status,
        currency: t.currency,
        timezone: t.timezone,
      },
    });

    // Create or find Owner user
    const ownerUser = await prisma.user.upsert({
      where: { email: t.owner.email },
      update: {
        passwordHash: defaultOwnerPassword,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: t.owner.email,
        passwordHash: defaultOwnerPassword,
        firstName: t.owner.firstName,
        lastName: t.owner.lastName,
        status: UserStatus.ACTIVE,
      },
    });

    // Tenant-specific OWNER role
    let ownerRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, code: 'OWNER' },
    });
    if (!ownerRole) {
      ownerRole = await prisma.role.create({
        data: {
          tenantId: tenant.id,
          code: 'OWNER',
          name: 'Owner',
          description: 'Full workspace ownership',
          isSystemRole: true,
          permissions: {
            create: allPermissions.map((p) => ({ permissionId: p.id })),
          },
        },
      });
    }

    // Owner membership
    await prisma.workspaceMember.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: ownerUser.id,
        },
      },
      update: {
        status: 'ACTIVE',
        roleId: ownerRole.id,
      },
      create: {
        tenantId: tenant.id,
        userId: ownerUser.id,
        roleId: ownerRole.id,
        status: 'ACTIVE',
      },
    });

    // Tenant-specific STAFF role and member if defined
    if (t.staff) {
      const staffUser = await prisma.user.upsert({
        where: { email: t.staff.email },
        update: {
          passwordHash: defaultStaffPassword,
          status: UserStatus.ACTIVE,
        },
        create: {
          email: t.staff.email,
          passwordHash: defaultStaffPassword,
          firstName: t.staff.firstName,
          lastName: t.staff.lastName,
          status: UserStatus.ACTIVE,
        },
      });

      let staffRole = await prisma.role.findFirst({
        where: { tenantId: tenant.id, code: 'STAFF' },
      });
      if (!staffRole) {
        const staffPerms = allPermissions.filter((p) =>
          ['workspace:read', 'members:read', 'capabilities:read'].includes(p.code)
        );
        staffRole = await prisma.role.create({
          data: {
            tenantId: tenant.id,
            code: 'STAFF',
            name: 'Staff',
            description: 'General staff operations',
            isSystemRole: true,
            permissions: {
              create: staffPerms.map((p) => ({ permissionId: p.id })),
            },
          },
        });
      }

      await prisma.workspaceMember.upsert({
        where: {
          tenantId_userId: {
            tenantId: tenant.id,
            userId: staffUser.id,
          },
        },
        update: {
          status: 'ACTIVE',
          roleId: staffRole.id,
        },
        create: {
          tenantId: tenant.id,
          userId: staffUser.id,
          roleId: staffRole.id,
          status: 'ACTIVE',
        },
      });
    }

    // Provision Capabilities
    for (const capCode of t.capabilities) {
      await prisma.tenantCapabilityConfig.upsert({
        where: {
          tenantId_capabilityCode: {
            tenantId: tenant.id,
            capabilityCode: capCode,
          },
        },
        update: { isEnabled: true },
        create: {
          tenantId: tenant.id,
          capabilityCode: capCode,
          isEnabled: true,
          configJson: {},
        },
      });
    }

    // Seed audit log entry for tenant creation
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorId: superadmin.id,
        action: 'tenant.provision',
        entityType: 'Tenant',
        entityId: tenant.id,
        diffJson: { slug: t.slug, capabilities: t.capabilities },
      },
    });

    console.log(`     ✓ Seeded workspace: ${t.name} (${t.slug}.localhost:3000)`);
  }

  console.log('✨ WhitraWorks database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
