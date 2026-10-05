import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@whitraworks/types';
import { Request } from 'express';
import { randomUUID } from 'node:crypto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || `req_${randomUUID().slice(0, 16)}`;
    const timestamp = new Date().toISOString();

    return next.handle().pipe(
      map((data) => {
        // If response is already an envelope, preserve it
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return {
            ...data,
            meta: {
              timestamp,
              requestId,
              ...data.meta,
            },
          };
        }

        return {
          success: true,
          data,
          meta: {
            timestamp,
            requestId,
          },
        };
      })
    );
  }
}
