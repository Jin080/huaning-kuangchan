import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import {
  EnterpriseRegisterDto,
  RejectEnterpriseCertificationDto,
} from './dto/enterprise-certification.dto';
import { EnterpriseCertificationResponse } from './enterprise-certification.types';
import { EnterprisesService } from './enterprises.service';

@Controller()
export class EnterprisesController {
  constructor(private readonly enterprisesService: EnterprisesService) {}

  @Post('enterprises/register')
  register(
    @Body() dto: EnterpriseRegisterDto,
  ): Promise<EnterpriseCertificationResponse> {
    return this.enterprisesService.registerEnterprise(dto);
  }

  @Get('admin/reviews/enterprises')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  listForReview(): Promise<EnterpriseCertificationResponse[]> {
    return this.enterprisesService.listForReview();
  }

  @Post('admin/reviews/enterprises/:id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  approve(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<EnterpriseCertificationResponse> {
    return this.enterprisesService.approveCertification(id, user.id);
  }

  @Post('admin/reviews/enterprises/:id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  reject(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: RejectEnterpriseCertificationDto,
  ): Promise<EnterpriseCertificationResponse> {
    return this.enterprisesService.rejectCertification(
      id,
      user.id,
      dto.rejectReason,
    );
  }
}
