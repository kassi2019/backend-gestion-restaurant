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
  const adresseIp = process.env.ADRESSE_IP || 'http://localhost';
  await app.listen(port);
  console.log(`Serveur demarre sur ${adresseIp}:${port}`);
  console.log(`QR Codes: ${adresseIp}:${port}/qrcodes.html`);
  console.log(`Client: ${adresseIp}:${port}/client.html`);
}
bootstrap();
