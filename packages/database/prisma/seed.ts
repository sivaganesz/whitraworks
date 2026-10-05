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
  const superadminPassword = process.env.INITIAL_SUPERADMIN_PASSWORD || 'ChangeMeImmediately123!';
  const passwordHash = await argon2.hash(superadminPassword);

  const superadmin = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {
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
