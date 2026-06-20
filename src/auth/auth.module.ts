import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { SubscriptionInterceptor } from './interceptors/subscription.interceptor';
import { ActivationModule } from '../activation/activation.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
      signOptions: { expiresIn: '12h' },
    }),
    ActivationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: SubscriptionInterceptor,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
