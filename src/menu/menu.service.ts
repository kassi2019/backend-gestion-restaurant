import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async getCategories(restaurantId: number) {
    return this.prisma.categorieMenu.findMany({
      where: { restaurantId },
      orderBy: { ordreService: 'asc' },
    });
  }

  async createCategorie(data: { nom: string; ordreService: number; destination: string; restaurantId: number }) {
    return this.prisma.categorieMenu.create({
      data: {
        nom: data.nom,
        ordreService: data.ordreService,
        destination: data.destination as any,
        restaurantId: data.restaurantId,
      },
    });
  }

  async getMenus(restaurantId: number) {
    return this.prisma.menu.findMany({
      where: { restaurantId },
      include: { categorie: true, variants: true },
    });
  }

  async getMenusByCategorie(categorieId: number) {
    return this.prisma.menu.findMany({
      where: { categorieId, disponibilite: true },
      include: { categorie: true },
    });
  }

  async createMenu(data: {
    nom: string;
    prix: number;
    categorieId: number;
    restaurantId: number;
    image?: string;
    tempsPreparation?: number;
  }) {
    return this.prisma.menu.create({ data });
  }

  async toggleDisponibleDemain(menuId: number) {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) throw new Error('Menu introuvable');
    return this.prisma.menu.update({
      where: { id: menuId },
      data: { disponibleDemain: menu.disponibleDemain === 0 ? 1 : 0 },
    });
  }

  async toggleDisponibilite(menuId: number) {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    return this.prisma.menu.update({
      where: { id: menuId },
      data: { disponibilite: !menu.disponibilite },
    });
  }

  async getMenuPublic(restaurantId: number) {
    const categories = await this.prisma.categorieMenu.findMany({
      where: { restaurantId },
      orderBy: { ordreService: 'asc' },
      include: {
        menus: {
          where: { disponibilite: true },
          orderBy: { nom: 'asc' },
          include: { variants: true },
        },
      },
    });
    return categories;
  }

  async updateMenu(menuId: number, data: { nom?: string; prix?: number; categorieId?: number; tempsPreparation?: number }) {
    return this.prisma.menu.update({
      where: { id: menuId },
      data,
    });
  }

  async deleteMenu(menuId: number) {
    return this.prisma.menu.delete({
      where: { id: menuId },
    });
  }

  // ---- Variantes ----
  async getVariants(menuId: number) {
    return this.prisma.menuVariant.findMany({ where: { menuId } });
  }

  async addVariant(menuId: number, data: { nom: string; prix: number }) {
    return this.prisma.menuVariant.create({ data: { menuId, nom: data.nom, prix: data.prix } });
  }

  async updateVariant(variantId: number, data: { nom?: string; prix?: number }) {
    return this.prisma.menuVariant.update({ where: { id: variantId }, data });
  }

  async deleteVariant(variantId: number) {
    return this.prisma.menuVariant.delete({ where: { id: variantId } });
  }
}
