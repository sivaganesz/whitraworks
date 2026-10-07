import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // In automated testing suites, skip throttling unless the test explicitly enables it
    if (process.env['NODE_ENV'] === 'test') {
      return req.headers?.['x-test-rate-limit'] !== 'true';
    }

    return false;
  }
}
