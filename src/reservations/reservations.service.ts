import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    nomClient: string; telephone: string; nbPersonnes: number;
    dateReservation: string; tableId?: number; notes?: string; restaurantId: number;
  }) {
    return this.prisma.reservation.create({
      data: {
        nomClient: data.nomClient,
        telephone: data.telephone,
        nbPersonnes: data.nbPersonnes || 1,
        dateReservation: new Date(data.dateReservation),
        tableId: data.tableId || null,
        notes: data.notes || null,
        restaurantId: data.restaurantId,
      },
      include: { table: { select: { numero: true, zone: true } } },
    });
  }

  async findByDate(restaurantId: number, date?: string) {
    const where: any = { restaurantId };
    if (date) {
      const debut = new Date(date);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(date);
      fin.setHours(23, 59, 59, 999);
      where.dateReservation = { gte: debut, lte: fin };
    }
    return this.prisma.reservation.findMany({
      where,
      include: { table: { select: { numero: true, zone: true, statut: true } } },
      orderBy: { dateReservation: 'asc' },
    });
  }

  async findAll(restaurantId: number) {
    return this.prisma.reservation.findMany({
      where: { restaurantId },
      include: { table: { select: { numero: true, zone: true, statut: true } } },
      orderBy: { dateReservation: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.reservation.findUnique({
      where: { id },
      include: { table: { select: { numero: true, zone: true, statut: true } } },
    });
  }

  async update(id: number, data: {
    nomClient?: string; telephone?: string; nbPersonnes?: number;
    dateReservation?: string; tableId?: number; notes?: string; statut?: string;
  }) {
    const updateData: any = {};
    if (data.nomClient !== undefined) updateData.nomClient = data.nomClient;
    if (data.telephone !== undefined) updateData.telephone = data.telephone;
    if (data.nbPersonnes !== undefined) updateData.nbPersonnes = data.nbPersonnes;
    if (data.dateReservation !== undefined) updateData.dateReservation = new Date(data.dateReservation);
    if (data.tableId !== undefined) updateData.tableId = data.tableId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.statut !== undefined) updateData.statut = data.statut as any;

    return this.prisma.reservation.update({
      where: { id },
      data: updateData,
      include: { table: { select: { numero: true, zone: true } } },
    });
  }

  async honorer(id: number) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id }, include: { table: true } });
    if (!reservation) throw new BadRequestException('Réservation introuvable');

    // Mettre à jour le statut de la réservation
    await this.prisma.reservation.update({
      where: { id },
      data: { statut: 'HONOREE' },
    });

    // Si une table est assignée, la mettre à OCCUPEE
    if (reservation.tableId) {
      await this.prisma.tableRestaurant.update({
        where: { id: reservation.tableId },
        data: { statut: 'OCCUPEE' },
      });
    }

    return { message: 'Réservation honorée', tableId: reservation.tableId };
  }

  async annuler(id: number) {
    return this.prisma.reservation.update({
      where: { id },
      data: { statut: 'ANNULEE' },
    });
  }

  async delete(id: number) {
    return this.prisma.reservation.delete({ where: { id } });
  }
}
