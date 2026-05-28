import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatutTable } from '@prisma/client';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: number) {
    // Réinitialiser les tables OCCUPEE sans commande active aujourd'hui
    await this.libererTablesOccupeesSansActivite(restaurantId);

    return this.prisma.tableRestaurant.findMany({
      where: { restaurantId },
      include: { serveur: { select: { id: true, nom: true } } },
    });
  }

  async findByServeur(serveurId: number) {
    // Récupérer le restaurantId via le serveur
    const serveur = await this.prisma.utilisateur.findUnique({
      where: { id: serveurId },
      select: { restaurantId: true },
    });
    if (serveur) {
      await this.libererTablesOccupeesSansActivite(serveur.restaurantId);
    }

    return this.prisma.tableRestaurant.findMany({
      where: { serveurId },
    });
  }

  private async libererTablesOccupeesSansActivite(restaurantId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Tables OCCUPEE du restaurant
    const tablesOccupees = await this.prisma.tableRestaurant.findMany({
      where: { restaurantId, statut: 'OCCUPEE' },
      select: { id: true },
    });

    for (const table of tablesOccupees) {
      // Vérifier si une commande active existe aujourd'hui pour cette table
      const commandeActive = await this.prisma.commande.findFirst({
        where: {
          tableId: table.id,
          dateCommande: { gte: today, lt: tomorrow },
          statut: { in: ['VALIDEE', 'EN_PREPARATION', 'PRETE', 'SERVIE'] },
        },
      });

      if (!commandeActive) {
        await this.prisma.tableRestaurant.update({
          where: { id: table.id },
          data: { statut: 'LIBRE' },
        });
      }
    }
  }

  async create(data: { numero: string; zone: string; restaurantId: number }) {
    // Transaction : créer puis mettre à jour le QR code avec l'ID généré
    return this.prisma.$transaction(async (tx) => {
      const table = await tx.tableRestaurant.create({
        data: {
          numero: data.numero,
          zone: data.zone,
          restaurantId: data.restaurantId,
          qrCode: '',
        },
      });

      const ip = (process.env.ADRESSE_IP || 'localhost').replace(/^https?:\/\//, '');
      const port = process.env.PORT || '3000';
      const host = ip === '0.0.0.0' ? 'localhost' : ip;
      const qrUrl = `http://${host}:${port}/client.html?tableId=${table.id}&restaurantId=${data.restaurantId}`;

      return tx.tableRestaurant.update({
        where: { id: table.id },
        data: { qrCode: qrUrl },
      });
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
      select: { id: true, numero: true, restaurantId: true },
    });
    if (!table) throw new Error('Table introuvable');

    const ip = (process.env.ADRESSE_IP || 'localhost').replace(
      /^https?:\/\//,
      '',
    );
    const port = process.env.PORT || '3000';
    const host = ip === '0.0.0.0' ? 'localhost' : ip;
    const baseUrl = `http://${host}:${port}`;

    return {
      tableId: table.id,
      numero: table.numero,
      qrCode: `${baseUrl}/client.html?tableId=${table.id}&restaurantId=${table.restaurantId}`,
      qrUrl: `/qr-table-${table.id}.png`,
    };
  }
}
