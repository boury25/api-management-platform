import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { UserRepository } from '../repositories/user.repository';
import { hashValue, compareHash } from '../utils/crypto';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  AppError,
} from '../middleware/errorHandler';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export class AuthService {
  constructor(private readonly userRepo: UserRepository) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const hashedPassword = await hashValue(password);

    const user = await this.userRepo.create({
      email,
      password: hashedPassword,
      name,
    });

    const tokens = await this.generateTokenPair(user.id, user.email, user.name, user.role);

    return { user, tokens };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated');
    }

    const isPasswordValid = await compareHash(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { password: _, ...safeUser } = user;
    const tokens = await this.generateTokenPair(user.id, user.email, user.name, user.role);

    return { user: safeUser, tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    // Verify JWT signature first
    let payload: JwtPayload & { sub: string };
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload & { sub: string };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check DB record
    const tokenRecord = await this.userRepo.findRefreshToken(refreshToken);
    if (!tokenRecord || tokenRecord.isRevoked) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedError('Account deactivated');
    }

    // Rotate token (revoke old, issue new)
    await this.userRepo.revokeRefreshToken(refreshToken);

    return this.generateTokenPair(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.user.name,
      tokenRecord.user.role,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await this.userRepo.revokeRefreshToken(refreshToken);
    } catch {
      // Silently ignore if token not found
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.userRepo.revokeAllUserTokens(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User');

    const isValid = await compareHash(currentPassword, user.password);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const hashedNew = await hashValue(newPassword);
    await this.userRepo.updatePassword(userId, hashedNew);
    await this.userRepo.revokeAllUserTokens(userId);
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    name: string,
    role: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, name, role };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,
      jwtid: uuidv4(),
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      jwtid: uuidv4(),
    } as jwt.SignOptions);

    // Persist refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.userRepo.saveRefreshToken(userId, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessExpiresIn,
    };
  }
}
