import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { PlatformSuperadminGuard } from '../../common/guards/platform-superadmin.guard';
import { RequireSuperadmin } from '../../common/decorators/require-superadmin.decorator';
import { RequestWithTenant } from '../../common/middleware/tenant-resolution.middleware';
import { OpsTenantsService } from './ops-tenants.service';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { UpdateTenantCapabilitiesDto } from './dto/update-tenant-capabilities.dto';

@ApiTags('Ops Tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard, PlatformSuperadminGuard)
@RequireSuperadmin()
@Controller('ops/tenants')
export class OpsTenantsController {
  constructor(
    @Inject(OpsTenantsService) private readonly opsTenantsService: OpsTenantsService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants with active metrics (Control Plane only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of tenants' })
  async listTenants(@Query() query: ListTenantsDto) {
    return this.opsTenantsService.listTenants(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update tenant lifecycle status with mandatory audit log' })
  @ApiResponse({ status: 200, description: 'Tenant status successfully updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateTenantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @Req() req: RequestWithTenant & AuthenticatedRequest,
  ) {
    const actorId = req.user?.userId || 'unknown-actor';
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    return this.opsTenantsService.updateStatus(id, dto, actorId, ipAddress, userAgent);
  }

  @Get(':id/capabilities')
  @ApiOperation({ summary: 'Get current capability configurations for a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant capabilities with registry metadata' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenantCapabilities(@Param('id') id: string) {
    return this.opsTenantsService.getTenantCapabilities(id);
  }

  @Put(':id/capabilities')
  @ApiOperation({ summary: 'Update tenant capability enablement with dependency enforcement and audit logging' })
  @ApiResponse({ status: 200, description: 'Tenant capabilities successfully updated' })
  @ApiResponse({ status: 400, description: 'Dependency violation or unknown capability' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateTenantCapabilities(
    @Param('id') id: string,
    @Body() dto: UpdateTenantCapabilitiesDto,
    @Req() req: RequestWithTenant & AuthenticatedRequest,
  ) {
    const actorId = req.user?.userId || 'unknown-actor';
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    return this.opsTenantsService.updateTenantCapabilities(id, dto, actorId, ipAddress, userAgent);
  }
}
