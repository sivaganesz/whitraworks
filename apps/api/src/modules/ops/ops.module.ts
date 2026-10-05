import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OpsTenantsController } from './ops-tenants.controller';
import { OpsPlatformController } from './ops-platform.controller';
import { OpsTenantsService } from './ops-tenants.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OpsTenantsController, OpsPlatformController],
  providers: [OpsTenantsService],
  exports: [OpsTenantsService],
})
export class OpsModule {}
