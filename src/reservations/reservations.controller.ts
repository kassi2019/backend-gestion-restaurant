import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Post()
  create(@Body() data: {
    nomClient: string; telephone: string; nbPersonnes: number;
    dateReservation: string; tableId?: number; notes?: string;
  }, @Request() req) {
    return this.reservationsService.create({ ...data, restaurantId: req.user.restaurantId });
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Get()
  findAll(@Request() req, @Query('date') date?: string) {
    if (date) return this.reservationsService.findByDate(req.user.restaurantId, date);
    return this.reservationsService.findAll(req.user.restaurantId);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(+id);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: {
    nomClient?: string; telephone?: string; nbPersonnes?: number;
    dateReservation?: string; tableId?: number; notes?: string; statut?: string;
  }) {
    return this.reservationsService.update(+id, data);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Post(':id/honorer')
  honorer(@Param('id') id: string) {
    return this.reservationsService.honorer(+id);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Post(':id/annuler')
  annuler(@Param('id') id: string) {
    return this.reservationsService.annuler(+id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.reservationsService.delete(+id);
  }
}
