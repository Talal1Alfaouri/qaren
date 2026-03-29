import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      // Also check cookie
      const cookie = req.headers.cookie;
      if (!cookie?.includes('admin_token=')) {
        throw new UnauthorizedException('Admin authentication required');
      }
      const token = cookie.match(/admin_token=([^;]+)/)?.[1];
      return this.verifyToken(token);
    }

    const token = authHeader.slice(7);
    return this.verifyToken(token);
  }

  private verifyToken(token?: string): boolean {
    if (!token) throw new UnauthorizedException();
    try {
      const secret = this.config.get<string>('JWT_SECRET', 'change-me-in-production');
      jwt.verify(token, secret);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

// Auth controller for admin login
import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { ApiTags } from '@nestjs/swagger';

class LoginDto {
  email: string;
  password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private config: ConfigService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const adminEmail    = this.config.get('ADMIN_EMAIL', 'admin@qaren.sa');
    const adminPassword = this.config.get('ADMIN_PASSWORD', 'change-me-immediately');
    const jwtSecret     = this.config.get('JWT_SECRET', 'change-me-in-production');

    if (dto.email !== adminEmail || dto.password !== adminPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = jwt.sign({ role: 'admin', email: dto.email }, jwtSecret, { expiresIn: '7d' });

    // Set HTTP-only cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { token, expiresIn: '7d' };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('admin_token');
    return { ok: true };
  }
}
