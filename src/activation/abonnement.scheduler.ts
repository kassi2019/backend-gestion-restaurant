import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AbonnementScheduler {
  private readonly logger = new Logger(AbonnementScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // Vérifier toutes les heures
  @Cron('0 * * * *')
  async verifierAbonnements() {
    this.logger.log('Vérification des abonnements...');

    const maintenant = new Date();

    // Récupérer tous les restaurants avec abonnement non expiré
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        dateFinAbonnement: { gt: maintenant },
      },
      include: {
        utilisateurs: {
          where: { statut: 'ACTIF' },
          select: { id: true, role: true },
        },
      },
    });

    for (const resto of restaurants) {
      if (!resto.dateFinAbonnement || resto.utilisateurs.length === 0) continue;

      const joursRestants = Math.ceil(
        (resto.dateFinAbonnement.getTime() - maintenant.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Déterminer la durée totale selon le type d'abonnement
      const dureeTotale = this.getDureeTotale(resto.typeAbonnement);
      const pourcentageRestant = (joursRestants / dureeTotale) * 100;

      // Fréquence de notification
      let intervalleHeures = 24; // > 50% : toutes les 24h
      if (pourcentageRestant <= 50) {
        intervalleHeures = 3; // ≤ 50% : toutes les 3h
      }

      // Vérifier si on doit notifier maintenant
      if (!this.peutNotifier(resto.derniereNotifAbonnement, intervalleHeures)) {
        continue;
      }

      // Envoyer notification à tous les utilisateurs du restaurant
      const message =
        pourcentageRestant <= 50
          ? `⚠️ Attention ! Votre abonnement expire dans ${joursRestants} jour(s). Contactez l'administrateur.`
          : `📅 Votre abonnement expire dans ${joursRestants} jour(s). Pensez à le renouveler.`;

      for (const user of resto.utilisateurs) {
        try {
          await this.notificationsService.create(user.id, message);
        } catch {
          // ignorer les erreurs individuelles
        }
      }

      // Mettre à jour la date de dernière notification
      await this.prisma.restaurant.update({
        where: { id: resto.id },
        data: { derniereNotifAbonnement: maintenant },
      });

      this.logger.log(
        `Notif envoyée au restaurant "${resto.nom}" : ${resto.utilisateurs.length} utilisateurs, ${joursRestants}j restants, intervalle ${intervalleHeures}h`,
      );
    }
  }

  private getDureeTotale(type: string): number {
    switch (type) {
      case 'TRIAL':
        return 14;
      case 'MENSUEL':
        return 30;
      case 'ANNUEL':
        return 365;
      default:
        return 30;
    }
  }

  private peutNotifier(
    derniereNotif: Date | null,
    intervalleHeures: number,
  ): boolean {
    if (!derniereNotif) return true; // jamais notifié
    const maintenant = new Date();
    const diffMs = maintenant.getTime() - new Date(derniereNotif).getTime();
    const diffHeures = diffMs / (1000 * 60 * 60);
    return diffHeures >= intervalleHeures;
  }
}
