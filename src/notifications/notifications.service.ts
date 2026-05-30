import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private socketGateway: SocketGateway,
  ) {}

  async create(utilisateurId: number, message: string) {
    const notif = await this.prisma.notification.create({
      data: { utilisateurId, message },
    });

    // Emettre en temps reel vers l'utilisateur concerne
    this.socketGateway.notifierUtilisateur(utilisateurId, 'notification_user', {
      id: notif.id,
      message,
      dateNotification: notif.dateNotification,
    });

    return notif;
  }

  async findByUser(user: { id: number; role: string; restaurantId: number }, date?: string) {
    const isAdminOrManager = user.role === 'ADMIN' || user.role === 'MANAGER';

    const where: any = {};

    if (!isAdminOrManager) {
      where.utilisateurId = user.id;
    } else {
      where.utilisateur = { restaurantId: user.restaurantId };
    }

    // Filtrer par date seulement si une date valide est fournie
    if (date && !isNaN(new Date(date).getTime())) {
      const debut = new Date(date);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(date);
      fin.setHours(23, 59, 59, 999);
      where.dateNotification = { gte: debut, lte: fin };
    }

    return this.prisma.notification.findMany({
      where,
      include: {
        utilisateur: { select: { id: true, nom: true, role: true } },
      },
      orderBy: { dateNotification: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: number) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { lu: true },
    });
  }

  async markAllAsRead(utilisateurId: number) {
    return this.prisma.notification.updateMany({
      where: { utilisateurId, lu: false },
      data: { lu: true },
    });
  }
}
