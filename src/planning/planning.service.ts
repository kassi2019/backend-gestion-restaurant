import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlanningService {
  constructor(private prisma: PrismaService) {}

  // Convertit une heure (HH:MM ou ISO string) en Date sur 1970-01-01
  private parseHeure(h: string): Date {
    if (!h) throw new Error('Heure invalide');
    // Si c'est déjà une ISO string complète, extraire juste l'heure
    if (h.includes('T')) {
      const d = new Date(h);
      if (isNaN(d.getTime())) throw new Error('Date invalide');
      return d;
    }
    // Format HH:MM
    const d = new Date(`1970-01-01T${h}:00`);
    if (isNaN(d.getTime())) throw new Error('Heure invalide');
    return d;
  }

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
        heureDebut: this.parseHeure(data.heureDebut),
        heureFin: this.parseHeure(data.heureFin),
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
    if (data.heureDebut) updateData.heureDebut = this.parseHeure(data.heureDebut);
    if (data.heureFin) updateData.heureFin = this.parseHeure(data.heureFin);
    return this.prisma.planning.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number) {
    return this.prisma.planning.delete({ where: { id } });
  }
}
