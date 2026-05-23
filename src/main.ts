import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Servir les fichiers statiques via Express AVANT NestJS routing
  const publicDir = resolve(process.cwd(), 'public');
  const uploadsDir = resolve(process.cwd(), 'uploads');
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(express.static(publicDir));
  expressApp.use('/uploads', express.static(uploadsDir));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Serveur demarre sur http://192.168.1.7:${port}`);
  console.log(`QR Codes: http://192.168.1.7:${port}/qrcodes.html`);
  console.log(`Client: http://192.168.1.7:${port}/client.html`);
}
bootstrap();
