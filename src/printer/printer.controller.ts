import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  // Request,
} from '@nestjs/common';
import { PrinterService, TicketDestination } from './printer.service';
import { PaiementService } from '../paiement/paiement.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('printer')
export class PrinterController {
  constructor(
    private printerService: PrinterService,
    private paiementService: PaiementService,
    private prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('config')
  getConfig() {
    return this.printerService.getConfig();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('printers')
  async listPrinters() {
    const printers = await this.printerService.listWindowsPrinters();
    return { printers };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('config')
  updateConfig(@Body() updates: any) {
    const message = this.printerService.updateConfigEnv(updates);
    return { message, config: this.printerService.getConfig() };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Post('test')
  async testPrint() {
    const testResult = await this.printerService.testPrinter();
    if (!testResult.ok) return testResult;

    // Imprimer un ticket test
    const testData = {
      titre: 'TEST IMPRESSION',
      sousTitre: "Si vous voyez ce ticket,\nl'imprimante est bien configurée !",
      numero: 'TEST-0001',
      date: new Date().toLocaleDateString('fr-FR'),
      heure: new Date().toLocaleTimeString('fr-FR'),
      lignes: [
        { label: 'Imprimante', valeur: this.printerService.getConfig().type },
        {
          label: 'Connexion',
          valeur: testResult.message.split(' — ')[0] || testResult.message,
        },
      ],
      articles: [
        { quantite: 1, nom: 'Plat test', prix: 12.0, total: 12.0 },
        { quantite: 2, nom: 'Boisson test', prix: 3.5, total: 7.0 },
      ],
      devise: '€',
      total: 19.0,
      modePaiement: 'TEST',
      piedPage: ['✅ Imprimante configurée avec succès !'],
    };

    const result = await this.printerService.printReceipt(testData);
    return { testConnexion: testResult, testImpression: result };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.CAISSIER,
    Role.RECEPTIONNISTE,
    Role.SERVEUR,
    Role.CUISINE,
    Role.BAR,
  )
  @Post('ticket')
  async printTicket(
    @Body()
    data: {
      contenu: string;
      titre?: string;
      destination?: TicketDestination;
    },
  ) {
    const result = await this.printerService.printTicket(
      data.contenu,
      data.destination,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.CAISSIER,
    Role.RECEPTIONNISTE,
    Role.SERVEUR,
    Role.CUISINE,
    Role.BAR,
  )
  @Post('commande/:id/tickets')
  async printCommandeTickets(@Param('id') id: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id: parseInt(id) },
      include: {
        details: {
          include: {
            menu: {
              include: {
                categorie: true,
              },
            },
          },
        },
        table: true,
        serveur: true,
      },
    });

    if (!commande) {
      return { ok: false, message: 'Commande introuvable' };
    }

    const restaurantId = commande.table?.restaurantId;
    const devise = restaurantId
      ? (
          await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { devise: true },
          })
        )?.devise || '€'
      : '€';

    const tableNumero = commande.table?.numero || '?';
    const serveurNom = commande.serveur?.nom || 'Sans serveur';
    const dateStr = new Date(commande.dateCommande).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const cmdRef = 'CMD-' + String(commande.id).padStart(4, '0');
    const width = 42;
    const dash = '-'.repeat(width);
    const center = (t: string) => ' '.repeat(Math.max(0, Math.floor((width - t.length) / 2))) + t;

    // Regrouper les détails par destination
    const groupes: Record<string, any[]> = {
      CUISINE: commande.details.filter(d =>
        ['CUISINE', 'DESSERT'].includes(d.menu?.categorie?.destination || '')),
      BAR: commande.details.filter(
        (d) => d.menu?.categorie?.destination === 'BAR',
      ),
      SERVEUR: commande.details,
    };

    const destinations: {
      key: TicketDestination;
      titre: string;
      avecPrix: boolean;
      avecTotal: boolean;
    }[] = [
      { key: 'CUISINE', titre: 'CUISINE', avecPrix: false, avecTotal: false },
      { key: 'BAR', titre: 'BAR', avecPrix: false, avecTotal: false },
      { key: 'SERVEUR', titre: 'SERVEUR', avecPrix: true, avecTotal: true },
    ];

    const results: { destination: string; ok: boolean; message: string }[] = [];

    for (const dest of destinations) {
      const articles = groupes[dest.key];
      if (articles.length === 0 && dest.key !== 'SERVEUR') {
        continue; // Ne pas imprimer de ticket vide pour CUISINE/BAR
      }

      const lines: string[] = [];
      lines.push(center(dest.titre));
      lines.push(dash);
      lines.push(`Table: ${tableNumero}  ${cmdRef}`);
      lines.push(dateStr);
      if (dest.key === 'SERVEUR') {
        lines.push(`Serveur: ${serveurNom}`);
      }
      lines.push(dash);

      for (const d of articles) {
        const qte = `x${d.quantite}`;
        const prixStr = dest.avecPrix
          ? `${(Number(d.prix || 0) * d.quantite).toFixed(2)} ${devise}`
          : '';
        // Largeur dispo pour le nom = largeur totale - qté - espace - prix - espace
        const maxNom = Math.max(
          10,
          width - qte.length - 1 - prixStr.length - (dest.avecPrix ? 1 : 0),
        );
        const nomBrut = d.menu?.nom || 'Plat';
        const nom = nomBrut.length > maxNom ? nomBrut.substring(0, maxNom) : nomBrut;
        if (dest.avecPrix) {
          const esp = Math.max(
            1,
            width - qte.length - nom.length - prixStr.length,
          );
          lines.push(`${qte} ${nom}${' '.repeat(esp)}${prixStr}`);
        } else {
          lines.push(`${qte} ${nom}`);
        }
      }

      if (dest.avecTotal) {
        const total = Number(commande.montantTotal || 0).toFixed(2);
        lines.push(dash);
        lines.push(
          'TOTAL' +
            ' '.repeat(
              Math.max(1, width - 5 - total.length - devise.length - 1),
            ) +
            `${total} ${devise}`,
        );
      }
      lines.push(dash);

      const contenu = lines.join('\n');
      const result = await this.printerService.printTicket(contenu, dest.key);
      results.push({ destination: dest.key, ...result });
    }

    return {
      ok: results.every(r => r.ok),
      message: `${results.filter(r => r.ok).length}/${results.length} tickets imprimés`,
      details: results,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Post('facture/:id')
  async printFacture(@Param('id') id: string) {
    const data = await this.paiementService.getFactureForPrint(+id);
    if (!data) return { ok: false, message: 'Facture introuvable' };

    const receiptData = {
      titre: data.restaurant.nom,
      sousTitre: data.restaurant.adresse,
      numero: data.numero,
      date: new Date(data.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      heure: new Date(data.date).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      lignes: [
        { label: 'Table', valeur: data.table },
        { label: 'Serveur', valeur: data.serveur },
        { label: 'Caissier', valeur: data.caissier },
        { label: 'Paiement', valeur: data.modePaiement },
      ],
      articles: data.articles,
      devise: data.restaurant.devise,
      remise: data.remise,
      total: data.total,
      modePaiement: data.modePaiement,
      piedPage: [`${data.restaurant.nom}`, 'Merci de votre visite !'],
    };

    return this.printerService.printReceipt(receiptData);
  }
}
