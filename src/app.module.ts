import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { TablesModule } from './tables/tables.module';
import { MenuModule } from './menu/menu.module';
import { CommandesModule } from './commandes/commandes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlanningModule } from './planning/planning.module';
import { SocketModule } from './socket/socket.module';
import { ServeurTableModule } from './serveur-table/serveur-table.module';
import { PaiementModule } from './paiement/paiement.module';
import { StatistiquesModule } from './statistiques/statistiques.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RestaurantModule,
    TablesModule,
    MenuModule,
    CommandesModule,
    NotificationsModule,
    PlanningModule,
    SocketModule,
    ServeurTableModule,
    PaiementModule,
    StatistiquesModule,
  ],
})
export class AppModule {}
