import { Module } from '@nestjs/common';
import { ServeurTableController } from './serveur-table.controller';
import { ServeurTableService } from './serveur-table.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServeurTableController],
  providers: [ServeurTableService],
  exports: [ServeurTableService],
})
export class ServeurTableModule {}
