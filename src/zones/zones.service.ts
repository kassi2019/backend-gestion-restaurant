import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: number) {
    return this.prisma.zone.findMany({
      where: { restaurantId },
      include: { tables: { select: { id: true, numero: true } } },
      orderBy: { nom: 'asc' },
    });
  }

  async create(restaurantId: number, data: { nom: string; coefficient: number }) {
    return this.prisma.zone.create({
      data: { nom: data.nom, coefficient: data.coefficient, restaurantId },
    });
  }

  async update(id: number, data: { nom?: string; coefficient?: number }) {
    return this.prisma.zone.update({ where: { id }, data });
  }

  async delete(id: number) {
    // Désassigner les tables avant de supprimer
    await this.prisma.tableRestaurant.updateMany({ where: { zoneId: id }, data: { zoneId: null } });
    return this.prisma.zone.delete({ where: { id } });
  }

  async assignTable(zoneId: number, tableId: number) {
    return this.prisma.tableRestaurant.update({ where: { id: tableId }, data: { zoneId } });
  }

  async unassignTable(tableId: number) {
    return this.prisma.tableRestaurant.update({ where: { id: tableId }, data: { zoneId: null } });
  }
}
