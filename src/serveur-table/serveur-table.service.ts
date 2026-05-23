import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServeurTableService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: number) {
    return this.prisma.serveurTable.findMany({
      where: {
        table: { restaurantId },
        statut: 'ACTIF',
      },
      include: {
        utilisateur: { select: { id: true, nom: true, role: true } },
        table: { select: { id: true, numero: true, zone: true } },
      },
    });
  }

  async findByServeur(utilisateurId: number) {
    return this.prisma.serveurTable.findMany({
      where: { utilisateurId, statut: 'ACTIF' },
      include: {
        table: true,
      },
    });
  }

  async findByTable(tableId: number) {
    return this.prisma.serveurTable.findFirst({
      where: { tableId, statut: 'ACTIF' },
      include: {
        utilisateur: { select: { id: true, nom: true, role: true } },
      },
    });
  }

  async assign(utilisateurId: number, tableId: number) {
    // Désactiver l'ancienne affectation si elle existe
    await this.prisma.serveurTable.updateMany({
      where: { tableId, statut: 'ACTIF' },
      data: { statut: 'INACTIF' },
    });

    // Créer la nouvelle affectation
    const assignation = await this.prisma.serveurTable.create({
      data: {
        utilisateurId,
        tableId,
        statut: 'ACTIF',
      },
    });

    // Mettre à jour le serveur sur la table
    await this.prisma.tableRestaurant.update({
      where: { id: tableId },
      data: { serveurId: utilisateurId },
    });

    return assignation;
  }

  async unassign(tableId: number) {
    await this.prisma.serveurTable.updateMany({
      where: { tableId, statut: 'ACTIF' },
      data: { statut: 'INACTIF' },
    });

    await this.prisma.tableRestaurant.update({
      where: { id: tableId },
      data: { serveurId: null },
    });
  }

  async reassign(fromServeurId: number, toServeurId: number, tableId?: number) {
    const where: any = { utilisateurId: fromServeurId, statut: 'ACTIF' };
    if (tableId) where.tableId = tableId;

    const assignments = await this.prisma.serveurTable.findMany({ where });

    for (const a of assignments) {
      await this.prisma.serveurTable.update({
        where: { id: a.id },
        data: { statut: 'INACTIF' },
      });

      await this.prisma.serveurTable.create({
        data: {
          utilisateurId: toServeurId,
          tableId: a.tableId,
          statut: 'ACTIF',
        },
      });

      await this.prisma.tableRestaurant.update({
        where: { id: a.tableId },
        data: { serveurId: toServeurId },
      });
    }

    return { reassigned: assignments.length };
  }

  // ======== Affectation Automatique ========

  async runDailyCheck(restaurantId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Trouver tous les serveurs actifs du restaurant
    const serveurs = await this.prisma.utilisateur.findMany({
      where: {
        restaurantId,
        role: 'SERVEUR',
        statut: { in: ['ACTIF', 'INACTIF'] },
      },
    });

    // 2. Vérifier le planning du jour pour chaque serveur
    const plannings = await this.prisma.planning.findMany({
      where: {
        jour: today,
        statut: 'ACTIF',
        utilisateur: { restaurantId, role: 'SERVEUR' },
      },
    });

    const plannedServeurIds = new Set(plannings.map((p) => p.utilisateurId));

    let deactivated = 0;
    let freed = 0;
    let redistributed = 0;

    // 3. Désactiver les serveurs non programmés
    for (const serveur of serveurs) {
      if (!plannedServeurIds.has(serveur.id) && serveur.statut === 'ACTIF') {
        await this.prisma.utilisateur.update({
          where: { id: serveur.id },
          data: { statut: 'INACTIF' },
        });
        deactivated++;

        // 4. Libérer les tables du serveur absent
        const assignments = await this.prisma.serveurTable.findMany({
          where: { utilisateurId: serveur.id, statut: 'ACTIF' },
        });

        for (const a of assignments) {
          await this.prisma.serveurTable.update({
            where: { id: a.id },
            data: { statut: 'INACTIF' },
          });
          await this.prisma.tableRestaurant.update({
            where: { id: a.tableId },
            data: { serveurId: null },
          });
          freed++;
        }
      }
    }

    // 5. Activer les serveurs programmés
    for (const serveur of serveurs) {
      if (plannedServeurIds.has(serveur.id) && serveur.statut === 'INACTIF') {
        await this.prisma.utilisateur.update({
          where: { id: serveur.id },
          data: { statut: 'ACTIF' },
        });
      }
    }

    // 6. Redistribuer les tables libérées aux serveurs actifs programmés
    const activeServeurs = await this.prisma.utilisateur.findMany({
      where: { restaurantId, role: 'SERVEUR', statut: 'ACTIF' },
    });

    if (activeServeurs.length > 0) {
      const freeTables = await this.prisma.tableRestaurant.findMany({
        where: { restaurantId, serveurId: null, statut: { not: 'OCCUPEE' } },
      });

      let idx = 0;
      for (const table of freeTables) {
        const serveur = activeServeurs[idx % activeServeurs.length];
        await this.prisma.serveurTable.create({
          data: {
            utilisateurId: serveur.id,
            tableId: table.id,
            statut: 'ACTIF',
          },
        });
        await this.prisma.tableRestaurant.update({
          where: { id: table.id },
          data: { serveurId: serveur.id },
        });
        idx++;
        redistributed++;
      }
    }

    // 7. Notifier les changements
    if (deactivated > 0 || redistributed > 0) {
      await this.notifyManagers(restaurantId, deactivated, freed, redistributed);
    }

    return {
      date: today.toISOString().split('T')[0],
      serveursVerifies: serveurs.length,
      serveursProgrammes: plannedServeurIds.size,
      desactives: deactivated,
      tablesLiberees: freed,
      tablesRedistribuees: redistributed,
    };
  }

  private async notifyManagers(
    restaurantId: number,
    deactivated: number,
    freed: number,
    redistributed: number,
  ) {
    const managers = await this.prisma.utilisateur.findMany({
      where: {
        restaurantId,
        role: { in: ['ADMIN', 'MANAGER'] },
        statut: 'ACTIF',
      },
    });

    for (const m of managers) {
      await this.prisma.notification.create({
        data: {
          utilisateurId: m.id,
          message: `Affectation auto: ${deactivated} serveur(s) absent(s), ${freed} table(s) libérée(s), ${redistributed} table(s) redistribuée(s)`,
        },
      });
    }
  }
}
