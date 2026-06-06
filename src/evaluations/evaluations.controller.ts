import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('evaluations')
export class EvaluationsController {
  constructor(private evaluationsService: EvaluationsService) {}

  @Post()
  create(@Body() data: {
    telephone: string; noteService: number; noteCuisine: number;
    noteAmbiance: number; commentaire?: string; restaurantId: number;
  }) {
    return this.evaluationsService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  findAll(@Request() req) {
    return this.evaluationsService.findAll(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('moyennes')
  getMoyennes(@Request() req) {
    return this.evaluationsService.getMoyennes(req.user.restaurantId);
  }
}
