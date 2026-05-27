import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(utilisateurId: number, message: string) {
    return this.prisma.notification.create({
      data: { utilisateurId, message },
    });
  }

  async findByUser(user: { id: number; role: string; restaurantId: number }, date: string) {
    const isAdminOrManager = user.role === 'ADMIN' || user.role === 'MANAGER';

    const where: any = {};

    if (!isAdminOrManager) {
      where.utilisateurId = user.id;
    } else {
      where.utilisateur = { restaurantId: user.restaurantId };
    }

    const debut = new Date(date);
    debut.setHours(0, 0, 0, 0);
    const fin = new Date(date);
    fin.setHours(23, 59, 59, 999);
    where.dateNotification = { gte: debut, lte: fin };

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
