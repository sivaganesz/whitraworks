import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { MembersService } from './members.service';
import { SessionService, SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME } from '../auth/session.service';
import { AuthGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { TenantRbacGuard } from '../../common/guards/tenant-rbac.guard';
import { CapabilityGuard } from '../../common/guards/capability.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../common/decorators/require-capability.decorator';
import { ListMembersDto } from './dto/list-members.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UpdateWorkspaceProfileDto } from './dto/update-workspace-profile.dto';
import { RequestWithTenant } from '../../common/middleware/tenant-resolution.middleware';
import { SessionPayload } from '../auth/session.service';

@ApiTags('Workspace Members & Capabilities')
@Controller('workspace')
export class MembersController {
  constructor(
    @Inject(MembersService) private readonly membersService: MembersService,
    @Inject(SessionService) private readonly sessionService: SessionService
  ) {}

  @Get('profile')
  @UseGuards(AuthGuard, TenantRbacGuard)
  @RequirePermissions('workspace:read')
  @ApiOperation({ summary: 'Get current workspace profile (Tenant scoped)' })
  @SwaggerResponse({ status: 200, description: 'Workspace profile retrieved successfully' })
  async getProfile(@Req() req: RequestWithTenant) {
    if (!req.tenant?.tenantId) {
      throw new BadRequestException('Operation requires an active workspace domain context.');
    }
    return this.membersService.getWorkspaceProfile(req.tenant.tenantId);
  }

  @Patch('profile')
  @UseGuards(AuthGuard, TenantRbacGuard)
  @RequirePermissions('workspace:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update workspace profile (Business name, currency, timezone, metadata)' })
  @SwaggerResponse({ status: 200, description: 'Workspace profile updated successfully' })
  async updateProfile(
    @Req() req: RequestWithTenant & AuthenticatedRequest,
    @CurrentUser() currentUser: SessionPayload,
    @Body() dto: UpdateWorkspaceProfileDto
  ) {
    if (!req.tenant?.tenantId) {
      throw new BadRequestException('Operation requires an active workspace domain context.');
    }
    return this.membersService.updateWorkspaceProfile(
      req.tenant.tenantId,
      currentUser.userId,
      dto
    );
  }

  @Get('members')
  @UseGuards(AuthGuard, TenantRbacGuard)
  @RequirePermissions('members:read')
  @ApiOperation({ summary: 'List workspace members with roles (Tenant scoped)' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of workspace members' })
  async listMembers(
    @Req() req: RequestWithTenant,
    @Query() query: ListMembersDto
  ) {
    if (!req.tenant?.tenantId) {
      throw new BadRequestException('Endpoint must be accessed from a valid workspace domain.');
    }
    return this.membersService.listMembers(req.tenant.tenantId, query);
  }

  @Post('members/invite')
  @UseGuards(AuthGuard, TenantRbacGuard)
  @RequirePermissions('members:invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a new team member to this workspace' })
  @SwaggerResponse({ status: 201, description: 'Invitation created and token issued' })
  async inviteMember(
    @Req() req: RequestWithTenant & AuthenticatedRequest,
    @CurrentUser() currentUser: SessionPayload,
    @Body() dto: InviteMemberDto
  ) {
    if (!req.tenant?.tenantId) {
      throw new BadRequestException('Inviting members requires an active workspace domain context.');
    }
    return this.membersService.inviteMember(
      req.tenant.tenantId,
      currentUser.userId,
      dto
    );
  }

  @Delete('members/:memberId')
  @UseGuards(AuthGuard, TenantRbacGuard)
  @RequirePermissions('members:remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a workspace member (Owners cannot be removed)' })
  @SwaggerResponse({ status: 200, description: 'Member deactivated' })
  async removeMember(
    @Req() req: RequestWithTenant,
    @CurrentUser() currentUser: SessionPayload,
    @Param('memberId') memberId: string
  ) {
    if (!req.tenant?.tenantId) {
      throw new BadRequestException('Operation requires active workspace domain context.');
    }
    return this.membersService.removeMember(
      req.tenant.tenantId,
      memberId,
      currentUser.userId
    );
  }

  @Get('capabilities')
  @UseGuards(AuthGuard, TenantRbacGuard)
  @RequirePermissions('capabilities:read')
  @ApiOperation({ summary: 'List enabled capabilities for this workspace' })
  @SwaggerResponse({ status: 200, description: 'Tenant capabilities returned' })
  async getCapabilities(@Req() req: RequestWithTenant) {
    if (!req.tenant?.tenantId) {
      throw new BadRequestException('Operation requires active workspace domain context.');
    }
    return this.membersService.getCapabilities(req.tenant.tenantId);
  }

  @Get('test-kitchen')
  @UseGuards(AuthGuard, TenantRbacGuard, CapabilityGuard)
  @RequireCapability('kitchen')
  @ApiOperation({ summary: 'Capability gated endpoint (requires kitchen)' })
  @SwaggerResponse({ status: 200, description: 'Kitchen capability authorized' })
  async testKitchen() {
    return { status: 'kitchen_active' };
  }

  @Get('invitations')
  @UseGuards(AuthGuard, TenantRbacGuard)
  @RequirePermissions('members:read')
  @ApiOperation({ summary: 'List pending invitations for this workspace (Tenant scoped)' })
  @SwaggerResponse({ status: 200, description: 'List of pending invitations' })
  async listInvitations(@Req() req: RequestWithTenant) {
    if (!req.tenant?.tenantId) {
      throw new BadRequestException('Operation requires active workspace domain context.');
    }
    return this.membersService.listInvitations(req.tenant.tenantId);
  }

  @Delete('invitations/:invitationId')
  @UseGuards(AuthGuard, TenantRbacGuard)
  @RequirePermissions('members:invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a pending workspace invitation' })
  @SwaggerResponse({ status: 200, description: 'Invitation revoked' })
  async revokeInvitation(
    @Req() req: RequestWithTenant,
    @CurrentUser() currentUser: SessionPayload,
    @Param('invitationId') invitationId: string
  ) {
    if (!req.tenant?.tenantId) {
      throw new BadRequestException('Operation requires active workspace domain context.');
    }
    return this.membersService.revokeInvitation(
      req.tenant.tenantId,
      invitationId,
      currentUser.userId
    );
  }

  @Get('invitations/:token')
  @ApiOperation({ summary: 'Inspect public invitation details by token' })
  @SwaggerResponse({ status: 200, description: 'Invitation details retrieved' })
  async getInvitation(@Param('token') token: string) {
    return this.membersService.getInvitationDetails(token);
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept invitation to join a workspace (Scenario A invite-only model)' })
  @SwaggerResponse({ status: 200, description: 'Invitation accepted and session minted' })
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Req() req: RequestWithTenant,
    @Res({ passthrough: true }) res: Response
  ) {
    const token =
      req.cookies?.[SESSION_COOKIE_NAME] ||
      req.cookies?.[LEGACY_SESSION_COOKIE_NAME] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    let sessionUser: SessionPayload | undefined;
    if (token) {
      try {
        sessionUser = this.sessionService.verifySessionToken(token);
      } catch {
        // Not authenticated, proceed as unauthenticated caller
      }
    }

    const result = await this.membersService.acceptInvitation(dto, sessionUser);

    // Set Host-Only session cookie (Golden Rule 5)
    this.sessionService.setSessionCookie(res, result.token);

    return {
      user: result.user,
      activeWorkspace: result.activeWorkspace,
    };
  }
}

