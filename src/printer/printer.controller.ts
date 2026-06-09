import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PrinterService } from './printer.service';
import { PaiementService } from '../paiement/paiement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('printer')
export class PrinterController {
  constructor(
    private printerService: PrinterService,
    private paiementService: PaiementService,
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
      sousTitre: 'Si vous voyez ce ticket,\nl\'imprimante est bien configurée !',
      numero: 'TEST-0001',
      date: new Date().toLocaleDateString('fr-FR'),
      heure: new Date().toLocaleTimeString('fr-FR'),
      lignes: [
        { label: 'Imprimante', valeur: this.printerService.getConfig().type },
        { label: 'Connexion', valeur: testResult.message.split(' — ')[0] || testResult.message },
      ],
      articles: [
        { quantite: 1, nom: 'Plat test', prix: 12.00, total: 12.00 },
        { quantite: 2, nom: 'Boisson test', prix: 3.50, total: 7.00 },
      ],
      devise: '€',
      total: 19.00,
      modePaiement: 'TEST',
      piedPage: ['✅ Imprimante configurée avec succès !'],
    };

    const result = await this.printerService.printReceipt(testData);
    return { testConnexion: testResult, testImpression: result };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER, Role.RECEPTIONNISTE, Role.SERVEUR, Role.CUISINE, Role.BAR)
  @Post('ticket')
  async printTicket(@Body() data: { contenu: string; titre?: string }) {
    const result = await this.printerService.printTicket(data.contenu);
    return result;
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
      date: new Date(data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      heure: new Date(data.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
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
