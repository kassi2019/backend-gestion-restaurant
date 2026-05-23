import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request, Query,
} from '@nestjs/common';
import { ServeurTableService } from './serveur-table.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('serveur-tables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServeurTableController {
  constructor(private serveurTableService: ServeurTableService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  findAll(@Request() req) {
    return this.serveurTableService.findAll(req.user.restaurantId);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR)
  @Get('serveur')
  findByServeur(@Request() req) {
    return this.serveurTableService.findByServeur(req.user.id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('table/:tableId')
  findByTable(@Param('tableId') tableId: string) {
    return this.serveurTableService.findByTable(+tableId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  assign(@Body() data: { utilisateurId: number; tableId: number }) {
    return this.serveurTableService.assign(data.utilisateurId, data.tableId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':tableId')
  unassign(@Param('tableId') tableId: string) {
    return this.serveurTableService.unassign(+tableId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch('reassign')
  reassign(
    @Body() data: { fromServeurId: number; toServeurId: number; tableId?: number },
  ) {
    return this.serveurTableService.reassign(
      data.fromServeurId,
      data.toServeurId,
      data.tableId,
    );
  }

  // ======== Affectation Automatique ========

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('run-check')
  runDailyCheck(@Request() req) {
    return this.serveurTableService.runDailyCheck(req.user.restaurantId);
  }
}
