import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma, RoleCode, UserStatus } from '@prisma/client';

import { AppError } from '../common/errors/app-error';
import { ERROR_CODES } from '../common/errors/error-codes';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';

type UserWithProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  status: UserStatus;
  passwordHash: string;
  role: { code: RoleCode; name: string };
  enterprise: {
    id: string;
    name: string;
    certificationStatus: string;
    isBlacklisted: boolean;
  } | null;
};

type PrismaServiceLike = {
  user: {
    findUnique(args: Prisma.UserFindUniqueArgs): Promise<UserWithProfile | null>;
  };
};

export interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    username: string;
    role: RoleCode;
  };
  profile: {
    id: string;
    username: string;
    avatarUrl: string | null;
    statusCode: UserStatus;
    roleCode: RoleCode;
    roleName: string;
    enterprise: {
      id: string;
      name: string;
      certificationStatusCode: string;
      isBlacklisted: boolean;
    } | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  async login(username: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { role: true, enterprise: true },
    });

    if (!user) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '用户名或密码错误',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordMatches = await this.passwordService.verify(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '用户名或密码错误',
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.assertUserAllowed(user);

    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        role: user.role.code,
      }),
      user: {
        id: user.id,
        username: user.username,
        role: user.role.code,
      },
      profile: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        statusCode: user.status,
        roleCode: user.role.code,
        roleName: user.role.name,
        enterprise: user.enterprise
          ? {
              id: user.enterprise.id,
              name: user.enterprise.name,
              certificationStatusCode: user.enterprise.certificationStatus,
              isBlacklisted: user.enterprise.isBlacklisted,
            }
          : null,
      },
    };
  }

  logout(): { success: true; message: string } {
    return { success: true, message: '退出成功' };
  }

  private assertUserAllowed(user: UserWithProfile): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        '用户已禁用',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.role.code === RoleCode.ENTERPRISE && !user.enterprise) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        '企业不存在',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
