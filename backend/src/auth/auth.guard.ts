import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import { AppError } from '../common/errors/app-error';
import { ERROR_CODES } from '../common/errors/error-codes';

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
  user?: {
    id: string;
    role: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const userId = request.headers['x-user-id'];
    const role = request.headers['x-user-role'];

    if (typeof userId !== 'string' || typeof role !== 'string') {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '未登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.user = {
      id: userId,
      role,
    };

    return true;
  }
}
