import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse, API_ERROR_CODES } from '@whitraworks/types';
import { randomUUID } from 'node:crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || `req_${randomUUID().slice(0, 16)}`;
    const timestamp = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = API_ERROR_CODES.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal server error occurred.';
    let details: Record<string, unknown> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = this.mapStatusToErrorCode(status);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const respObj = exceptionResponse as Record<string, unknown>;
        errorCode = (respObj['code'] as string) || this.mapStatusToErrorCode(status);
        message = (respObj['message'] as string) || exception.message;

        if (Array.isArray(respObj['message'])) {
          // Class-validator returns array of strings
          errorCode = API_ERROR_CODES.VALIDATION_FAILED;
          message = 'Validation failed for the submitted payload.';
          details = { validationErrors: respObj['message'] };
        } else if (respObj['details'] && typeof respObj['details'] === 'object') {
          details = respObj['details'] as Record<string, unknown>;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = process.env['NODE_ENV'] === 'development' ? exception.message : 'Internal server error';
    } else {
      this.logger.error('Unknown exception caught', String(exception));
    }

    const errorPayload: ApiResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details ? { details } : {}),
      },
      meta: {
        timestamp,
        requestId,
      },
    };

    response.status(status).json(errorPayload);
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return API_ERROR_CODES.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return API_ERROR_CODES.AUTH_UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return API_ERROR_CODES.AUTH_FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return API_ERROR_CODES.RESOURCE_NOT_FOUND;
      case HttpStatus.TOO_MANY_REQUESTS:
        return API_ERROR_CODES.RATE_LIMIT_EXCEEDED;
      default:
        return API_ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }
}
