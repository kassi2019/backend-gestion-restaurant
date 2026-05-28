import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PaiementController } from './paiement.controller';
import { PaiementService } from './paiement.service';
import { SocketModule } from '../socket/socket.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    SocketModule,
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [PaiementController],
  providers: [PaiementService],
  exports: [PaiementService],
})
export class PaiementModule {}
