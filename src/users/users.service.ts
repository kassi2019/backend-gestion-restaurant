import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, StatutUtilisateur } from '@prisma/client';

const roleModules: Record<string, string[]> = {
  SUPER_ADMIN: ['Accueil', 'Tables', 'Affectation', 'Commandes', 'Menu', 'Planning', 'Caisse', 'Users', 'Notifications', 'Stats', 'Paramètres', 'Abonnement', 'Générer codes', 'Stock'],
  ADMIN: ['Accueil', 'Tables', 'Affectation', 'Commandes', 'Menu', 'Planning', 'Caisse', 'Users', 'Notifications', 'Stats', 'Paramètres', 'Abonnement', 'Stock', 'Réservations'],
  MANAGER: ['Accueil', 'Tables', 'Affectation', 'Commandes', 'Menu', 'Planning', 'Caisse', 'Users', 'Notifications', 'Stats', 'Réservations'],
  SERVEUR: ['Accueil', 'Tables', 'Commandes', 'Planning', 'Notifications'],
  CUISINE: ['Accueil', 'Commandes', 'Planning', 'Notifications'],
  BAR: ['Accueil', 'Commandes', 'Planning', 'Notifications'],
  RECEPTIONNISTE: ['Accueil', 'Tables', 'Menu', 'Reception', 'Commandes', 'Planning', 'Notifications', 'Réservations'],
  CAISSIER: ['Accueil', 'Planning', 'Caisse', 'Notifications'],
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private async reassignModules(userId: number, role: string) {
    // 1. Récupérer le restaurant de l'utilisateur
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { restaurantId: true },
    });
    if (!user) return;

    // 2. Modules autorisés pour ce restaurant (RestaurantModule)
    const restaurantModules = await this.prisma.restaurantModule.findMany({
      where: { restaurantId: user.restaurantId },
      select: { moduleId: true },
    });
    const allowedIds = new Set(restaurantModules.map(rm => rm.moduleId));
    const hasRestaurantModules = restaurantModules.length > 0;

    // 3. Template du rôle
    const noms = roleModules[role] || ['Accueil', 'Notifications'];

    // 4. Filtrer les modules : template ∩ RestaurantModule (si défini)
    const where: any = { nom: { in: noms } };
    if (hasRestaurantModules) {
      where.id = { in: [...allowedIds] };
    }
    const modules = await this.prisma.module.findMany({ where });

    // 5. Appliquer
    await this.prisma.userModule.deleteMany({ where: { utilisateurId: userId } });
    for (const m of modules) {
      await this.prisma.userModule.create({ data: { utilisateurId: userId, moduleId: m.id } });
    }
  }

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
        userModules: { include: { module: true } },
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

  async update(
    userId: number,
    data: {
      nom?: string;
      telephone?: string;
      role?: Role;
      mot_de_passe?: string;
      joursRepos?: string;
    },
  ) {
    const updateData: any = {};
    if (data.nom) updateData.nom = data.nom;
    if (data.telephone) updateData.telephone = data.telephone;
    if (data.role) updateData.role = data.role;
    if (data.joursRepos !== undefined) updateData.joursRepos = data.joursRepos;
    if (data.mot_de_passe) {
      const bcrypt = require('bcryptjs');
      updateData.mot_de_passe = await bcrypt.hash(data.mot_de_passe, 10);
    }
    const updated = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        nom: true,
        telephone: true,
        role: true,
        statut: true,
        photo: true,
      },
    });

    // Si le rôle a changé, réassigner les modules
    if (data.role) {
      await this.reassignModules(userId, data.role);
    }

    return updated;
  }

  async supprimer(userId: number) {
    // Marquer comme INACTIF d'abord (soft-delete), puis supprimer
    // On ne supprime que si l'utilisateur n'a pas de commandes liées
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: { _count: { select: { commandes: true, serveurTables: true } } },
    });
    if (!user) throw new Error('Utilisateur introuvable');

    if (user._count.commandes > 0) {
      // Soft-delete : on garde en INACTIF
      return this.prisma.utilisateur.update({
        where: { id: userId },
        data: { statut: 'INACTIF' },
      });
    }
    // Suppression définitive
    return this.prisma.utilisateur.delete({ where: { id: userId } });
  }
}
