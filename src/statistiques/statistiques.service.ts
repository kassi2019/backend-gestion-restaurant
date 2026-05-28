import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function parseDateRange(dateDebut?: string, dateFin?: string) {
  const debut = dateDebut ? new Date(dateDebut) : new Date();
  debut.setHours(0, 0, 0, 0);
  const fin = dateFin ? new Date(dateFin) : new Date();
  fin.setHours(23, 59, 59, 999);
  return { debut, fin };
}

@Injectable()
export class StatistiquesService {
  constructor(private prisma: PrismaService) {}

  async getVentes(restaurantId: number, dateDebut?: string, dateFin?: string) {
    const { debut, fin } = parseDateRange(dateDebut, dateFin);
    const where: any = {
      table: { restaurantId },
      statutPaiement: 'PAYEE',
      datePaiement: { gte: debut, lte: fin },
    };
    const commandes = await this.prisma.commande.findMany({
      where,
      include: { details: { include: { menu: true } } },
    });
    const total = commandes.reduce((s, c) => s + Number(c.montantTotal), 0);
    return { nombreCommandes: commandes.length, chiffreAffaires: total, commandes };
  }

  async getPlatsPopulaires(restaurantId: number, limit = 10, dateDebut?: string, dateFin?: string) {
    const { debut, fin } = parseDateRange(dateDebut, dateFin);
    const details = await this.prisma.commandeDetail.findMany({
      where: {
        commande: {
          table: { restaurantId },
          statutPaiement: 'PAYEE',
          datePaiement: { gte: debut, lte: fin },
        },
      },
      include: { menu: { select: { nom: true, prix: true } } },
    });

    const stats: Record<number, { nom: string; quantite: number; montant: number }> = {};
    for (const d of details) {
      if (!stats[d.menuId]) stats[d.menuId] = { nom: d.menu.nom, quantite: 0, montant: 0 };
      stats[d.menuId].quantite += d.quantite;
      stats[d.menuId].montant += Number(d.prix) * d.quantite;
    }

    return Object.values(stats)
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, limit);
  }

  async getPerformanceServeurs(restaurantId: number, dateDebut?: string, dateFin?: string) {
    const { debut, fin } = parseDateRange(dateDebut, dateFin);

    // Serveurs qui ont un planning dans la période
    const plannings = await this.prisma.planning.findMany({
      where: {
        utilisateur: { restaurantId, role: 'SERVEUR' },
        jour: { gte: debut, lte: fin },
      },
      select: { utilisateurId: true },
    });
    const serveursAvecPlanning = [...new Set(plannings.map((p) => p.utilisateurId))];

    const serveurs = await this.prisma.utilisateur.findMany({
      where: { restaurantId, role: 'SERVEUR', id: { in: serveursAvecPlanning } },
      select: { id: true, nom: true },
    });

    const result = [];
    for (const s of serveurs) {
      const commandes = await this.prisma.commande.findMany({
        where: {
          serveurId: s.id,
          statutPaiement: 'PAYEE',
          datePaiement: { gte: debut, lte: fin },
        },
      });
      result.push({
        nom: s.nom,
        commandes: commandes.length,
        chiffreAffaires: commandes.reduce((sum, c) => sum + Number(c.montantTotal), 0),
      });
    }
    return result.sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);
  }

  async getAffluence(restaurantId: number, dateDebut?: string, dateFin?: string) {
    const { debut, fin } = parseDateRange(dateDebut, dateFin);
    const commandes = await this.prisma.commande.findMany({
      where: {
        table: { restaurantId },
        dateCommande: { gte: debut, lte: fin },
      },
      select: { dateCommande: true },
    });

    const heures: Record<number, number> = {};
    for (const c of commandes) {
      const h = new Date(c.dateCommande).getHours();
      heures[h] = (heures[h] || 0) + 1;
    }

    return Object.entries(heures)
      .map(([heure, count]) => ({ heure: `${heure}h`, commandes: count }))
      .sort((a, b) => parseInt(a.heure) - parseInt(b.heure));
  }

  async getDashboard(restaurantId: number, dateDebut?: string, dateFin?: string) {
    const { debut, fin } = parseDateRange(dateDebut, dateFin);

    const [ventesJour, commandesJour, tables, serveurs, plats] = await Promise.all([
      this.prisma.commande.aggregate({
        where: {
          table: { restaurantId },
          dateCommande: { gte: debut, lte: fin },
          statutPaiement: 'PAYEE',
        },
        _sum: { montantTotal: true },
      }),
      this.prisma.commande.count({
        where: { table: { restaurantId }, dateCommande: { gte: debut, lte: fin } },
      }),
      this.prisma.tableRestaurant.count({ where: { restaurantId } }),
      this.prisma.utilisateur.count({ where: { restaurantId, role: 'SERVEUR', statut: 'ACTIF' } }),
      this.getPlatsPopulaires(restaurantId, 5, dateDebut, dateFin),
    ]);

    const commandesPayees = await this.prisma.commande.aggregate({
      where: {
        table: { restaurantId },
        dateCommande: { gte: debut, lte: fin },
        statutPaiement: 'PAYEE',
      },
      _avg: { montantTotal: true },
    });

    return {
      chiffreAffairesJour: Number(ventesJour._sum.montantTotal || 0),
      commandesJour,
      totalTables: tables,
      serveursActifs: serveurs,
      panierMoyen: Number(commandesPayees._avg.montantTotal || 0),
      topPlats: plats,
      debut,
      fin,
    };
  }
}
