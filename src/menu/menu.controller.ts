import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
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
