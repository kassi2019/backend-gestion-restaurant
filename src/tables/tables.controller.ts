import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, StatutTable } from '@prisma/client';

@Controller('tables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR)
  @Get()
  findAll(@Request() req) {
    return this.tablesService.findAll(req.user.restaurantId);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR)
  @Get('serveur')
  findByServeur(@Request() req) {
    return this.tablesService.findByServeur(req.user.id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() data: { numero: string; zone: string }, @Request() req) {
    return this.tablesService.create({ ...data, restaurantId: req.user.restaurantId });
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id/assign')
  assignServeur(@Param('id') id: string, @Body() data: { serveurId: number }) {
    return this.tablesService.assignServeur(+id, data.serveurId);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR)
  @Patch(':id/statut')
  updateStatut(@Param('id') id: string, @Body() data: { statut: StatutTable }) {
    return this.tablesService.updateStatut(+id, data.statut);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: { numero?: string; zone?: string }) {
    return this.tablesService.update(+id, data);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tablesService.delete(+id);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR)
  @Get(':id/qrcode')
  getQrCode(@Param('id') id: string) {
    return this.tablesService.getQrCode(+id);
  }
}
