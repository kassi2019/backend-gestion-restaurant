import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatutCommande, StatutPreparation } from '@prisma/client';
import { SocketGateway } from '../socket/socket.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommandesService {
  constructor(
    private prisma: PrismaService,
    private socketGateway: SocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  async createFromClient(data: {
    tableId: number;
    sessionKey?: string;
    clientRef?: string;
    articles: { menuId: number; quantite: number }[];
  }) {
    const table = await this.prisma.tableRestaurant.findUnique({
      where: { id: data.tableId },
    });

    if (!table) {
      throw new Error('Table introuvable');
    }

    // Auto-create or find session
    let session;
    if (data.sessionKey) {
      session = await this.prisma.sessionClient.findUnique({
        where: { sessionKey: data.sessionKey },
      });
    }
    if (!session) {
      const key = `TB${data.tableId}-${Date.now().toString(36).toUpperCase()}`;
      session = await this.prisma.sessionClient.create({
        data: {
          sessionKey: key,
          tableId: data.tableId,
          statut: 'ACTIVE',
        },
      });
    }

    let montantTotal = 0;
    const detailsData = [];

    for (const article of data.articles) {
      const menu = await this.prisma.menu.findUnique({
        where: { id: article.menuId },
      });
      if (menu) {
        const sousTotal = Number(menu.prix) * article.quantite;
        montantTotal += sousTotal;
        detailsData.push({
          menuId: article.menuId,
          quantite: article.quantite,
          prix: menu.prix,
        });
      }
    }

    const commande = await this.prisma.commande.create({
      data: {
        tableId: data.tableId,
        serveurId: table.serveurId,
        sessionId: session.id,
        clientRef: data.clientRef || null,
        montantTotal,
        details: {
          create: detailsData,
        },
      },
      include: {
        details: {
          include: { menu: true },
        },
        table: true,
        session: true,
      },
    });

    // Update table status to OCCUPEE
    await this.prisma.tableRestaurant.update({
      where: { id: data.tableId },
      data: { statut: 'OCCUPEE' },
    });

    // 🔔 Notifications
    if (table.serveurId) {
      this.socketGateway.notifierNouvelleCommande(table.serveurId, commande);
      await this.notificationsService.create(
        table.serveurId,
        `Nouvelle commande sur table ${table.numero} — ${Number(commande.montantTotal).toFixed(2)} €`,
      );
    }
    // Router vers cuisine/bar selon les articles
    const aCuisine = commande.details.some((d: any) =>
      ['CUISINE', 'DESSERT'].includes(d.menu?.categorie?.destination),
    );
    const aBar = commande.details.some((d: any) =>
      d.menu?.categorie?.destination === 'BAR',
    );
    if (aCuisine) this.socketGateway.notifierCuisine(commande);
    if (aBar) this.socketGateway.notifierBar(commande);

    return commande;
  }

  async findAllByRestaurant(restaurantId: number) {
    return this.prisma.commande.findMany({
      where: {
        table: { restaurantId },
      },
      include: {
        details: { include: { menu: true } },
        table: true,
        serveur: { select: { id: true, nom: true } },
      },
      orderBy: { dateCommande: 'desc' },
    });
  }

  async findByServeur(serveurId: number) {
    return this.prisma.commande.findMany({
      where: { serveurId },
      include: {
        details: { include: { menu: true } },
        table: true,
      },
      orderBy: { dateCommande: 'desc' },
    });
  }

  async findByCuisine(restaurantId: number) {
    const commandes = await this.prisma.commande.findMany({
      where: {
        table: { restaurantId },
      },
      include: {
        details: {
          where: {
            menu: { categorie: { destination: { in: ['CUISINE', 'DESSERT'] } } },
          },
          include: { menu: true },
        },
        table: true,
      },
      orderBy: { dateCommande: 'asc' },
    });
    return commandes.filter((c) => c.details.length > 0);
  }

  async findByBar(restaurantId: number) {
    const commandes = await this.prisma.commande.findMany({
      where: {
        table: { restaurantId },
      },
      include: {
        details: {
          where: {
            menu: { categorie: { destination: 'BAR' } },
          },
          include: { menu: true },
        },
        table: true,
      },
      orderBy: { dateCommande: 'asc' },
    });
    return commandes.filter((c) => c.details.length > 0);
  }

  async updateStatut(commandeId: number, statut: StatutCommande) {
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: { table: true, serveur: true },
    });

    const updated = await this.prisma.commande.update({
      where: { id: commandeId },
      data: { statut },
    });

    // 🔔 Notification au serveur
    if (commande?.serveurId) {
      const label = {
        VALIDEE: 'validée', EN_PREPARATION: 'en préparation',
        PRETE: 'prête', SERVIE: 'servie', ANNULEE: 'annulée',
      }[statut] || statut;
      await this.notificationsService.create(
        commande.serveurId,
        `Commande table ${commande.table.numero} → ${label}`,
      );
    }

    return updated;
  }

  async updateDetailStatut(detailId: number, statut: StatutPreparation) {
    return this.prisma.commandeDetail.update({
      where: { id: detailId },
      data: { statutPreparation: statut },
    });
  }

  async findBySession(sessionId: number) {
    return this.prisma.commande.findMany({
      where: { sessionId },
      include: {
        details: { include: { menu: true } },
      },
      orderBy: { dateCommande: 'desc' },
    });
  }

  async findBySessionKey(sessionKey: string) {
    const session = await this.prisma.sessionClient.findUnique({
      where: { sessionKey },
    });
    if (!session) return [];
    return this.prisma.commande.findMany({
      where: { sessionId: session.id },
      include: {
        details: { include: { menu: true } },
        table: { select: { numero: true } },
      },
      orderBy: { dateCommande: 'desc' },
    });
  }
}
