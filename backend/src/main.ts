import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/errors/app-exception.filter';

export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-user-id',
      'x-user-role',
    ],
    optionsSuccessStatus: 204,
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AppExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  configureApp(app);
  const port = Number(process.env.PORT ?? 3101);
  await app.listen(port);
}

if (require.main === module) {
  void bootstrap();
}
