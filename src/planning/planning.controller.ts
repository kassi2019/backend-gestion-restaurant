import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('planning')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanningController {
  constructor(private planningService: PlanningService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  findAll(@Request() req) {
    return this.planningService.findAll(req.user.restaurantId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() data: { utilisateurId: number; jour: string; heureDebut: string; heureFin: string }) {
    return this.planningService.create(data);
  }

  @Get('mine')
  getMine(@Request() req) {
    return this.planningService.findByUser(req.user.id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('date/:date')
  findByDate(@Request() req, @Param('date') date: string) {
    return this.planningService.findByDate(req.user.restaurantId, date);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: { jour?: string; heureDebut?: string; heureFin?: string }) {
    return this.planningService.update(+id, data);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.planningService.delete(+id);
  }
}
