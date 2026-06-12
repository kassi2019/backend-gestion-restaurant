import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CommandesService } from './commandes.service';
import { AiService } from '../ai/ai.service';
import { MenuService } from '../menu/menu.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, StatutCommande, StatutPreparation } from '@prisma/client';

@Controller('commandes')
export class CommandesController {
  constructor(
    private commandesService: CommandesService,
    private aiService: AiService,
    private menuService: MenuService,
  ) {}

  @Post('assistant')
  async assistantCommande(@Body() data: { message: string; tableId: number; restaurantId: number }) {
    // Récupérer le menu du restaurant
    const menuData = await this.menuService.getMenuPublic(data.restaurantId, data.tableId);
    const menus = menuData.categories.flatMap((c: any) =>
      c.menus.map((m: any) => ({
        id: m.id,
        nom: m.nom,
        prix: Number(m.prix),
        categorieNom: c.nom,
        variants: (m.variants || []).map((v: any) => ({
          id: v.id,
          nom: v.nom,
          prix: Number(v.prix),
        })),
      })),
    );

    const result = await this.aiService.commander({
      message: data.message,
      menus,
      restaurantNom: 'menuGo',
    });

    return result;
  }

  @Post('client')
  createFromClient(@Body() data: { tableId: number; sessionKey?: string; deviceId?: string; articles: { menuId: number; quantite: number }[] }) {
    return this.commandesService.createFromClient(data);
  }

  // Retrouver les commandes non payées d'un device (téléphone client)
  @Get('client-device/:deviceId')
  findByDeviceId(@Param('deviceId') deviceId: string) {
    return this.commandesService.findByDeviceId(deviceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Post()
  create(@Body() data: { tableId: number; serveurId: number; details: { menuId: number; quantite: number; prix: number }[]; typeCommande?: string }, @Request() req) {
    return this.commandesService.create({ ...data, restaurantId: req.user.restaurantId });
  }

  @Post('demande-facture')
  demandeFacture(@Body() data: { tableId: number; sessionKey?: string }) {
    return this.commandesService.demandeFacture(data);
  }

  @Post('client-annuler')
  annulerFromClient(@Body() data: { commandeId: number; sessionKey: string }) {
    return this.commandesService.annulerFromClient(data.commandeId, data.sessionKey);
  }

  @Post('client-annuler-detail')
  annulerDetailFromClient(@Body() data: { detailId: number; sessionKey: string }) {
    return this.commandesService.annulerDetailFromClient(data.detailId, data.sessionKey);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Get()
  findAll(@Request() req) {
    return this.commandesService.findAllByRestaurant(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR)
  @Get('serveur')
  findByServeur(@Request() req) {
    return this.commandesService.findByServeur(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUISINE)
  @Get('cuisine')
  findByCuisine(@Request() req) {
    return this.commandesService.findByCuisine(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BAR)
  @Get('bar')
  findByBar(@Request() req) {
    return this.commandesService.findByBar(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Patch(':id/assign-serveur')
  assignServeur(@Param('id') id: string, @Body() data: { serveurId: number }) {
    return this.commandesService.assignServeur(+id, data.serveurId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR, Role.CUISINE, Role.BAR, Role.RECEPTIONNISTE)
  @Patch(':id/statut')
  updateStatut(@Param('id') id: string, @Body() data: { statut: StatutCommande }) {
    return this.commandesService.updateStatut(+id, data.statut);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUISINE, Role.BAR)
  @Patch('details/:id/statut')
  updateDetailStatut(@Param('id') id: string, @Body() data: { statut: StatutPreparation }) {
    return this.commandesService.updateDetailStatut(+id, data.statut);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUISINE, Role.BAR)
  @Post('tout-pret')
  marquerToutPret(@Body() data: { tableId: number; destination: string }) {
    return this.commandesService.marquerToutPret(data.tableId, data.destination);
  }

  @Get('session/:sessionId')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.commandesService.findBySession(+sessionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR, Role.RECEPTIONNISTE)
  @Get('table/:tableId')
  findByTable(@Param('tableId') tableId: string) {
    return this.commandesService.findByTable(+tableId);
  }

  @Get('client-session/:sessionKey')
  findBySessionKey(@Param('sessionKey') sessionKey: string) {
    return this.commandesService.findBySessionKey(sessionKey);
  }

  @UseGuards(JwtAuthGuard)
  @Get('recherche/:term')
  rechercher(@Param('term') term: string) {
    return this.commandesService.rechercherParNumero(term);
  }

  @Get('table-public/:tableId')
  findByTablePublic(@Param('tableId') tableId: string) {
    return this.commandesService.findByTablePublic(+tableId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.SERVEUR, Role.CUISINE, Role.BAR, Role.RECEPTIONNISTE)
  @Get('stats')
  getStats(@Request() req) {
    return this.commandesService.getStats(req.user.restaurantId, req.user.id, req.user.role);
  }

  // ---- MODE CAISSE ----
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Post('caisse-directe')
  createAndPay(@Body() data: { tableId: number; details: { menuId: number; quantite: number }[]; modePaiement: string }, @Request() req) {
    return this.commandesService.createAndPay({ ...data, caissierId: req.user.id, restaurantId: req.user.restaurantId });
  }

  // ---- LIVRAISON ----
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Get('livraisons')
  getLivraisons(@Request() req) {
    return this.commandesService.getLivraisons(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE, Role.LIVREUR)
  @Get('livraisons/actives')
  getLivraisonsActives(@Request() req) {
    return this.commandesService.getLivraisonsActives(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Patch(':id/livraison')
  assignerLivraison(@Param('id') id: string, @Body() data: { livreurId: number; adresse?: string; frais?: number }) {
    return this.commandesService.assignerLivraison(+id, data.livreurId, data.adresse, data.frais);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.LIVREUR)
  @Patch(':id/livraison/statut')
  updateStatutLivraison(@Param('id') id: string, @Body() data: { statut: string }) {
    return this.commandesService.updateStatutLivraison(+id, data.statut);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LIVREUR)
  @Get('livraisons/mes-livraisons')
  getMesLivraisons(@Request() req) {
    return this.commandesService.getLivraisonsLivreur(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECEPTIONNISTE)
  @Post(':id/notifier-pret')
  notifierPret(@Param('id') id: string) {
    return this.commandesService.notifierPret(+id);
  }
}
