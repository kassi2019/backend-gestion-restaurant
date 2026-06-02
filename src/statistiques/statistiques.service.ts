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

  async getPerformanceCaissiers(restaurantId: number, dateDebut?: string, dateFin?: string) {
    const { debut, fin } = parseDateRange(dateDebut, dateFin);

    const caissiers = await this.prisma.utilisateur.findMany({
      where: { restaurantId, role: 'CAISSIER' },
      select: { id: true, nom: true },
    });

    const result = [];
    for (const c of caissiers) {
      const factures = await this.prisma.facture.findMany({
        where: {
          caissierId: c.id,
          dateFacture: { gte: debut, lte: fin },
        },
      });
      const totalEspeces = factures.filter((f) => f.modePaiement === 'ESPECES').reduce((s, f) => s + Number(f.montantTotal), 0);
      const totalMobile = factures.filter((f) => f.modePaiement === 'MOBILE_MONEY').reduce((s, f) => s + Number(f.montantTotal), 0);
      const totalCarte = factures.filter((f) => f.modePaiement === 'CARTE_BANCAIRE').reduce((s, f) => s + Number(f.montantTotal), 0);

      result.push({
        nom: c.nom,
        factures: factures.length,
        chiffreAffaires: factures.reduce((s, f) => s + Number(f.montantTotal), 0),
        especes: totalEspeces,
        mobile: totalMobile,
        carte: totalCarte,
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

  async getVentesParJour(restaurantId: number, dateDebut?: string, dateFin?: string) {
    const { debut, fin } = parseDateRange(dateDebut, dateFin);
    const commandes = await this.prisma.commande.findMany({
      where: {
        table: { restaurantId },
        statutPaiement: 'PAYEE',
        datePaiement: { gte: debut, lte: fin },
      },
      select: { montantTotal: true, datePaiement: true, modePaiement: true },
    });

    const jours: Record<string, { total: number; especes: number; mobile: number; carte: number; nb: number }> = {};
    for (const c of commandes) {
      const jour = c.datePaiement ? new Date(c.datePaiement).toISOString().split('T')[0] : '?';
      if (!jours[jour]) jours[jour] = { total: 0, especes: 0, mobile: 0, carte: 0, nb: 0 };
      jours[jour].total += Number(c.montantTotal);
      jours[jour].nb += 1;
      if (c.modePaiement === 'ESPECES') jours[jour].especes += Number(c.montantTotal);
      else if (c.modePaiement === 'MOBILE_MONEY') jours[jour].mobile += Number(c.montantTotal);
      else if (c.modePaiement === 'CARTE_BANCAIRE') jours[jour].carte += Number(c.montantTotal);
    }

    return Object.entries(jours).map(([date, val]) => ({ date, ...val })).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getVentesParMois(restaurantId: number, dateDebut?: string, dateFin?: string) {
    const { debut, fin } = parseDateRange(dateDebut, dateFin);
    const commandes = await this.prisma.commande.findMany({
      where: {
        table: { restaurantId },
        statutPaiement: 'PAYEE',
        datePaiement: { gte: debut, lte: fin },
      },
      select: { montantTotal: true, datePaiement: true },
    });

    const mois: Record<string, { total: number; nb: number }> = {};
    for (const c of commandes) {
      const d = c.datePaiement ? new Date(c.datePaiement) : new Date();
      const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!mois[cle]) mois[cle] = { total: 0, nb: 0 };
      mois[cle].total += Number(c.montantTotal);
      mois[cle].nb += 1;
    }

    return Object.entries(mois).map(([mois, val]) => ({ mois, ...val })).sort((a, b) => a.mois.localeCompare(b.mois));
  }

  async getMargeBrute(restaurantId: number, dateDebut?: string, dateFin?: string) {
    const { debut, fin } = parseDateRange(dateDebut, dateFin);
    const details = await this.prisma.commandeDetail.findMany({
      where: {
        commande: {
          table: { restaurantId },
          statutPaiement: 'PAYEE',
          datePaiement: { gte: debut, lte: fin },
        },
      },
      include: { menu: { select: { nom: true, prix: true, coutMatiere: true } } },
    });

    let caTotal = 0;
    let coutTotal = 0;
    const parPlat: Record<number, { nom: string; ca: number; cout: number; qte: number }> = {};

    for (const d of details) {
      const ca = Number(d.prix) * d.quantite;
      const cout = Number(d.menu?.coutMatiere || 0) * d.quantite;
      caTotal += ca;
      coutTotal += cout;
      if (!parPlat[d.menuId]) parPlat[d.menuId] = { nom: d.menu?.nom || '?', ca: 0, cout: 0, qte: 0 };
      parPlat[d.menuId].ca += ca;
      parPlat[d.menuId].cout += cout;
      parPlat[d.menuId].qte += d.quantite;
    }

    return {
      chiffreAffaires: caTotal.toFixed(2),
      coutMatiere: coutTotal.toFixed(2),
      margeBrute: (caTotal - coutTotal).toFixed(2),
      tauxMarge: caTotal > 0 ? (((caTotal - coutTotal) / caTotal) * 100).toFixed(1) : '0.0',
      details: Object.values(parPlat).map(p => ({
        ...p,
        marge: (p.ca - p.cout).toFixed(2),
        taux: p.ca > 0 ? (((p.ca - p.cout) / p.ca) * 100).toFixed(1) : '0.0',
      })),
    };
  }

  async getPlatsMoinsVendus(restaurantId: number, limit = 10, dateDebut?: string, dateFin?: string) {
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
      .sort((a, b) => a.quantite - b.quantite)
      .slice(0, limit);
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
