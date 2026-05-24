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

  async update(userId: number, data: { nom?: string; telephone?: string; role?: Role; mot_de_passe?: string }) {
    const updateData: any = {};
    if (data.nom) updateData.nom = data.nom;
    if (data.telephone) updateData.telephone = data.telephone;
    if (data.role) updateData.role = data.role;
    if (data.mot_de_passe) {
      const bcrypt = require('bcryptjs');
      updateData.mot_de_passe = await bcrypt.hash(data.mot_de_passe, 10);
    }
    return this.prisma.utilisateur.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, nom: true, telephone: true, role: true, statut: true, photo: true },
    });
  }
}
