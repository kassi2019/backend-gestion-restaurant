import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthService } from './auth.service';
import { ActivationService } from '../activation/activation.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private activationService: ActivationService,
    private prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('modules')
  async getModules(@Request() req) {
    // SUPER_ADMIN voit tous les modules
    if (req.user.role === 'SUPER_ADMIN') {
      return this.prisma.module.findMany({ orderBy: { ordre: 'asc' } });
    }

    // Admin/Manager/etc : uniquement les modules attribués à cet utilisateur
    const userModules = await this.prisma.userModule.findMany({
      where: { utilisateurId: req.user.id },
      include: { module: true },
      orderBy: { module: { ordre: 'asc' } },
    });

    return userModules.map(um => um.module);
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/:userId/modules')
  async updateUserModules(@Param('userId') userId: string, @Body() data: { moduleIds: number[] }, @Request() req) {
    const uid = parseInt(userId);

    // Vérifier que l'utilisateur connecté a le droit (SuperAdmin, Admin ou Manager)
    const superAdminIds = (process.env.SUPER_ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    const isSuperAdmin = superAdminIds.includes(req.user.id) || req.user.role === 'SUPER_ADMIN';
    const isAdminManager = req.user.role === 'ADMIN' || req.user.role === 'MANAGER';

    if (!isSuperAdmin && !isAdminManager) {
      return { message: 'Action non autorisée', error: 'Rôle insuffisant' };
    }

    // Trouver le restaurant de l'utilisateur cible
    const targetUser = await this.prisma.utilisateur.findUnique({
      where: { id: uid },
      select: { restaurantId: true },
    });
    if (!targetUser) return { message: 'Utilisateur introuvable' };

    // Un Admin/Manager ne peut modifier que les utilisateurs de son propre restaurant
    if (isAdminManager && targetUser.restaurantId !== req.user.restaurantId) {
      return { message: 'Action non autorisée', error: 'Restaurant différent' };
    }

    // Déterminer les modules autorisés
    let allowedIds: Set<number>;

    if (isSuperAdmin) {
      // SuperAdmin : modules dans le périmètre du restaurant
      const allowedModules = await this.prisma.restaurantModule.findMany({
        where: { restaurantId: targetUser.restaurantId },
        select: { moduleId: true },
      });
      allowedIds = new Set(allowedModules.map(m => m.moduleId));
    } else {
      // Admin/Manager : uniquement les modules qu'il possède lui-même
      const userModules = await this.prisma.userModule.findMany({
        where: { utilisateurId: req.user.id },
        select: { moduleId: true },
      });
      allowedIds = new Set(userModules.map(m => m.moduleId));
    }

    const validIds = data.moduleIds.filter(id => allowedIds.has(id));
    const refused = data.moduleIds.filter(id => !allowedIds.has(id));

    await this.prisma.userModule.deleteMany({ where: { utilisateurId: uid } });
    if (validIds.length > 0) {
      await this.prisma.userModule.createMany({
        data: validIds.map(mid => ({ utilisateurId: uid, moduleId: mid })),
      });
    }

    return {
      message: 'Modules mis à jour',
      attribues: validIds.length,
      refuses: refused.length > 0 ? `${refused.length} module(s) non autorisé(s)` : undefined,
    };
  }

  // ─── Gestion des modules par restaurant (Super Admin uniquement) ───

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('restaurants/:restaurantId/modules')
  async getRestaurantModules(@Param('restaurantId') restaurantId: string) {
    const rid = parseInt(restaurantId);
    const assigned = await this.prisma.restaurantModule.findMany({
      where: { restaurantId: rid },
      include: { module: true },
    });
    const allModules = await this.prisma.module.findMany({ orderBy: { ordre: 'asc' } });

    return {
      restaurantId: rid,
      modulesDisponibles: allModules,
      modulesAttribues: assigned.map(rm => rm.module),
    };
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post('restaurants/:restaurantId/modules')
  async setRestaurantModules(
    @Param('restaurantId') restaurantId: string,
    @Body() data: { moduleIds: number[] },
  ) {
    const rid = parseInt(restaurantId);

    // Supprimer tous les modules actuels du restaurant
    await this.prisma.restaurantModule.deleteMany({ where: { restaurantId: rid } });

    // Supprimer aussi les userModules qui ne seraient plus dans le périmètre
    // (les utilisateurs de ce resto perdent les modules retirés)
    await this.prisma.userModule.deleteMany({
      where: {
        utilisateur: { restaurantId: rid },
        moduleId: { notIn: data.moduleIds.length > 0 ? data.moduleIds : [-1] },
      },
    });

    // Assigner les nouveaux modules
    if (data.moduleIds.length > 0) {
      await this.prisma.restaurantModule.createMany({
        data: data.moduleIds.map(mid => ({ restaurantId: rid, moduleId: mid })),
      });
    }

    return { message: `Modules mis à jour pour le restaurant #${rid}`, nbModules: data.moduleIds.length };
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('forgot-password')
  forgotPassword(@Body() data: { telephone: string; newPassword: string }) {
    return this.authService.forgotPassword(data.telephone, data.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  changePassword(
    @Request() req,
    @Body() data: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      req.user.id,
      data.oldPassword,
      data.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Request() req,
    @Body() data: { nom?: string; photo?: string },
  ) {
    return this.authService.updateProfile(req.user.id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('photo')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  uploadPhoto(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const photoUrl = '/uploads/profiles/' + file.filename;
    return this.authService.updateProfile(req.user.id, { photo: photoUrl });
  }

  // ---- Abonnement ----

  @UseGuards(JwtAuthGuard)
  @Get('abonnement')
  getAbonnement(@Request() req) {
    return this.activationService.getStatus(req.user.restaurantId);
  }

  // Public : permet d'activer même si l'abonnement est expiré
  @Post('activer')
  activerCode(@Body() data: { telephone: string; code: string }) {
    return this.activationService.activerCode(data.telephone, data.code);
  }

  // ============ Nouveau système : Plans + Paiements ============

  // Public : liste des plans disponibles
  @Get('plans')
  getPlans() {
    return this.activationService.getPlans();
  }

  // Public : infos de paiement (Wave/OM numéros)
  @Get('config-paiement')
  getConfigPaiement() {
    return this.activationService.getConfigPaiement();
  }

  // Resto admin : initier un paiement d'abonnement
  @UseGuards(JwtAuthGuard)
  @Post('paiement-abonnement')
  initierPaiement(@Body() data: { planId: number; infosPaiement?: string }, @Request() req) {
    return this.activationService.initierPaiement(req.user.restaurantId, data.planId, data.infosPaiement);
  }

  // Resto admin : historique de ses paiements
  @UseGuards(JwtAuthGuard)
  @Get('mes-paiements')
  mesPaiements(@Request() req) {
    return this.activationService.mesPaiements(req.user.restaurantId);
  }

  // Super admin : liste des paiements en attente
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('paiements-en-attente')
  getPaiementsEnAttente() {
    return this.activationService.getPaiementsEnAttente();
  }

  // Super admin : confirmer un paiement
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch('paiements/:id/confirmer')
  confirmerPaiement(@Param('id') id: string, @Request() req) {
    return this.activationService.confirmerPaiement(parseInt(id), req.user.id);
  }

  // Super admin : rejeter un paiement
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch('paiements/:id/rejeter')
  rejeterPaiement(@Param('id') id: string, @Request() req) {
    return this.activationService.rejeterPaiement(parseInt(id), req.user.id);
  }

  // ============ CRUD Plans (Super Admin) ============

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('plans/all')
  getAllPlans() {
    return this.activationService.getAllPlans();
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post('plans')
  createPlan(@Body() data: { nom: string; dureeJours: number; prix: number }) {
    return this.activationService.createPlan(data);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() data: { nom?: string; dureeJours?: number; prix?: number; actif?: boolean }) {
    return this.activationService.updatePlan(parseInt(id), data);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.activationService.deletePlan(parseInt(id));
  }

  // ============ Ancien système ============

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post('generer-codes')
  genererCodes(@Body() data: { dureeJours: number; nombre: number }) {
    return this.activationService.genererCodes(data.dureeJours, data.nombre);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('codes')
  listeCodes() {
    return this.activationService.listeCodes();
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Delete('codes/:id')
  supprimerCode(@Param('id') id: string) {
    return this.activationService.supprimerCode(parseInt(id));
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('super-dashboard')
  getDashboard() {
    return this.activationService.getDashboard();
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('historique/:restaurantId')
  getHistorique(@Param('restaurantId') restaurantId: string) {
    return this.activationService.getHistorique(parseInt(restaurantId));
  }
}
