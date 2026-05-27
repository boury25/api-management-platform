import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { respond } from '../utils/apiResponse';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden: insufficient permissions') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ') || 'field';
      respond.conflict(res, `A record with this ${field} already exists`);
      return;
    }
    if (err.code === 'P2025') {
      respond.notFound(res, 'Record');
      return;
    }
    logger.error('Prisma error:', { code: err.code, meta: err.meta });
    respond.error(res, 'Database error', 500);
    return;
  }

  // Prisma validation error
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma validation error:', err.message);
    respond.badRequest(res, 'Invalid data provided');
    return;
  }

  // Our custom operational errors
  if (err instanceof AppError && err.isOperational) {
    respond.error(res, err.message, err.statusCode);
    return;
  }

  // JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    respond.badRequest(res, 'Invalid JSON in request body');
    return;
  }

  // Unknown / programming errors
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    requestId: req.requestId,
  });

  respond.error(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500,
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  respond.notFound(res, `Route ${req.method} ${req.path}`);
}
