import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionPayload } from '../../modules/auth/session.service';
import { AuthenticatedRequest } from '../guards/auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  }
);

