import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../lib/auth/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    departmentId?: string;
    sessionId: string;
    permissions?: string[];
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    // Verify token
    const payload = jwtService.verifyAccessToken(token);

    // Validate session
    const session = await prisma.session.findUnique({
      where: { 
        id: payload.sessionId,
        token,
      },
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    if (new Date() > session.expiresAt) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Get user permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Attach user to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      departmentId: payload.departmentId,
      sessionId: payload.sessionId,
      permissions: user.role.permissions as string[],
    };

    next();
  } catch (error: any) {
    if (error.message === 'Access token expired') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requirePermission(...permissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userPermissions = req.user.permissions || [];

    // Check if user has admin permission (bypass all checks)
    if (userPermissions.includes('*')) {
      return next();
    }

    // Check if user has any of the required permissions
    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissions,
      });
    }

    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient role',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
}

export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  authenticate(req, res, next);
}