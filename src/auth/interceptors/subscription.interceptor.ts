import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor qui bloque l'ADMIN dont l'abonnement est expiré
 * de tout endpoint non lié à l'abonnement/paiement.
 *
 * S'exécute APRÈS les guards (JwtAuthGuard a déjà peuplé req.user).
 */
@Injectable()
export class SubscriptionInterceptor implements NestInterceptor {
  // Chemins autorisés pour un ADMIN avec abonnement expiré
  private readonly allowedPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/abonnement',
    '/api/auth/activer',
    '/api/auth/plans',
    '/api/auth/config-paiement',
    '/api/auth/paiement-abonnement',
    '/api/auth/mes-paiements',
    '/api/auth/profile',
    '/api/auth/photo',
    '/api/auth/password',
    '/api/auth/modules',
  ];

  // Préfixes autorisés (pour les routes avec paramètres)
  private readonly allowedPrefixes = [
    '/api/auth/users/',
    '/api/auth/restaurants/',
    '/api/auth/plans/',
    '/api/auth/paiements',
    '/api/auth/codes',
    '/api/auth/generer-codes',
    '/api/auth/super-dashboard',
    '/api/auth/historique/',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si pas d'utilisateur (endpoint public sans JwtAuthGuard), on laisse passer
    if (!user) {
      return next.handle();
    }

    // Si abonnement non expiré, on laisse passer
    if (!user.abonnementExpire) {
      return next.handle();
    }

    // SUPER_ADMIN n'est jamais bloqué
    if (user.role === 'SUPER_ADMIN') {
      return next.handle();
    }

    // Seul l'ADMIN avec abonnement expiré est concerné
    if (user.role !== 'ADMIN') {
      return next.handle();
    }

    const path = request.originalUrl || request.url;
    // Enlever les query params pour la comparaison
    const pathWithoutQuery = path.split('?')[0];

    // Vérifier si le chemin est dans la liste autorisée
    const isAllowed = this.allowedPaths.some(
      (allowed) => pathWithoutQuery === allowed,
    );

    if (isAllowed) {
      return next.handle();
    }

    // Vérifier les préfixes autorisés
    const isPrefixAllowed = this.allowedPrefixes.some((prefix) =>
      pathWithoutQuery.startsWith(prefix),
    );

    if (isPrefixAllowed) {
      return next.handle();
    }

    throw new ForbiddenException(
      'Votre abonnement a expiré. Veuillez renouveler votre abonnement pour accéder à cette fonctionnalité.',
    );
  }
}
