import { Controller, Get, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, StatutUtilisateur } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  findAll(@Request() req) {
    return this.usersService.findAll(req.user.restaurantId);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('role/:role')
  findByRole(@Request() req, @Param('role') role: Role) {
    return this.usersService.findByRole(req.user.restaurantId, role);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: { nom?: string; telephone?: string; role?: Role; mot_de_passe?: string }) {
    return this.usersService.update(+id, data);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id/statut')
  updateStatut(@Param('id') id: string, @Query('statut') statut: StatutUtilisateur) {
    return this.usersService.updateStatut(+id, statut);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  supprimer(@Param('id') id: string) {
    return this.usersService.supprimer(+id);
  }
}
