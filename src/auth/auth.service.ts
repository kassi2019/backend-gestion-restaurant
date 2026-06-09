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
            logo: true,
            devise: true,
            telephone: true,
            statut: true,
            dateReouverture: true,
            typeAbonnement: true,
            dateFinAbonnement: true,
            modeGestion: true,
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

    // Charger les modules de l'utilisateur
    const userModules = await this.prisma.userModule.findMany({
      where: { utilisateurId: user.id },
      include: { module: true },
      orderBy: { module: { ordre: 'asc' } },
    });

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
        restaurantLogo: user.restaurant?.logo || '',
        restaurantTelephone: user.restaurant?.telephone || '',
        typeAbonnement: user.restaurant?.typeAbonnement || 'TRIAL',
        dateFinAbonnement: user.restaurant?.dateFinAbonnement || null,
        modeGestion: user.restaurant?.modeGestion || 'RECEPTION',
        modules: userModules.map(um => ({ id: um.module.id, nom: um.module.nom, icon: um.module.icon, route: um.module.route })),
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

    // Récupérer les modules autorisés pour ce restaurant
    const restaurantModules = await this.prisma.restaurantModule.findMany({
      where: { restaurantId: dto.restaurantId },
      select: { moduleId: true },
    });
    const allowedIds = new Set(restaurantModules.map(rm => rm.moduleId));
    const hasRestaurantModules = restaurantModules.length > 0;

    // Assigner les modules si fournis, sinon auto-assigner selon le rôle
    if (dto.moduleIds?.length > 0) {
      // Filtrer par les modules autorisés du restaurant (si définis)
      const validIds = hasRestaurantModules
        ? dto.moduleIds.filter(id => allowedIds.has(id))
        : dto.moduleIds;
      if (validIds.length > 0) {
        await this.prisma.userModule.createMany({
          data: validIds.map(mid => ({ utilisateurId: user.id, moduleId: mid })),
        });
      }
    } else {
      // Fallback: assigner les modules par défaut selon le rôle
      const roleModules: Record<string, string[]> = {
        SUPER_ADMIN: ['Accueil', 'Tables', 'Affectation', 'Commandes', 'Menu', 'Planning', 'Caisse', 'Users', 'Notifications', 'Stats', 'Paramètres', 'Abonnement', 'Générer codes', 'Stock'],
        ADMIN: ['Accueil', 'Tables', 'Affectation', 'Commandes', 'Menu', 'Planning', 'Caisse', 'Users', 'Notifications', 'Stats', 'Paramètres', 'Abonnement', 'Stock', 'Réservations'],
        MANAGER: ['Accueil', 'Tables', 'Affectation', 'Commandes', 'Menu', 'Planning', 'Caisse', 'Users', 'Notifications', 'Stats', 'Réservations'],
        SERVEUR: ['Accueil', 'Tables', 'Commandes', 'Planning', 'Notifications'],
        CUISINE: ['Accueil', 'Commandes', 'Planning', 'Notifications'],
        BAR: ['Accueil', 'Commandes', 'Planning', 'Notifications'],
        RECEPTIONNISTE: ['Accueil', 'Tables', 'Menu', 'Reception', 'Commandes', 'Planning', 'Notifications', 'Réservations'],
        CAISSIER: ['Accueil', 'Planning', 'Caisse', 'Notifications'],
        LIVREUR: ['Accueil', 'Livraisons', 'Notifications'],
      };
      const noms = roleModules[dto.role] || ['Accueil', 'Notifications'];
      const where: any = { nom: { in: noms } };
      // Filtrer par RestaurantModule seulement si le resto a des modules définis
      if (hasRestaurantModules) {
        where.id = { in: [...allowedIds] };
      }
      const modules = await this.prisma.module.findMany({ where });
      if (modules.length > 0) {
        await this.prisma.userModule.createMany({
          data: modules.map(m => ({ utilisateurId: user.id, moduleId: m.id })),
        });
      }
    }

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
