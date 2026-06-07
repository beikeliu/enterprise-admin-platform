import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ZodValidationPipe } from './common/zod-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.ADMIN_WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ZodValidationPipe());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '127.0.0.1');
  console.log(`Admin API listening on http://localhost:${port}/api`);
}

bootstrap();
