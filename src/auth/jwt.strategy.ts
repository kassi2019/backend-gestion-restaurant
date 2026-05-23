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
    });
    if (!user || user.statut !== 'ACTIF') {
      throw new UnauthorizedException('Utilisateur inactif ou inexistant');
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
