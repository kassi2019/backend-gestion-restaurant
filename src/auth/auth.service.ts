import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { telephone: dto.telephone },
    });

    if (!user) {
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect');
    }

    if (user.statut !== 'ACTIF') {
      throw new UnauthorizedException(
        "Votre compte est inactif. Contactez l'administrateur.",
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.mot_de_passe,
      user.mot_de_passe,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const planning = await this.prisma.planning.findFirst({
      where: {
        utilisateurId: user.id,
        jour: {
          gte: today,
        },
        statut: 'ACTIF',
      },
    });

    const rolesSansPlanning = [
      'ADMIN',
      'MANAGER',
      'CUISINE',
      'BAR',
      'CAISSIER',
    ];
    if (!planning && !rolesSansPlanning.includes(user.role)) {
      throw new UnauthorizedException(
        "Aucun service programmé aujourd'hui. Connexion refusée.",
      );
    }

    const payload = {
      sub: user.id,
      telephone: user.telephone,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      utilisateur: {
        id: user.id,
        nom: user.nom,
        telephone: user.telephone,
        role: user.role,
        photo: user.photo,
        restaurantId: user.restaurantId,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.utilisateur.findUnique({
      where: { telephone: dto.telephone },
    });

    if (existingUser) {
      throw new UnauthorizedException(
        'Ce numéro de téléphone est déjà utilisé',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.mot_de_passe, 10);

    const user = await this.prisma.utilisateur.create({
      data: {
        nom: dto.nom,
        telephone: dto.telephone,
        mot_de_passe: hashedPassword,
        role: dto.role,
        restaurantId: dto.restaurantId,
        photo: dto.photo,
      },
    });

    return { message: 'Utilisateur créé avec succès', userId: user.id };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nom: true,
        telephone: true,
        role: true,
        photo: true,
        statut: true,
        restaurantId: true,
        restaurant: true,
      },
    });
    return user;
  }
}
