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

    // Libérer la table seulement s'il n'y a plus de commandes actives
    // Une commande active = validée par le serveur et non payée, non annulée
    // Les EN_ATTENTE ne comptent pas (pas encore validées par le serveur)
    const commandesActives = await this.prisma.commande.count({
      where: {
        tableId: commande.tableId,
        statutPaiement: 'NON_PAYEE',
        statut: { notIn: ['ANNULEE', 'EN_ATTENTE'] },
      },
    });
    if (commandesActives === 0) {
      await this.prisma.tableRestaurant.update({
        where: { id: commande.tableId },
        data: { statut: 'LIBRE' },
      });
    }

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
        id: facture.id,
        numero: facture.numero,
        table: commande.table.numero,
        montant: Number(facture.montantTotal),
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
            table: { include: { restaurant: { select: { nom: true, adresse: true, devise: true } } } },
            details: { include: { menu: true } },
            serveur: { select: { nom: true } },
          },
        },
        caissier: { select: { nom: true } },
      },
    });
  }

  async getFactureForPrint(id: number) {
    const facture = await this.getFactureById(id);
    if (!facture) return null;

    const resto = facture.commande.table.restaurant;
    const cmd = facture.commande;
    const articles = cmd.details.map((d) => ({
      quantite: d.quantite,
      nom: d.menu?.nom || 'Plat',
      prix: Number(d.prix),
      total: Number(d.prix) * d.quantite,
    }));

    return {
      numero: facture.numero,
      date: facture.dateFacture,
      restaurant: { nom: resto.nom, adresse: resto.adresse, devise: resto.devise },
      table: cmd.table.numero,
      serveur: cmd.serveur?.nom || '-',
      caissier: facture.caissier?.nom || '-',
      modePaiement: facture.modePaiement === 'ESPECES' ? 'Espèces' : facture.modePaiement === 'MOBILE_MONEY' ? 'Mobile Money' : 'Carte Bancaire',
      articles,
      total: Number(facture.montantTotal),
    };
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
    const caisse = await this.getCaisseJourCaissier(restaurantId, caissierId);

    // Enregistrer la clôture en base
    await this.prisma.clotureCaisse.create({
      data: {
        caissierId,
        totalEspeces: caisse.details.totalEspeces,
        totalMobile: caisse.details.totalMobileMoney,
        totalCarte: caisse.details.totalCarte,
        totalGeneral: caisse.totalGeneral,
        nbFactures: caisse.nombreFactures,
        type: 'CAISSIER',
        restaurantId,
      },
    });

    return { ...caisse, cloture: new Date().toISOString(), caissierId, statut: 'CLOTUREE' };
  }

  async getCaisseJourCaissier(restaurantId: number, caissierId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Dernière clôture de ce caissier aujourd'hui
    const derniereCloture = await this.prisma.clotureCaisse.findFirst({
      where: { caissierId, dateCloture: { gte: today, lt: tomorrow }, type: 'CAISSIER' },
      orderBy: { dateCloture: 'desc' },
    });

    const dateDebut = derniereCloture?.dateCloture || today;

    const factures = await this.prisma.facture.findMany({
      where: {
        dateFacture: { gte: dateDebut, lt: tomorrow },
        caissierId,
        commande: { table: { restaurantId } },
      },
      include: { commande: true },
    });

    const totalEspeces = factures.filter((f) => f.modePaiement === 'ESPECES').reduce((s, f) => s + Number(f.montantTotal), 0);
    const totalMobileMoney = factures.filter((f) => f.modePaiement === 'MOBILE_MONEY').reduce((s, f) => s + Number(f.montantTotal), 0);
    const totalCarte = factures.filter((f) => f.modePaiement === 'CARTE_BANCAIRE').reduce((s, f) => s + Number(f.montantTotal), 0);

    return {
      date: today.toISOString().split('T')[0],
      depuis: dateDebut.toISOString(),
      nombreFactures: factures.length,
      totalGeneral: factures.reduce((s, f) => s + Number(f.montantTotal), 0),
      details: { totalEspeces, totalMobileMoney, totalCarte },
    };
  }

  async cloturerCaisseGlobale(restaurantId: number, adminId: number, dateReouverture: string) {
    // Enregistrer la clôture globale
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const factures = await this.prisma.facture.findMany({
      where: { dateFacture: { gte: today, lt: tomorrow }, commande: { table: { restaurantId } } },
    });

    const totalEspeces = factures.filter((f) => f.modePaiement === 'ESPECES').reduce((s, f) => s + Number(f.montantTotal), 0);
    const totalMobileMoney = factures.filter((f) => f.modePaiement === 'MOBILE_MONEY').reduce((s, f) => s + Number(f.montantTotal), 0);
    const totalCarte = factures.filter((f) => f.modePaiement === 'CARTE_BANCAIRE').reduce((s, f) => s + Number(f.montantTotal), 0);

    await this.prisma.clotureCaisse.create({
      data: {
        caissierId: adminId,
        totalEspeces,
        totalMobile: totalMobileMoney,
        totalCarte,
        totalGeneral: factures.reduce((s, f) => s + Number(f.montantTotal), 0),
        nbFactures: factures.length,
        type: 'GLOBAL',
        restaurantId,
      },
    });

    // Fermer le restaurant jusqu'à la date de réouverture
    const dateReouv = new Date(dateReouverture);
    if (isNaN(dateReouv.getTime())) {
      throw new BadRequestException('Date de réouverture invalide. Format attendu: YYYY-MM-DDTHH:mm');
    }

    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { statut: 'FERME', dateReouverture: dateReouv },
    });

    return {
      message: 'Restaurant fermé. Réouverture prévue le ' + dateReouverture,
      dateReouverture,
    };
  }

  async verifierOuverture(restaurantId: number) {
    const resto = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!resto) return true;
    if (resto.statut === 'OUVERT') return true;
    if (resto.dateReouverture && new Date() >= resto.dateReouverture) {
      // Réouverture automatique
      await this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: { statut: 'OUVERT', dateReouverture: null },
      });
      return true;
    }
    return false;
  }

  async getHistoriqueClotures(restaurantId: number, date?: string) {
    const where: any = { restaurantId };
    if (date) {
      const debut = new Date(date);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(date);
      fin.setHours(23, 59, 59, 999);
      where.dateCloture = { gte: debut, lte: fin };
    }
    return this.prisma.clotureCaisse.findMany({
      where,
      include: { caissier: { select: { nom: true } } },
      orderBy: { dateCloture: 'desc' },
    });
  }
}
