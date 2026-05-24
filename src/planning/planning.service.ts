import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlanningService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    utilisateurId: number;
    jour: string;
    heureDebut: string;
    heureFin: string;
  }) {
    return this.prisma.planning.create({
      data: {
        utilisateurId: data.utilisateurId,
        jour: new Date(data.jour),
        heureDebut: new Date(`1970-01-01T${data.heureDebut}:00`),
        heureFin: new Date(`1970-01-01T${data.heureFin}:00`),
      },
    });
  }

  async findAll(restaurantId: number) {
    return this.prisma.planning.findMany({
      where: { utilisateur: { restaurantId } },
      include: {
        utilisateur: {
          select: { id: true, nom: true, role: true },
        },
      },
      orderBy: { jour: 'asc' },
    });
  }

  async findByUser(utilisateurId: number) {
    return this.prisma.planning.findMany({
      where: { utilisateurId },
      orderBy: { jour: 'asc' },
    });
  }

  async findByDate(restaurantId: number, date: string) {
    const jour = new Date(date);
    return this.prisma.planning.findMany({
      where: {
        jour,
        utilisateur: { restaurantId },
      },
      include: {
        utilisateur: {
          select: { id: true, nom: true, role: true },
        },
      },
    });
  }

  async update(id: number, data: { jour?: string; heureDebut?: string; heureFin?: string }) {
    const updateData: any = {};
    if (data.jour) updateData.jour = new Date(data.jour);
    if (data.heureDebut) updateData.heureDebut = new Date(`1970-01-01T${data.heureDebut}:00`);
    if (data.heureFin) updateData.heureFin = new Date(`1970-01-01T${data.heureFin}:00`);
    return this.prisma.planning.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number) {
    return this.prisma.planning.delete({ where: { id } });
  }
}
