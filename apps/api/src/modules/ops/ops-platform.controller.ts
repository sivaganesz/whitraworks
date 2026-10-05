import {
  Controller,
  Get,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PlatformSuperadminGuard } from '../../common/guards/platform-superadmin.guard';
import { RequireSuperadmin } from '../../common/decorators/require-superadmin.decorator';
import { OpsTenantsService } from './ops-tenants.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@ApiTags('Ops Control Plane Platform')
@ApiBearerAuth()
@UseGuards(AuthGuard, PlatformSuperadminGuard)
@RequireSuperadmin()
@Controller('ops')
export class OpsPlatformController {
  constructor(
    @Inject(OpsTenantsService) private readonly opsTenantsService: OpsTenantsService
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform operational metrics and system health' })
  @ApiResponse({ status: 200, description: 'Aggregate platform health metrics' })
  async getOverviewMetrics() {
    return this.opsTenantsService.getOverviewMetrics();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Searchable platform-wide audit logs' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit events' })
  async listAuditLogs(@Query() query: ListAuditLogsDto) {
    return this.opsTenantsService.listAuditLogs(query);
  }
}

