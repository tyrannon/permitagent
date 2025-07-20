import jwt from 'jsonwebtoken';
import { config } from '../../config';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  departmentId?: string;
  sessionId: string;
}

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export class JWTService {
  private readonly secret: string;
  private readonly refreshSecret: string;

  constructor() {
    this.secret = config.jwtSecret;
    this.refreshSecret = `${config.jwtSecret}_refresh`;
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'permitai',
      audience: 'permitai-api',
    });
  }

  generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'permitai',
      audience: 'permitai-api',
    });
  }

  generateTokenPair(payload: TokenPayload): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({
      userId: payload.userId,
      sessionId: payload.sessionId,
    });

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'permitai',
        audience: 'permitai-api',
      }) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, this.refreshSecret, {
        issuer: 'permitai',
        audience: 'permitai-api',
      }) as RefreshTokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  decodeToken(token: string): any {
    return jwt.decode(token);
  }
}

export const jwtService = new JWTService();