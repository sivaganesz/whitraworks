import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { TenantRbacGuard } from '../../common/guards/tenant-rbac.guard';
import { CapabilityGuard } from '../../common/guards/capability.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MembersController],
  providers: [MembersService, TenantRbacGuard, CapabilityGuard],
  exports: [MembersService, TenantRbacGuard, CapabilityGuard],
})
export class WorkspaceModule {}

