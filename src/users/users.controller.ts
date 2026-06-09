import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, StatutUtilisateur } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Get()
  findAll(@Request() req) {
    return this.usersService.findAll(req.user.restaurantId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Get('role/:role')
  findByRole(@Request() req, @Param('role') role: Role) {
    return this.usersService.findByRole(req.user.restaurantId, role);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      nom?: string;
      telephone?: string;
      role?: Role;
      mot_de_passe?: string;
    },
    @Request() req,
  ) {
    // Seul le SUPER_ADMIN peut changer le rôle (et donc les modules)
    if (data.role && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul le Super Admin peut changer le rôle d\'un utilisateur');
    }
    return this.usersService.update(+id, data);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Patch(':id/statut')
  updateStatut(
    @Param('id') id: string,
    @Query('statut') statut: StatutUtilisateur,
  ) {
    return this.usersService.updateStatut(+id, statut);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete(':id')
  supprimer(@Param('id') id: string) {
    return this.usersService.supprimer(+id);
  }
}
