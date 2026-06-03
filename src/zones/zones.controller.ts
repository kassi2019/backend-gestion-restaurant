import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('zones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ZonesController {
  constructor(private zonesService: ZonesService) {}

  @Get()
  findAll(@Request() req) { return this.zonesService.findAll(req.user.restaurantId); }

  @Post()
  create(@Body() data: { nom: string; coefficient: number }, @Request() req) {
    return this.zonesService.create(req.user.restaurantId, data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: { nom?: string; coefficient?: number }) {
    return this.zonesService.update(+id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.zonesService.delete(+id); }

  @Post(':id/assign-table')
  assignTable(@Param('id') id: string, @Body() data: { tableId: number }) {
    return this.zonesService.assignTable(+id, data.tableId);
  }

  @Post(':id/unassign-table')
  unassignTable(@Param('id') id: string, @Body() data: { tableId: number }) {
    return this.zonesService.unassignTable(data.tableId);
  }
}
