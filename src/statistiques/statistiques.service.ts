import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatistiquesService {
  constructor(private prisma: PrismaService) {}

  async getVentes(restaurantId: number, dateDebut?: string, dateFin?: string) {
    const where: any = {
      table: { restaurantId },
      statutPaiement: 'PAYEE',
    };
    if (dateDebut) {
      where.datePaiement = {
        gte: new Date(dateDebut),
        lte: dateFin ? new Date(dateFin) : new Date(),
      };
    }
    const commandes = await this.prisma.commande.findMany({
      where,
      include: { details: { include: { menu: true } } },
    });
    const total = commandes.reduce((s, c) => s + Number(c.montantTotal), 0);
    return { nombreCommandes: commandes.length, chiffreAffaires: total, commandes };
  }

  async getPlatsPopulaires(restaurantId: number, limit = 10) {
    const details = await this.prisma.commandeDetail.findMany({
      where: {
        commande: { table: { restaurantId }, statutPaiement: 'PAYEE' },
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

  async getPerformanceServeurs(restaurantId: number) {
    const serveurs = await this.prisma.utilisateur.findMany({
      where: { restaurantId, role: 'SERVEUR' },
      select: { id: true, nom: true },
    });

    const result = [];
    for (const s of serveurs) {
      const commandes = await this.prisma.commande.findMany({
        where: { serveurId: s.id, statutPaiement: 'PAYEE' },
      });
      result.push({
        nom: s.nom,
        commandes: commandes.length,
        chiffreAffaires: commandes.reduce((sum, c) => sum + Number(c.montantTotal), 0),
      });
    }
    return result.sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);
  }

  async getAffluence(restaurantId: number) {
    const commandes = await this.prisma.commande.findMany({
      where: { table: { restaurantId } },
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

  async getDashboard(restaurantId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ventesJour, commandesJour, tables, serveurs, plats] = await Promise.all([
      this.prisma.commande.aggregate({
        where: { table: { restaurantId }, dateCommande: { gte: today }, statutPaiement: 'PAYEE' },
        _sum: { montantTotal: true },
      }),
      this.prisma.commande.count({
        where: { table: { restaurantId }, dateCommande: { gte: today } },
      }),
      this.prisma.tableRestaurant.count({ where: { restaurantId } }),
      this.prisma.utilisateur.count({ where: { restaurantId, role: 'SERVEUR', statut: 'ACTIF' } }),
      this.getPlatsPopulaires(restaurantId, 5),
    ]);

    return {
      chiffreAffairesJour: Number(ventesJour._sum.montantTotal || 0),
      commandesJour,
      totalTables: tables,
      serveursActifs: serveurs,
      topPlats: plats,
    };
  }
}
