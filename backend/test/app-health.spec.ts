import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { HealthController } from '../src/health/health.controller';

describe('health foundation', () => {
  it('wires the application module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef.get(HealthController)).toBeInstanceOf(HealthController);
  });

  it('returns a health payload', () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({
      status: 'ok',
      service: 'huaning-mineral-auction-backend',
    });
  });
});
