import { compare, hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { jwtService } from '../lib/auth/jwt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationId?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: {
      id: string;
      name: string;
      permissions: any;
    };
    department?: {
      id: string;
      name: string;
    };
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  private readonly SALT_ROUNDS = 10;

  async register(data: RegisterDto): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hash(data.password, this.SALT_ROUNDS);

    // Get default role (applicant)
    const defaultRole = await prisma.role.findUnique({
      where: { name: 'applicant' },
    });

    if (!defaultRole) {
      throw new Error('Default role not found');
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roleId: defaultRole.id,
      },
      include: {
        role: true,
        department: true,
      },
    });

    // Create session
    const sessionId = this.generateSessionId();
    const session = await this.createSession(user.id, sessionId);

    // Generate tokens
    const tokens = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role.name,
      departmentId: user.departmentId || undefined,
      sessionId,
    });

    // Update session with tokens
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });

    return this.formatAuthResponse(user, tokens);
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValid = await compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is disabled');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create session
    const sessionId = this.generateSessionId();
    const session = await this.createSession(user.id, sessionId);

    // Generate tokens
    const tokens = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role.name,
      departmentId: user.departmentId || undefined,
      sessionId,
    });

    // Update session with tokens
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });

    return this.formatAuthResponse(user, tokens);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Verify refresh token
    const payload = jwtService.verifyRefreshToken(refreshToken);

    // Find session
    const session = await prisma.session.findUnique({
      where: { 
        id: payload.sessionId,
        refreshToken,
      },
    });

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new Error('Session expired');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new tokens
    const tokens = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role.name,
      departmentId: user.departmentId || undefined,
      sessionId: session.id,
    });

    // Update session
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return this.formatAuthResponse(user, tokens);
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await prisma.session.delete({
      where: { 
        id: sessionId,
        userId,
      },
    });
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return false;
    }

    return new Date() <= session.expiresAt;
  }

  private async createSession(userId: string, sessionId: string) {
    return prisma.session.create({
      data: {
        id: sessionId,
        userId,
        token: '',
        refreshToken: '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  private formatAuthResponse(user: any, tokens: any): AuthResponse {
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: {
          id: user.role.id,
          name: user.role.name,
          permissions: user.role.permissions,
        },
        department: user.department ? {
          id: user.department.id,
          name: user.department.name,
        } : undefined,
      },
      tokens,
    };
  }
}

export const authService = new AuthService();