import { SetMetadata } from '@nestjs/common';

export const SUPERADMIN_KEY = 'superadmin';
export const RequireSuperadmin = () => SetMetadata(SUPERADMIN_KEY, true);

