import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { prisma } from '../config/database';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Verify JWT access token and attach user to request
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or deactivated');
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-based access control middleware factory
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}`,
        ),
      );
    }

    next();
  };
}

/**
 * Optional authentication — attaches user if token present, but doesn't fail
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }

    next();
  } catch {
    // Silent fail for optional auth
    next();
  }
}

/**
 * Ensure the authenticated user owns the project OR is an admin
 */
export async function requireProjectAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId } = req.params;
    if (!projectId) return next();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, baseUrl: true, ownerId: true },
    });

    if (!project) {
      throw new ForbiddenError('Project not found');
    }

    const isOwner = project.ownerId === req.user?.id;
    const isAdmin = req.user?.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You do not have access to this project');
    }

    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
}
