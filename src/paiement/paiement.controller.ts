import { Controller, Get, Post, Param, Body, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaiementService } from './paiement.service';
import { genererFactureHTML } from './facture-html.template';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, ModePaiement } from '@prisma/client';

@Controller('paiements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaiementController {
  constructor(private paiementService: PaiementService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Get('a-payer')
  getCommandesAPayer(@Request() req) {
    return this.paiementService.getCommandesAPayer(req.user.restaurantId);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Post('payer/:commandeId')
  payer(
    @Param('commandeId') commandeId: string,
    @Body() data: { mode: ModePaiement },
    @Request() req,
  ) {
    return this.paiementService.payerCommande(+commandeId, data.mode, req.user.id);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Get('factures')
  getFactures(@Request() req, @Query('date') date?: string) {
    return this.paiementService.getFactures(req.user.restaurantId, date);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Get('factures/:id')
  getFacture(@Param('id') id: string) {
    return this.paiementService.getFactureById(+id);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Get('factures/:id/imprimer')
  async imprimerFacture(@Param('id') id: string, @Res() res: Response) {
    const data = await this.paiementService.getFactureForPrint(+id);
    if (!data) return res.status(404).send('Facture introuvable');

    const html = genererFactureHTML(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Get('caisse/jour')
  getCaisseJour(@Request() req) {
    return this.paiementService.getCaisseJour(req.user.restaurantId);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Post('caisse/cloture')
  cloturerCaisse(@Request() req) {
    return this.paiementService.cloturerCaisse(req.user.restaurantId, req.user.id);
  }
}
