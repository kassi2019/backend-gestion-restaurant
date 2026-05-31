import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get('public/:restaurantId')
  getMenuPublic(@Param('restaurantId') restaurantId: string) {
    return this.menuService.getMenuPublic(+restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('categories')
  getCategories(@Request() req) {
    return this.menuService.getCategories(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('categories')
  createCategorie(@Body() data: { nom: string; ordreService: number; destination: string }, @Request() req) {
    return this.menuService.createCategorie({ ...data, restaurantId: req.user.restaurantId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  getMenus(@Request() req) {
    return this.menuService.getMenus(req.user.restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  createMenu(@Body() data: { nom: string; prix: number; categorieId: number; image?: string; tempsPreparation?: number }, @Request() req) {
    return this.menuService.createMenu({ ...data, restaurantId: req.user.restaurantId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id/toggle')
  toggleDisponibilite(@Param('id') id: string) {
    return this.menuService.toggleDisponibilite(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id/toggle-demain')
  toggleDisponibleDemain(@Param('id') id: string) {
    return this.menuService.toggleDisponibleDemain(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  updateMenu(@Param('id') id: string, @Body() data: { nom?: string; prix?: number; categorieId?: number; tempsPreparation?: number }) {
    return this.menuService.updateMenu(+id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  deleteMenu(@Param('id') id: string) {
    return this.menuService.deleteMenu(+id);
  }

  // ---- Variantes ----
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get(':menuId/variants')
  getVariants(@Param('menuId') menuId: string) {
    return this.menuService.getVariants(+menuId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':menuId/variants')
  addVariant(@Param('menuId') menuId: string, @Body() data: { nom: string; prix: number }) {
    return this.menuService.addVariant(+menuId, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch('variants/:variantId')
  updateVariant(@Param('variantId') variantId: string, @Body() data: { nom?: string; prix?: number }) {
    return this.menuService.updateVariant(+variantId, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete('variants/:variantId')
  deleteVariant(@Param('variantId') variantId: string) {
    return this.menuService.deleteVariant(+variantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads'),
      filename: (_req, file, cb) => {
        cb(null, 'import-' + Date.now() + extname(file.originalname));
      },
    }),
  }))
  async importCsv(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) throw new BadRequestException('Fichier requis');
    const fs = require('fs');
    const content = fs.readFileSync(file.path, 'utf-8');
    const lines = content.split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) throw new BadRequestException('Fichier vide ou invalide');

    // Le header: nom,prix,categorieId,tempsPreparation,variantes
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('nom') || header.includes('prix');

    const start = hasHeader ? 1 : 0;
    let created = 0;
    let variantsCreated = 0;

    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      if (parts.length < 2) continue;
      const nom = parts[0];
      const prix = parseFloat(parts[1]?.replace(',', '.'));
      const catId = parseInt(parts[2]) || 0;
      const temps = parseInt(parts[3]) || 15;
      const variantesStr = parts[4] || '';

      if (!nom || isNaN(prix)) continue;

      const menu = await this.menuService.createMenu({
        nom,
        prix,
        categorieId: catId || undefined,
        restaurantId: req.user.restaurantId,
        tempsPreparation: temps,
      });
      created++;

      // Créer les variantes si présentes (format: "Avec alcool:4000|Sans alcool:3500")
      if (variantesStr) {
        const variantes = variantesStr.split('|').map(v => v.trim()).filter(v => v.includes(':'));
        for (const v of variantes) {
          const [vNom, vPrix] = v.split(':').map(s => s.trim());
          const vPrixNum = parseFloat(vPrix?.replace(',', '.'));
          if (vNom && !isNaN(vPrixNum)) {
            await this.menuService.addVariant(menu.id, { nom: vNom, prix: vPrixNum });
            variantsCreated++;
          }
        }
      }
    }

    // Nettoyer le fichier temporaire
    try { fs.unlinkSync(file.path); } catch {}

    return { message: `${created} plat(s) et ${variantsCreated} variante(s) importé(s)`, created, variantsCreated };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads'),
      filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'menu-' + unique + extname(file.originalname));
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
        cb(new Error('Format non supporté (JPEG, PNG, WEBP)'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const imageUrl = `/uploads/${file.filename}`;
    await this.menuService.updateMenu(+id, { image: imageUrl } as any);
    return { imageUrl, filename: file.filename };
  }
}
