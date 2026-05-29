import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    const idsAutorises = (process.env.SUPER_ADMIN_IDS || '')
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (!user || !idsAutorises.includes(user.id)) {
      throw new ForbiddenException('Réservé au Super Administrateur');
    }
    return true;
  }
}
