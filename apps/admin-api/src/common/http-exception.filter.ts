import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { createTraceId } from '@enterprise/shared-utils';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(exception);
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message)
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code: status === 403 ? 'AUTH_FORBIDDEN' : status === 401 ? 'AUTH_UNAUTHORIZED' : 'INTERNAL_ERROR',
        message,
      },
      traceId: createTraceId(),
    });
  }
}
