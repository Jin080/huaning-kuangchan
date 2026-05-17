import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: 'ok';
  service: 'huaning-mineral-auction-backend';
}

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'huaning-mineral-auction-backend',
    };
  }
}
