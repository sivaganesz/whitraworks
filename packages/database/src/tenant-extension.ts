import { Prisma } from '@prisma/client';
import { getTenantContext } from './tenant-context';

export const TENANT_SCOPED_MODELS = [
  'WorkspaceMember',
  'Role',
  'Invitation',
  'TenantCapabilityConfig',
  'AuditLog',
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

export function isTenantScopedModel(model?: string): model is TenantScopedModel {
  if (!model) return false;
  return (TENANT_SCOPED_MODELS as readonly string[]).includes(model);
}

export function createTenantExtension() {
  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantContext = getTenantContext();
          const tenantId = tenantContext?.tenantId;

          if (tenantId && isTenantScopedModel(model)) {
            const queryArgs = ((args as Record<string, unknown>) ?? {}) as Record<string, any>;

            // Read / Filter operations
            if (['findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              queryArgs.where = {
                ...(queryArgs.where as Record<string, any> | undefined),
                tenantId,
              };
            }

            // Mutation operations: update & delete batch
            if (['updateMany', 'deleteMany'].includes(operation)) {
              queryArgs.where = {
                ...(queryArgs.where as Record<string, any> | undefined),
                tenantId,
              };
            }

            // Create operations
            if (['create'].includes(operation)) {
              if (queryArgs.data) {
                queryArgs.data = {
                  ...(queryArgs.data as Record<string, any>),
                  tenantId,
                };
              }
            }

            if (['createMany'].includes(operation)) {
              if (Array.isArray(queryArgs.data)) {
                queryArgs.data = queryArgs.data.map((item: Record<string, any>) => ({
                  ...item,
                  tenantId,
                }));
              } else if (queryArgs.data) {
                queryArgs.data = {
                  ...(queryArgs.data as Record<string, any>),
                  tenantId,
                };
              }
            }

            return query(queryArgs as any);
          }

          return query(args);
        },
      },
    },
  });
}
