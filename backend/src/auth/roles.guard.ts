import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppError } from '../common/errors/app-error';
import { ERROR_CODES } from '../common/errors/error-codes';
import { ROLES_KEY } from './roles.decorator';

interface RequestWithUser {
  user?: {
    role: string;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (request.user && roles.includes(request.user.role)) {
      return true;
    }

    throw new AppError(
      ERROR_CODES.UNAUTHORIZED,
      '未登录',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
