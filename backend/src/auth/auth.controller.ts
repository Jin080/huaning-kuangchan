import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from './auth.guard';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto.username, dto.password);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(): { success: true; message: string } {
    return this.authService.logout();
  }
}
