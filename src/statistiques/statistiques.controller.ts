import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { StatistiquesService } from './statistiques.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('statistiques')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class StatistiquesController {
  constructor(private statistiquesService: StatistiquesService) {}

  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.statistiquesService.getDashboard(req.user.restaurantId);
  }

  @Get('ventes')
  getVentes(@Request() req, @Query('debut') debut?: string, @Query('fin') fin?: string) {
    return this.statistiquesService.getVentes(req.user.restaurantId, debut, fin);
  }

  @Get('plats-populaires')
  getPlatsPopulaires(@Request() req, @Query('limit') limit?: string) {
    return this.statistiquesService.getPlatsPopulaires(req.user.restaurantId, limit ? +limit : 10);
  }

  @Get('performance-serveurs')
  getPerformanceServeurs(@Request() req) {
    return this.statistiquesService.getPerformanceServeurs(req.user.restaurantId);
  }

  @Get('affluence')
  getAffluence(@Request() req) {
    return this.statistiquesService.getAffluence(req.user.restaurantId);
  }
}
