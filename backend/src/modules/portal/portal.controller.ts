import { Controller, Get } from '@nestjs/common';

import { PortalService } from './portal.service';
import { PortalDashboardResponse } from './portal.types';

@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('dashboard')
  dashboard(): Promise<PortalDashboardResponse> {
    return this.portalService.getDashboard();
  }
}
