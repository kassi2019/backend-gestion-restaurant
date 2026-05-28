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
      include: { restaurant: { select: { devise: true } } },
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

    // La table sera passée à OCCUPEE lors de la validation par le serveur

    // Notification socket : serveur assigné + admins/managers
    const label = `Nouvelle commande sur table ${table.numero} — ${Number(commande.montantTotal).toFixed(2)} ${table.restaurant?.devise || '€'}`;
    if (table.serveurId) {
      this.socketGateway.notifierNouvelleCommande(table.serveurId, commande);
      await this.notificationsService.create(table.serveurId, label);
    }
    // Toujours notifier les admins/managers
    this.socketGateway.server.to('admin').emit('nouvelle_commande', commande);

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
        session: { select: { id: true, sessionKey: true, dateArrivee: true } },
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
        serveur: { select: { id: true, nom: true, role: true } },
        session: { select: { id: true, sessionKey: true, dateArrivee: true } },
      },
      orderBy: { dateCommande: 'desc' },
    });
  }

  async findByTable(tableId: number) {
    return this.prisma.commande.findMany({
      where: { tableId },
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
        statut: { notIn: ['EN_ATTENTE', 'ANNULEE', 'PAYEE', 'SERVIE'] },
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
        statut: { notIn: ['EN_ATTENTE', 'ANNULEE', 'PAYEE', 'SERVIE'] },
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
      include: { table: { include: { restaurant: { select: { devise: true } } } }, serveur: true },
    });

    const updated = await this.prisma.commande.update({
      where: { id: commandeId },
      data: { statut },
    });

    // Table → OCCUPEE quand le serveur valide
    if (statut === 'VALIDEE' && commande?.tableId) {
      await this.prisma.tableRestaurant.update({
        where: { id: commande.tableId },
        data: { statut: 'OCCUPEE' },
      });
    }

    // Notifications DB + Socket
    if (commande?.serveurId) {
      const label = {
        VALIDEE: 'validée', EN_PREPARATION: 'en préparation',
        PRETE: 'prête', SERVIE: 'servie', ANNULEE: 'annulée',
      }[statut] || statut;
      const message = `Commande table ${commande.table.numero} → ${label}`;
      await this.notificationsService.create(commande.serveurId, message);

      // Socket: serveur en temps réel
      this.socketGateway.server
        .to(`serveur:${commande.serveurId}`)
        .emit('commande_status_change', {
          commandeId, tableNumero: commande.table.numero,
          statut, label, message,
        });

      // Socket: admins/managers
      this.socketGateway.server
        .to('admin')
        .emit('commande_status_change', {
          commandeId, tableNumero: commande.table.numero,
          statut, label, serveurNom: commande.serveur?.nom, message,
        });

      // Quand le serveur valide → notifier cuisine/bar en temps reel
      if (statut === 'VALIDEE') {
        const cmd = await this.prisma.commande.findUnique({
          where: { id: commandeId },
          include: { details: { include: { menu: { include: { categorie: true } } } }, table: true },
        });
        if (cmd) {
          const aCuisine = cmd.details.some((d: any) =>
            ['CUISINE', 'DESSERT'].includes(d.menu?.categorie?.destination),
          );
          const aBar = cmd.details.some((d: any) =>
            d.menu?.categorie?.destination === 'BAR',
          );

          const devise = commande?.table?.restaurant?.devise || '€';
          const total = Number(cmd.montantTotal).toFixed(2);

          if (aCuisine) {
            this.socketGateway.notifierCuisine(cmd);
            // Notifier tous les utilisateurs cuisine du restaurant
            const cuisineUsers = await this.prisma.utilisateur.findMany({
              where: { restaurantId: commande.table.restaurantId, role: 'CUISINE', statut: 'ACTIF' },
              select: { id: true },
            });
            for (const u of cuisineUsers) {
              await this.notificationsService.create(
                u.id,
                `🍳 Nouvelle commande cuisine — Table ${cmd.table.numero} — ${total} ${devise}`,
              );
            }
          }
          if (aBar) {
            this.socketGateway.notifierBar(cmd);
            // Notifier tous les utilisateurs bar du restaurant
            const barUsers = await this.prisma.utilisateur.findMany({
              where: { restaurantId: commande.table.restaurantId, role: 'BAR', statut: 'ACTIF' },
              select: { id: true },
            });
            for (const u of barUsers) {
              await this.notificationsService.create(
                u.id,
                `🍹 Nouvelle commande bar — Table ${cmd.table.numero} — ${total} ${devise}`,
              );
            }
          }
        }
      }
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

  async getStats(restaurantId: number, userId: number, role: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

    const where: any = {
      table: { restaurantId },
      dateCommande: { gte: today, lt: tomorrow },
    };

    if (!isAdminOrManager && role === 'SERVEUR') {
      where.serveurId = userId;
    }

    const commandes = await this.prisma.commande.findMany({
      where,
      select: { statut: true },
    });

    const stats: Record<string, number> = {
      EN_ATTENTE: 0, VALIDEE: 0, EN_PREPARATION: 0,
      PRETE: 0, SERVIE: 0, PAYEE: 0, ANNULEE: 0,
    };

    for (const c of commandes) {
      if (stats[c.statut] !== undefined) stats[c.statut]++;
    }

    let totalTables = 0;
    if (isAdminOrManager) {
      totalTables = await this.prisma.tableRestaurant.count({ where: { restaurantId } });
    } else if (role === 'SERVEUR') {
      totalTables = await this.prisma.tableRestaurant.count({
        where: { restaurantId, serveurId: userId },
      });
    }

    return {
      totalTables,
      totalCommandes: commandes.length,
      enAttente: stats.EN_ATTENTE,
      validees: stats.VALIDEE,
      enPreparation: stats.EN_PREPARATION,
      pretes: stats.PRETE,
      servies: stats.SERVIE,
      payees: stats.PAYEE,
      annulees: stats.ANNULEE,
    };
  }
}
