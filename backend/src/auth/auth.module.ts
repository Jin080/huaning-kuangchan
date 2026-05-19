import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthGuard, AuthService, JwtService, PasswordService, RolesGuard],
  exports: [AuthGuard, AuthService, JwtService, PasswordService, RolesGuard],
})
export class AuthModule {}
