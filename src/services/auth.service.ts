// Service layer for Authentication business logic
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { TokenRepository } from '../repositories/token.repository';
import {
  JwtPayload,
  LoginDto,
  LoginResponse,
  RefreshDto,
  RefreshResponse,
  LogoutDto,
} from '../models/auth.model';
import {
  UnauthorizedError,
  ForbiddenError,
  AccountLockedError,
  ValidationError,
} from '../utils/errors';
import config from '../config';

const MAX_FAILED_LOGINS = 5;

/** Parse expiry string like "15m", "7d", "1h" into milliseconds */
function parseExpiry(str: string): number {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${str}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenRepository: TokenRepository
  ) {}

  async login(dto: LoginDto, userAgent: string | null): Promise<LoginResponse> {
    if (!dto.name || !dto.password) {
      throw new ValidationError('name and password are required');
    }

    // Find user by name
    const user = await this.userRepository.findByName(dto.name);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check account status
    if (user.blocked) {
      throw new AccountLockedError('Account locked due to too many failed attempts');
    }
    if (!user.active) {
      throw new UnauthorizedError('Account is deactivated');
    }
    if (user.webServiceUser) {
      throw new ForbiddenError('Web service accounts cannot login via UI');
    }

    // Verify password
    const storedHash = await this.userRepository.findPasswordHashById(user.id);
    if (!storedHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, storedHash);
    if (!isValid) {
      // Increment failed logins
      const newFailedLogins = user.failedLogins + 1;
      if (newFailedLogins >= MAX_FAILED_LOGINS) {
        await this.userRepository.updateStatus(user.id, {
          blocked: true,
          blockedSince: new Date(),
          failedLogins: newFailedLogins,
        });
      } else {
        await this.userRepository.updateStatus(user.id, {
          failedLogins: newFailedLogins,
        });
      }
      throw new UnauthorizedError('Invalid credentials');
    }

    // Successful login: reset failed logins and update last login
    await this.userRepository.updateStatus(user.id, { failedLogins: 0 });
    await this.userRepository.updateLastLogin(user.id);

    // Fetch user roles
    const roles = await this.userRepository.getUserRoles(user.id);
    const roleNames = roles.map((r) => r.name);

    // Create session
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const session = await this.sessionRepository.create({
      userId: user.id,
      csrfToken,
    });

    // Generate tokens
    const payload: JwtPayload = {
      userId: user.id,
      sessionId: session.id,
      roles: roleNames,
      moduleRoles: [], // Placeholder until #50
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken();

    // Store hashed refresh token
    const refreshExpiryMs = parseExpiry(config.jwt.refreshExpiry);
    await this.tokenRepository.create({
      userId: user.id,
      sessionId: session.id,
      tokenHash: this.hashToken(refreshToken),
      expiryDate: new Date(Date.now() + refreshExpiryMs),
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      csrfToken,
      user: {
        id: user.id,
        name: user.name,
        fullName: user.fullName,
        roles,
      },
    };
  }

  async refresh(dto: RefreshDto, userAgent: string | null): Promise<RefreshResponse> {
    if (!dto.refreshToken) {
      throw new ValidationError('refreshToken is required');
    }

    // Find token record by hash
    const tokenHash = this.hashToken(dto.refreshToken);
    const tokenRecord = await this.tokenRepository.findByTokenHash(tokenHash);
    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check expiry
    if (tokenRecord.expiryDate < new Date()) {
      await this.tokenRepository.deleteByTokenHash(tokenHash);
      throw new UnauthorizedError('Refresh token expired');
    }

    // Delete old token (rotation)
    await this.tokenRepository.deleteByTokenHash(tokenHash);

    // Verify user is still active
    const user = await this.userRepository.findById(tokenRecord.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    if (user.blocked) {
      throw new AccountLockedError('Account locked due to too many failed attempts');
    }
    if (!user.active) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Update session last active
    await this.sessionRepository.updateLastActive(tokenRecord.sessionId);

    // Fetch roles
    const roles = await this.userRepository.getUserRoles(user.id);
    const roleNames = roles.map((r) => r.name);

    // Generate new tokens
    const payload: JwtPayload = {
      userId: user.id,
      sessionId: tokenRecord.sessionId,
      roles: roleNames,
      moduleRoles: [],
    };

    const accessToken = this.generateAccessToken(payload);
    const newRefreshToken = this.generateRefreshToken();

    // Store new hashed refresh token
    const refreshExpiryMs = parseExpiry(config.jwt.refreshExpiry);
    await this.tokenRepository.create({
      userId: user.id,
      sessionId: tokenRecord.sessionId,
      tokenHash: this.hashToken(newRefreshToken),
      expiryDate: new Date(Date.now() + refreshExpiryMs),
      userAgent,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(dto: LogoutDto): Promise<void> {
    if (!dto.refreshToken) {
      throw new ValidationError('refreshToken is required');
    }

    const tokenHash = this.hashToken(dto.refreshToken);
    const tokenRecord = await this.tokenRepository.findByTokenHash(tokenHash);

    if (!tokenRecord) {
      // Idempotent: already logged out or token not found
      return;
    }

    // Delete all tokens for the session, then delete the session
    await this.tokenRepository.deleteBySessionId(tokenRecord.sessionId);
    await this.sessionRepository.delete(tokenRecord.sessionId);
  }

  private generateAccessToken(payload: JwtPayload): string {
    const secret: jwt.Secret = config.jwt.secret;
    const options: jwt.SignOptions = {
      expiresIn: config.jwt.accessExpiry as unknown as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign(payload, secret, options);
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
