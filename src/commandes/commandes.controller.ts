import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CommandesService } from './commandes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, StatutCommande, StatutPreparation } from '@prisma/client';

@Controller('commandes')
export class CommandesController {
  constructor(private commandesService: CommandesService) {}

  @Post('client')
  createFromClient(@Body() data: { tableId: number; sessionKey?: string; articles: { menuId: number; quantite: number }[] }) {
    return this.commandesService.createFromClient(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  findAll(@Request() req) {
    return this.commandesService.findAllByRestaurant(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR)
  @Get('serveur')
  findByServeur(@Request() req) {
    return this.commandesService.findByServeur(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUISINE)
  @Get('cuisine')
  findByCuisine(@Request() req) {
    return this.commandesService.findByCuisine(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BAR)
  @Get('bar')
  findByBar(@Request() req) {
    return this.commandesService.findByBar(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR)
  @Patch(':id/statut')
  updateStatut(@Param('id') id: string, @Body() data: { statut: StatutCommande }) {
    return this.commandesService.updateStatut(+id, data.statut);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUISINE, Role.BAR)
  @Patch('details/:id/statut')
  updateDetailStatut(@Param('id') id: string, @Body() data: { statut: StatutPreparation }) {
    return this.commandesService.updateDetailStatut(+id, data.statut);
  }

  @Get('session/:sessionId')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.commandesService.findBySession(+sessionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR)
  @Get('table/:tableId')
  findByTable(@Param('tableId') tableId: string) {
    return this.commandesService.findByTable(+tableId);
  }

  @Get('client-session/:sessionKey')
  findBySessionKey(@Param('sessionKey') sessionKey: string) {
    return this.commandesService.findBySessionKey(sessionKey);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR, Role.CUISINE, Role.BAR)
  @Get('stats')
  getStats(@Request() req) {
    return this.commandesService.getStats(req.user.restaurantId, req.user.id, req.user.role);
  }
}
