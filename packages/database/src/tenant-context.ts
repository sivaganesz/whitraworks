import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantId?: string;
  userId?: string;
  isPlatformSuperadmin?: boolean;
}

const asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return asyncLocalStorage.getStore();
}

export function runWithTenantContext<R>(context: TenantContext, callback: () => R): R {
  return asyncLocalStorage.run(context, callback);
}

export { asyncLocalStorage as tenantContextStorage };
