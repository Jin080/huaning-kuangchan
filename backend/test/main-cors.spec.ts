import { Test } from '@nestjs/testing';

import { configureApp } from '../src/main';
import { LoggingModule } from '../src/logging/logging.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('application CORS', () => {
  it('allows frontend dev preflight requests with development auth headers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggingModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    const app = moduleRef.createNestApplication();

    configureApp(app);
    await app.listen(0);
    const address = app.getHttpServer().address() as { port: number };

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/admin/logs?pageSize=100`,
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://127.0.0.1:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'x-user-id,x-user-role',
        },
      },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'http://127.0.0.1:5173',
    );
    expect(response.headers.get('access-control-allow-headers')).toContain(
      'x-user-id',
    );
    expect(response.headers.get('access-control-allow-headers')).toContain(
      'x-user-role',
    );

    await app.close();
  });
});
