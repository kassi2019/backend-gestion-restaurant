import { Module } from '@nestjs/common';
import { CommandesService } from './commandes.service';
import { CommandesController } from './commandes.controller';
import { SocketModule } from '../socket/socket.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [SocketModule, NotificationsModule, MenuModule],
  controllers: [CommandesController],
  providers: [CommandesService],
  exports: [CommandesService],
})
export class CommandesModule {}
