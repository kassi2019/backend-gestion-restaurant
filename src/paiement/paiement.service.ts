import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModePaiement } from '@prisma/client';
import { SocketGateway } from '../socket/socket.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaiementService {
  constructor(
    private prisma: PrismaService,
    private socketGateway: SocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  async payerCommande(commandeId: number, mode: ModePaiement, caissierId: number) {
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: { table: { include: { restaurant: { select: { devise: true } } } } },
    });

    if (!commande) throw new BadRequestException('Commande introuvable');
    if (commande.statutPaiement === 'PAYEE') throw new BadRequestException('Commande déjà payée');

    // Mettre à jour la commande
    await this.prisma.commande.update({
      where: { id: commandeId },
      data: {
        statut: 'PAYEE',
        statutPaiement: 'PAYEE',
        modePaiement: mode,
        datePaiement: new Date(),
        caissierId,
      },
    });

    // Générer une facture
    const numero = `FAC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${commandeId.toString().padStart(4, '0')}`;
    const facture = await this.prisma.facture.create({
      data: {
        numero,
        commandeId,
        montantTotal: commande.montantTotal,
        modePaiement: mode,
        caissierId,
      },
    });

    // Libérer la table
    await this.prisma.tableRestaurant.update({
      where: { id: commande.tableId },
      data: { statut: 'LIBRE' },
    });

    // 🔔 Notifications
    if (commande.serveurId) {
      await this.notificationsService.create(
        commande.serveurId,
        `Paiement reçu table ${commande.table.numero} — ${Number(commande.montantTotal).toFixed(2)} ${commande.table.restaurant?.devise || '€'}`,
      );
    }
    this.socketGateway.notifierAdmin({
      type: 'paiement',
      table: commande.table.numero,
      montant: Number(commande.montantTotal),
      mode,
    });

    return {
      message: 'Paiement effectué avec succès',
      facture: {
        numero: facture.numero,
        table: commande.table.numero,
        montant: Number(commande.montantTotal),
        mode,
        date: facture.dateFacture,
      },
    };
  }

  async getCommandesAPayer(restaurantId: number) {
    return this.prisma.commande.findMany({
      where: {
        table: { restaurantId },
        statutPaiement: 'NON_PAYEE',
        statut: { in: ['SERVIE', 'PRETE'] },
      },
      include: {
        table: { select: { numero: true } },
        details: { include: { menu: { select: { nom: true } } } },
      },
      orderBy: { dateCommande: 'asc' },
    });
  }

  async getFactures(restaurantId: number, date?: string) {
    const where: any = {
      commande: { table: { restaurantId } },
    };
    if (date) {
      const debut = new Date(date);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(date);
      fin.setHours(23, 59, 59, 999);
      where.dateFacture = { gte: debut, lte: fin };
    }
    return this.prisma.facture.findMany({
      where,
      include: {
        commande: {
          include: {
            table: { select: { numero: true } },
            details: { include: { menu: { select: { nom: true } } } },
          },
        },
        caissier: { select: { nom: true } },
      },
      orderBy: { dateFacture: 'desc' },
    });
  }

  async getFactureById(id: number) {
    return this.prisma.facture.findUnique({
      where: { id },
      include: {
        commande: {
          include: {
            table: true,
            details: { include: { menu: true } },
            serveur: { select: { nom: true } },
          },
        },
        caissier: { select: { nom: true } },
      },
    });
  }

  async getCaisseJour(restaurantId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const factures = await this.prisma.facture.findMany({
      where: {
        dateFacture: { gte: today, lt: tomorrow },
        commande: { table: { restaurantId } },
      },
      include: { commande: true },
    });

    const totalEspeces = factures
      .filter((f) => f.modePaiement === 'ESPECES')
      .reduce((sum, f) => sum + Number(f.montantTotal), 0);
    const totalMobileMoney = factures
      .filter((f) => f.modePaiement === 'MOBILE_MONEY')
      .reduce((sum, f) => sum + Number(f.montantTotal), 0);
    const totalCarte = factures
      .filter((f) => f.modePaiement === 'CARTE_BANCAIRE')
      .reduce((sum, f) => sum + Number(f.montantTotal), 0);

    return {
      date: today.toISOString().split('T')[0],
      nombreFactures: factures.length,
      totalGeneral: factures.reduce((sum, f) => sum + Number(f.montantTotal), 0),
      details: { totalEspeces, totalMobileMoney, totalCarte },
    };
  }

  async cloturerCaisse(restaurantId: number, caissierId: number) {
    const caisse = await this.getCaisseJour(restaurantId);
    return { ...caisse, cloture: new Date().toISOString(), caissierId, statut: 'CLOTUREE' };
  }
}
