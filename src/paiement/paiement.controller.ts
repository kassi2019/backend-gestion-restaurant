import { Controller, Get, Post, Param, Body, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PaiementService } from './paiement.service';
import { genererFactureHTML } from './facture-html.template';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, ModePaiement } from '@prisma/client';

@Controller('paiements')
export class PaiementController {
  constructor(
    private paiementService: PaiementService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Get('a-payer')
  getCommandesAPayer(@Request() req) {
    return this.paiementService.getCommandesAPayer(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Post('payer/:commandeId')
  payer(
    @Param('commandeId') commandeId: string,
    @Body() data: { mode: ModePaiement },
    @Request() req,
  ) {
    return this.paiementService.payerCommande(+commandeId, data.mode, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Get('factures')
  getFactures(@Request() req, @Query('date') date?: string) {
    return this.paiementService.getFactures(req.user.restaurantId, date);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Get('factures/:id')
  getFacture(@Param('id') id: string) {
    return this.paiementService.getFactureById(+id);
  }

  @Get('factures/:id/imprimer')
  async imprimerFacture(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    // Vérification manuelle du token JWT
    if (token) {
      try {
        this.jwtService.verify(token);
      } catch {
        return res.status(401).send('Token invalide ou expiré');
      }
    }

    const data = await this.paiementService.getFactureForPrint(+id);
    if (!data) return res.status(404).send('Facture introuvable');

    const html = genererFactureHTML(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Get('caisse/jour')
  getCaisseJour(@Request() req) {
    return this.paiementService.getCaisseJour(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.CAISSIER)
  @Post('caisse/cloture')
  cloturerCaisse(@Request() req) {
    return this.paiementService.cloturerCaisse(req.user.restaurantId, req.user.id);
  }
}
