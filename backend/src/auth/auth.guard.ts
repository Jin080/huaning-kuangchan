import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RoleCode, UserStatus } from '@prisma/client';

import { AppError } from '../common/errors/app-error';
import { ERROR_CODES } from '../common/errors/error-codes';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from './jwt.service';

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
  user?: {
    id: string;
    role: string;
    authType?: 'bearer' | 'development-header';
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwtService = new JwtService();

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const authorization = request.headers.authorization;

    if (typeof authorization === 'string') {
      const token = this.extractBearerToken(authorization);

      if (token) {
        request.user = await this.getUserFromToken(token);
        return true;
      }
    }

    const userId = request.headers['x-user-id'];
    const role = request.headers['x-user-role'];

    if (process.env.DEV_AUTH_HEADERS_ENABLED !== 'true') {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '未登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (typeof userId !== 'string' || typeof role !== 'string') {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '未登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (role !== RoleCode.ADMIN && role !== RoleCode.ENTERPRISE) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '未登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.user = {
      id: userId,
      role,
      authType: 'development-header',
    };

    return true;
  }

  private extractBearerToken(authorization: string): string | null {
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  private async getUserFromToken(
    token: string,
  ): Promise<{ id: string; role: string; authType: 'bearer' }> {
    const payload = this.jwtService.verify(token);

    if (!payload) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '登录状态已失效',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, enterprise: true },
    });

    if (!user) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '用户不存在',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        '用户已禁用',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.role.code !== payload.role) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '用户角色已变化，请重新登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.role.code === RoleCode.ENTERPRISE && !user.enterprise) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        '企业不存在',
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      id: user.id,
      role: user.role.code,
      authType: 'bearer',
    };
  }
}
