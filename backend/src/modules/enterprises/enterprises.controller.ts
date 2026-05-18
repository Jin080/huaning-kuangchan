import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import {
  EnterpriseCertificationDto,
  RejectEnterpriseCertificationDto,
} from './dto/enterprise-certification.dto';
import { EnterpriseCertificationResponse } from './enterprise-certification.types';
import { EnterprisesService } from './enterprises.service';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class EnterprisesController {
  constructor(private readonly enterprisesService: EnterprisesService) {}

  @Post('enterprises/register')
  @Roles('ENTERPRISE')
  register(
    @CurrentUser() user: CurrentUser,
    @Body() dto: EnterpriseCertificationDto,
  ): Promise<EnterpriseCertificationResponse> {
    return this.enterprisesService.submitCertification(user.id, dto);
  }

  @Get('admin/reviews/enterprises')
  @Roles('ADMIN')
  listForReview(): Promise<EnterpriseCertificationResponse[]> {
    return this.enterprisesService.listForReview();
  }

  @Post('admin/reviews/enterprises/:id/approve')
  @Roles('ADMIN')
  approve(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<EnterpriseCertificationResponse> {
    return this.enterprisesService.approveCertification(id, user.id);
  }

  @Post('admin/reviews/enterprises/:id/reject')
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
