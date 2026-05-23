import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatutTable } from '@prisma/client';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: number) {
    return this.prisma.tableRestaurant.findMany({
      where: { restaurantId },
      include: { serveur: { select: { id: true, nom: true } } },
    });
  }

  async findByServeur(serveurId: number) {
    return this.prisma.tableRestaurant.findMany({
      where: { serveurId },
    });
  }

  async create(data: { numero: string; zone: string; restaurantId: number }) {
    return this.prisma.tableRestaurant.create({
      data: {
        numero: data.numero,
        zone: data.zone,
        restaurantId: data.restaurantId,
        qrCode: `QR-${data.restaurantId}-${data.numero}-${Date.now()}`,
      },
    });
  }

  async assignServeur(tableId: number, serveurId: number) {
    await this.prisma.serveurTable.create({
      data: {
        utilisateurId: serveurId,
        tableId,
        statut: 'ACTIF',
      },
    });

    return this.prisma.tableRestaurant.update({
      where: { id: tableId },
      data: { serveurId },
    });
  }

  async updateStatut(tableId: number, statut: StatutTable) {
    return this.prisma.tableRestaurant.update({
      where: { id: tableId },
      data: { statut },
    });
  }

  async update(tableId: number, data: { numero?: string; zone?: string }) {
    return this.prisma.tableRestaurant.update({
      where: { id: tableId },
      data,
    });
  }

  async delete(tableId: number) {
    return this.prisma.tableRestaurant.delete({
      where: { id: tableId },
    });
  }

  async getQrCode(tableId: number) {
    const table = await this.prisma.tableRestaurant.findUnique({
      where: { id: tableId },
      select: { id: true, numero: true, qrCode: true, restaurantId: true },
    });
    if (!table) throw new Error('Table introuvable');
    return {
      tableId: table.id,
      numero: table.numero,
      qrCode: table.qrCode,
      qrUrl: `/client.html?tableId=${table.id}&restaurantId=${table.restaurantId}`,
    };
  }
}
