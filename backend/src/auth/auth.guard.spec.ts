import { ExecutionContext } from '@nestjs/common';
import { RoleCode, UserStatus } from '@prisma/client';

import { ERROR_CODES } from '../common/errors/error-codes';
import { AuthGuard } from './auth.guard';
import { JwtService } from './jwt.service';

type TestRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: {
    id: string;
    role: string;
    authType?: 'bearer' | 'development-header';
  };
};

function createContext(request: TestRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard development auth headers', () => {
  const previousDevAuthHeadersEnabled = process.env.DEV_AUTH_HEADERS_ENABLED;

  afterEach(() => {
    if (previousDevAuthHeadersEnabled === undefined) {
      delete process.env.DEV_AUTH_HEADERS_ENABLED;
    } else {
      process.env.DEV_AUTH_HEADERS_ENABLED = previousDevAuthHeadersEnabled;
    }
  });

  it('rejects development headers by default', async () => {
    delete process.env.DEV_AUTH_HEADERS_ENABLED;
    const guard = new AuthGuard({} as never);
    const request: TestRequest = {
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'ADMIN',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
    });
    expect(request.user).toBeUndefined();
  });

  it('accepts ADMIN and ENTERPRISE development headers when explicitly enabled', async () => {
    process.env.DEV_AUTH_HEADERS_ENABLED = 'true';
    const guard = new AuthGuard({} as never);
    const request: TestRequest = {
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'ENTERPRISE',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user-1',
      role: 'ENTERPRISE',
      authType: 'development-header',
    });
  });

  it('rejects unsupported development header roles even when enabled', async () => {
    process.env.DEV_AUTH_HEADERS_ENABLED = 'true';
    const guard = new AuthGuard({} as never);
    const request: TestRequest = {
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'GUEST',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
    });
    expect(request.user).toBeUndefined();
  });

  it('prefers Bearer JWT over enabled development headers', async () => {
    process.env.DEV_AUTH_HEADERS_ENABLED = 'true';
    const token = new JwtService().sign({ sub: 'admin-1', role: RoleCode.ADMIN });
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin-1',
          status: UserStatus.ACTIVE,
          role: { code: RoleCode.ADMIN },
          enterprise: null,
        }),
      },
    };
    const guard = new AuthGuard(prisma as never);
    const request: TestRequest = {
      headers: {
        authorization: `Bearer ${token}`,
        'x-user-id': 'enterprise-1',
        'x-user-role': 'ENTERPRISE',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'admin-1',
      role: RoleCode.ADMIN,
      authType: 'bearer',
    });
  });
});
