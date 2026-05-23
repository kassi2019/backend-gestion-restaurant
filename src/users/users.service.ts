import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, StatutUtilisateur } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: number) {
    return this.prisma.utilisateur.findMany({
      where: { restaurantId },
      select: {
        id: true,
        nom: true,
        telephone: true,
        role: true,
        statut: true,
        photo: true,
        dateCreation: true,
      },
    });
  }

  async findByRole(restaurantId: number, role: Role) {
    return this.prisma.utilisateur.findMany({
      where: { restaurantId, role },
      select: {
        id: true,
        nom: true,
        telephone: true,
        role: true,
        statut: true,
        photo: true,
      },
    });
  }

  async updateStatut(userId: number, statut: StatutUtilisateur) {
    return this.prisma.utilisateur.update({
      where: { id: userId },
      data: { statut },
    });
  }
}
