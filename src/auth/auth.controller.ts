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
  getModules(@Request() req) {
    const where: any = {};
    // SUPER_ADMIN uniquement voit "Générer codes"
    if (req.user.role !== 'SUPER_ADMIN') {
      where.route = { not: '/super/codes' };
    }
    return this.prisma.module.findMany({ where, orderBy: { ordre: 'asc' } });
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/:userId/modules')
  async updateUserModules(@Param('userId') userId: string, @Body() data: { moduleIds: number[] }) {
    const uid = parseInt(userId);
    await this.prisma.userModule.deleteMany({ where: { utilisateurId: uid } });
    if (data.moduleIds.length > 0) {
      await this.prisma.userModule.createMany({
        data: data.moduleIds.map(mid => ({ utilisateurId: uid, moduleId: mid })),
      });
    }
    return { message: 'Modules mis à jour' };
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
