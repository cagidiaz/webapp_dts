import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Bootstrap the NestJS application.
 * Configures: Swagger (OpenAPI), CORS, global ValidationPipe.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // CORS — allow frontend dev server
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe — strict DTO validation (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger (OpenAPI) documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('dTS Instruments API')
    .setDescription(
      'REST API for the dTS Instruments BI Dashboard. ' +
      'Business Central data is READ-ONLY. ' +
      'Only auth, profiles, roles, and forecast tables allow writes.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication & authorization')
    .addTag('Users', 'User profile & role management')
    .addTag('Accounting', 'KPIs: EBITDA, Liquidez, Margen Bruto (read-only)')
    .addTag('Sales', 'Billing analysis & rankings (read-only)')
    .addTag('Scenarios', 'Forecast scenarios CRUD')
    .addTag('Forecast', 'AI predictive engine')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 dTS API running on http://localhost:${port}`);
  console.log(`📖 Swagger docs at http://localhost:${port}/api-docs`);
}
bootstrap();
