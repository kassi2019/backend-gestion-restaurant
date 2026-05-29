import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'super-secret-jwt-key',
    });
  }

  async validate(payload: { sub: number; telephone: string; role: string }) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: payload.sub },
      include: { restaurant: { select: { statut: true, dateReouverture: true } } },
    });
    if (!user || user.statut !== 'ACTIF') {
      throw new UnauthorizedException('Utilisateur inactif ou inexistant');
    }

    // Bloquer toutes les requêtes si le restaurant est fermé (sauf ADMIN et SUPER_ADMIN)
    const rolesAutorises = ['ADMIN', 'SUPER_ADMIN'];
    if (user.restaurant?.statut === 'FERME' && !rolesAutorises.includes(user.role)) {
      // Vérifier réouverture automatique
      if (user.restaurant.dateReouverture && new Date() >= user.restaurant.dateReouverture) {
        await this.prisma.restaurant.update({
          where: { id: user.restaurantId },
          data: { statut: 'OUVERT', dateReouverture: null },
        });
      } else {
        const reouverture = user.restaurant.dateReouverture
          ? ` Réouverture prévue le ${user.restaurant.dateReouverture.toLocaleString('fr-FR')}.`
          : '';
        throw new UnauthorizedException(
          `Le restaurant est fermé.${reouverture}`,
        );
      }
    }

    return {
      id: user.id,
      nom: user.nom,
      telephone: user.telephone,
      role: user.role,
      restaurantId: user.restaurantId,
    };
  }
}
