import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      statusCode: status,
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      body = typeof res === 'string' ? { statusCode: status, message: res } : { statusCode: status, ...(res as object) };
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        body = { statusCode: status, message: 'Resource already exists', code: exception.code };
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        body = { statusCode: status, message: 'Resource not found', code: exception.code };
      } else {
        status = HttpStatus.BAD_REQUEST;
        body = { statusCode: status, message: 'Database error', code: exception.code };
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
      // Avoid leaking internal messages in production.
      body = {
        statusCode: status,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : exception.message,
      };
    }

    body.path = request.url;
    body.timestamp = new Date().toISOString();
    response.status(status).json(body);
  }
}
