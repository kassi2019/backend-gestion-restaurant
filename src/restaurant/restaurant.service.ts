import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async create(data: { nom: string; adresse: string }) {
    return this.prisma.restaurant.create({ data });
  }

  async findAll() {
    return this.prisma.restaurant.findMany();
  }

  async findOne(id: number) {
    return this.prisma.restaurant.findUnique({ where: { id } });
  }

  async getPublicInfo(id: number) {
    return this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, nom: true, devise: true },
    });
  }

  async update(id: number, data: { nom?: string; adresse?: string; devise?: string }) {
    return this.prisma.restaurant.update({
      where: { id },
      data,
    });
  }
}
