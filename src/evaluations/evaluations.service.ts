import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EvaluationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    telephone: string; noteService: number; noteCuisine: number;
    noteAmbiance: number; commentaire?: string; restaurantId: number;
  }) {
    return this.prisma.evaluation.create({ data });
  }

  async findAll(restaurantId: number) {
    return this.prisma.evaluation.findMany({
      where: { restaurantId },
      orderBy: { dateCreation: 'desc' },
    });
  }

  async getMoyennes(restaurantId: number) {
    const evals = await this.prisma.evaluation.findMany({
      where: { restaurantId },
      select: { noteService: true, noteCuisine: true, noteAmbiance: true },
    });
    if (evals.length === 0) return { noteService: 0, noteCuisine: 0, noteAmbiance: 0, nbAvis: 0 };
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    return {
      noteService: (sum(evals.map(e => e.noteService)) / evals.length).toFixed(1),
      noteCuisine: (sum(evals.map(e => e.noteCuisine)) / evals.length).toFixed(1),
      noteAmbiance: (sum(evals.map(e => e.noteAmbiance)) / evals.length).toFixed(1),
      nbAvis: evals.length,
    };
  }
}
