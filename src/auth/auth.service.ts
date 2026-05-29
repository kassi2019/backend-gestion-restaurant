import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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
      include: {
        restaurant: {
          select: {
            nom: true,
            devise: true,
            telephone: true,
            statut: true,
            dateReouverture: true,
            typeAbonnement: true,
            dateFinAbonnement: true,
          },
        },
      },
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

    // SUPER_ADMIN bypass toutes les vérifications (planning + abonnement + fermeture)
    if (user.role !== 'SUPER_ADMIN') {
      // Vérification de la fermeture du restaurant
      const rolesAutorises = ['ADMIN', 'MANAGER'];
      if (
        user.restaurant?.statut === 'FERME' &&
        !rolesAutorises.includes(user.role)
      ) {
        // Vérifier réouverture automatique
        if (
          user.restaurant.dateReouverture &&
          new Date() >= user.restaurant.dateReouverture
        ) {
          await this.prisma.restaurant.update({
            where: { id: user.restaurantId },
            data: { statut: 'OUVERT', dateReouverture: null },
          });
          // Continuer le login normalement
        } else {
          const reouverture = user.restaurant.dateReouverture
            ? ` Réouverture prévue le ${user.restaurant.dateReouverture.toLocaleString('fr-FR')}.`
            : '';
          throw new UnauthorizedException(
            `Le restaurant est fermé.${reouverture}`,
          );
        }
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

      // Planning obligatoire pour tous sauf ADMIN et MANAGER
      const rolesSansPlanning = ['ADMIN', 'MANAGER'];
      if (!planning && !rolesSansPlanning.includes(user.role)) {
        throw new UnauthorizedException(
          "Aucun service programmé aujourd'hui. Connexion refusée.",
        );
      }

      // Vérification de l'abonnement du restaurant
      const maintenant = new Date();
      if (
        user.restaurant?.dateFinAbonnement &&
        user.restaurant.dateFinAbonnement < maintenant
      ) {
        throw new UnauthorizedException(
          `Abonnement expiré depuis le ${user.restaurant.dateFinAbonnement.toLocaleString('fr-FR')}. Veuillez activer un nouveau code.`,
        );
      }
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
        devise: user.restaurant?.devise || '€',
        restaurantNom: user.restaurant?.nom || '',
        restaurantTelephone: user.restaurant?.telephone || '',
        typeAbonnement: user.restaurant?.typeAbonnement || 'TRIAL',
        dateFinAbonnement: user.restaurant?.dateFinAbonnement || null,
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

  async forgotPassword(telephone: string, newPassword: string) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { telephone },
    });
    if (!user) {
      throw new BadRequestException('Aucun utilisateur trouvé avec ce numéro');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.utilisateur.update({
      where: { id: user.id },
      data: { mot_de_passe: hashedPassword },
    });
    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });
    if (!user) throw new BadRequestException('Utilisateur introuvable');

    const isValid = await bcrypt.compare(oldPassword, user.mot_de_passe);
    if (!isValid)
      throw new BadRequestException('Ancien mot de passe incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { mot_de_passe: hashedPassword },
    });
    return { message: 'Mot de passe modifié avec succès' };
  }

  async updateProfile(userId: number, data: { nom?: string; photo?: string }) {
    const updateData: any = {};
    if (data.nom !== undefined) updateData.nom = data.nom;
    if (data.photo !== undefined) updateData.photo = data.photo;
    const user = await this.prisma.utilisateur.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        nom: true,
        telephone: true,
        role: true,
        photo: true,
        statut: true,
        restaurantId: true,
      },
    });
    return user;
  }
}
