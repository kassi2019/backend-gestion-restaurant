import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-cbc';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getSecret(): Buffer {
  const secret = process.env.CODE_SECRET || 'activ-code-secret-key-2024';
  // Dériver une clé de 32 octets (256 bits)
  return Buffer.from(secret.padEnd(32, '0').slice(0, 32), 'utf-8');
}

function encrypt(plainText: string): string {
  const key = getSecret();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(plainText, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  // Format: iv:encryptedData
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const key = getSecret();
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = createDecipheriv(ALGO, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

@Injectable()
export class ActivationService {
  constructor(private prisma: PrismaService) {}

  async getStatus(restaurantId: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        nom: true,
        typeAbonnement: true,
        dateFinAbonnement: true,
      },
    });

    if (!restaurant) {
      throw new BadRequestException('Restaurant introuvable');
    }

    const maintenant = new Date();
    const estActif = restaurant.dateFinAbonnement
      ? restaurant.dateFinAbonnement > maintenant
      : false;

    const joursRestants = restaurant.dateFinAbonnement
      ? Math.max(
          0,
          Math.ceil(
            (restaurant.dateFinAbonnement.getTime() - maintenant.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    return {
      restaurantId: restaurant.id,
      nom: restaurant.nom,
      typeAbonnement: restaurant.typeAbonnement,
      dateFinAbonnement: restaurant.dateFinAbonnement,
      estActif,
      joursRestants,
      estExpire: !estActif,
    };
  }

  async activerCode(telephone: string, codeSaisi: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { telephone },
      select: { restaurantId: true },
    });

    if (!utilisateur) {
      throw new BadRequestException('Numéro de téléphone introuvable');
    }

    const restaurantId = utilisateur.restaurantId;

    // Récupérer tous les codes non utilisés, les déchiffrer et comparer
    const codesNonUtilises = await this.prisma.codeActivation.findMany({
      where: { estUtilise: false },
    });

    let codeTrouve: any = null;
    const codeNettoye = codeSaisi.toUpperCase().trim();

    for (const c of codesNonUtilises) {
      try {
        const decrypted = decrypt(c.codeEncrypted);
        if (decrypted === codeNettoye) {
          codeTrouve = c;
          break;
        }
      } catch {
        // skip les codes qui ne peuvent pas être déchiffrés
      }
    }

    if (!codeTrouve) {
      throw new BadRequestException('Code invalide');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, dateFinAbonnement: true, typeAbonnement: true },
    });

    if (!restaurant) {
      throw new BadRequestException('Restaurant introuvable');
    }

    const maintenant = new Date();
    const dateBase =
      restaurant.dateFinAbonnement && restaurant.dateFinAbonnement > maintenant
        ? restaurant.dateFinAbonnement
        : maintenant;

    const nouvelleDateFin = new Date(dateBase);
    nouvelleDateFin.setDate(nouvelleDateFin.getDate() + codeTrouve.dureeJours);

    let typeAbonnement = 'MENSUEL';
    if (codeTrouve.dureeJours >= 365) {
      typeAbonnement = 'ANNUEL';
    }

    // Déchiffrer le code pour l'historique
    let codeClair = codeSaisi;
    try {
      codeClair = decrypt(codeTrouve.codeEncrypted);
    } catch {
      // garder la valeur saisie
    }

    await this.prisma.$transaction([
      this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          typeAbonnement: typeAbonnement as any,
          dateFinAbonnement: nouvelleDateFin,
        },
      }),
      this.prisma.codeActivation.update({
        where: { id: codeTrouve.id },
        data: {
          estUtilise: true,
          dateUtilisation: new Date(),
          restaurantId: restaurantId,
        },
      }),
      // Enregistrer dans l'historique
      this.prisma.historiqueAbonnement.create({
        data: {
          restaurantId,
          typeAbonnement: typeAbonnement as any,
          dureeJours: codeTrouve.dureeJours,
          dateDebut: dateBase,
          dateFin: nouvelleDateFin,
          codeUtilise: codeClair,
        },
      }),
    ]);

    return {
      message: 'Abonnement activé avec succès',
      typeAbonnement,
      dateFinAbonnement: nouvelleDateFin,
      joursAjoutes: codeTrouve.dureeJours,
    };
  }

  async genererCodes(dureeJours: number, nombre: number) {
    if (nombre < 1 || nombre > 100) {
      throw new BadRequestException('Le nombre de codes doit être entre 1 et 100');
    }
    if (dureeJours < 1) {
      throw new BadRequestException("La durée doit être d'au moins 1 jour");
    }

    const codes: string[] = [];

    for (let i = 0; i < nombre; i++) {
      const codeClair = this.genererCode();
      const codeEncrypted = encrypt(codeClair);

      await this.prisma.codeActivation.create({
        data: {
          codeEncrypted,
          dureeJours,
        },
      });
      codes.push(codeClair);
    }

    return {
      message: `${nombre} code(s) généré(s) avec succès`,
      dureeJours,
      codes,
    };
  }

  async listeCodes() {
    const codes = await this.prisma.codeActivation.findMany({
      orderBy: { dateCreation: 'desc' },
      include: {
        restaurant: { select: { id: true, nom: true } },
      },
    });

    // Déchiffrer les codes pour l'affichage (avec œil)
    return codes.map((c) => {
      let codeClair = '';
      try {
        codeClair = decrypt(c.codeEncrypted);
      } catch {
        codeClair = '[code illisible]';
      }
      return {
        id: c.id,
        codeClair, // déchiffré
        codeMasque: 'RESTO-••••-••••-••••', // affichage par défaut
        dureeJours: c.dureeJours,
        estUtilise: c.estUtilise,
        dateUtilisation: c.dateUtilisation,
        dateCreation: c.dateCreation,
        restaurant: c.restaurant,
      };
    });
  }

  async supprimerCode(id: number) {
    const code = await this.prisma.codeActivation.findUnique({ where: { id } });
    if (!code) {
      throw new BadRequestException('Code introuvable');
    }
    if (code.estUtilise) {
      throw new BadRequestException('Impossible de supprimer un code déjà utilisé');
    }
    await this.prisma.codeActivation.delete({ where: { id } });
    return { message: 'Code supprimé avec succès' };
  }

  async getDashboard() {
    const maintenant = new Date();

    const [totalRestos, restosValides, restosExpires, restosEssai, codes] =
      await Promise.all([
        this.prisma.restaurant.count(),
        this.prisma.restaurant.count({
          where: {
            dateFinAbonnement: { gt: maintenant },
            typeAbonnement: { not: 'TRIAL' },
          },
        }),
        this.prisma.restaurant.count({
          where: { dateFinAbonnement: { lt: maintenant } },
        }),
        this.prisma.restaurant.count({
          where: {
            dateFinAbonnement: { gt: maintenant },
            typeAbonnement: 'TRIAL',
          },
        }),
        this.prisma.codeActivation.aggregate({ _count: { id: true } }),
      ]);

    const codesDispo = await this.prisma.codeActivation.count({ where: { estUtilise: false } });
    const codesUtilises = await this.prisma.codeActivation.count({ where: { estUtilise: true } });

    const restaurants = await this.prisma.restaurant.findMany({
      orderBy: { dateFinAbonnement: 'asc' },
      select: {
        id: true,
        nom: true,
        typeAbonnement: true,
        dateFinAbonnement: true,
        _count: { select: { utilisateurs: true } },
      },
    });

    return {
      totalRestos,
      restosValides,
      restosExpires,
      restosEssai,
      codes: { dispo: codesDispo, utilises: codesUtilises, total: codes._count.id },
      restaurants,
    };
  }

  async getHistorique(restaurantId: number) {
    const [restaurant, historique] = await Promise.all([
      this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, nom: true, typeAbonnement: true, dateFinAbonnement: true },
      }),
      this.prisma.historiqueAbonnement.findMany({
        where: { restaurantId },
        orderBy: { dateCreation: 'desc' },
      }),
    ]);

    if (!restaurant) {
      throw new BadRequestException('Restaurant introuvable');
    }

    return { restaurant, historique };
  }

  private genererCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bloc1 = Array.from({ length: 4 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
    const bloc2 = Array.from({ length: 4 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
    const bloc3 = Array.from({ length: 4 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
    return `RESTO-${bloc1}-${bloc2}-${bloc3}`;
  }
}
