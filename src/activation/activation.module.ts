import { Module } from '@nestjs/common';
import { ActivationService } from './activation.service';
import { AbonnementScheduler } from './abonnement.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [ActivationService, AbonnementScheduler],
  exports: [ActivationService],
})
export class ActivationModule {}
