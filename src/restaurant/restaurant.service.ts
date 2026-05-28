import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async create(data: { nom: string; adresse: string; telephone?: string; devise?: string }) {
    return this.prisma.restaurant.create({ data });
  }

  async findAll() {
    return this.prisma.restaurant.findMany();
  }

  async findOne(id: number) {
    return this.prisma.restaurant.findUnique({ where: { id } });
  }

  async getPublicInfo(id: number) {
    const resto = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, nom: true, devise: true, statut: true, dateReouverture: true },
    });
    // Vérifier réouverture automatique
    if (resto?.statut === 'FERME' && resto.dateReouverture && new Date() >= resto.dateReouverture) {
      await this.prisma.restaurant.update({
        where: { id },
        data: { statut: 'OUVERT', dateReouverture: null },
      });
      return { ...resto, statut: 'OUVERT', dateReouverture: null };
    }
    return resto;
  }

  async update(id: number, data: { nom?: string; adresse?: string; devise?: string; telephone?: string; statut?: string; dateReouverture?: string }) {
    const updateData: any = {};
    if (data.nom !== undefined) updateData.nom = data.nom;
    if (data.adresse !== undefined) updateData.adresse = data.adresse;
    if (data.devise !== undefined) updateData.devise = data.devise;
    if (data.telephone !== undefined) updateData.telephone = data.telephone;
    if (data.statut !== undefined) updateData.statut = data.statut as any;
    if (data.dateReouverture !== undefined) updateData.dateReouverture = new Date(data.dateReouverture);
    return this.prisma.restaurant.update({
      where: { id },
      data: updateData,
    });
  }
}
