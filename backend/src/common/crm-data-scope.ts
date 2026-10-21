import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

export interface CrmDataScope {
  salespersonCode: string | null;
}

/**
 * Resolves CRM row visibility from the authenticated profile, never from a
 * caller-supplied salesperson filter. Admin, Direction, Tester, and Production
 * stay global; other CRM users must have a salesperson code and are scoped to it.
 */
export async function resolveCrmDataScope(
  prisma: Pick<PrismaService, 'profiles'>,
  userId?: string,
): Promise<CrmDataScope> {
  if (!userId) throw new ForbiddenException('No se pudo identificar al usuario.');

  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: {
      code: true,
      is_active: true,
      roles: { select: { name: true } },
    },
  });

  if (!profile?.is_active) {
    throw new ForbiddenException('El usuario no tiene un perfil activo.');
  }

  const role = profile.roles?.name?.trim().toUpperCase();
  if (['ADMIN', 'DIRECCION', 'TESTER', 'PRODUCCION'].includes(role || '')) {
    return { salespersonCode: null };
  }

  const salespersonCode = profile.code?.trim();
  if (!salespersonCode) {
    throw new ForbiddenException('El usuario no tiene un código de vendedor asociado.');
  }

  return { salespersonCode };
}
