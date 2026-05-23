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

  async findByUser(utilisateurId: number) {
    return this.prisma.notification.findMany({
      where: { utilisateurId },
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
