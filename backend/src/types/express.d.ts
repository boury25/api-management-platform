import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
      };
      project?: {
        id: string;
        name: string;
        baseUrl: string;
        ownerId: string;
      };
      apiKeyId?: string;
      requestId?: string;
    }
  }
}

export {};
