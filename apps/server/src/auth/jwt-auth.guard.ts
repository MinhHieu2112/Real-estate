import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { cognitoVerifier } from './cognito-jwt.verifier';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PrismaService } from '../prisma.service';

export class CognitoUser {
  sub!: string;
  role!: string;
  email?: string;
  username?: string;
}

declare module 'express' {
  interface Request {
    user?: CognitoUser;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow routes marked with @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const payload = await cognitoVerifier.verify(token);

      const customRole = payload['custom:role'];
      const cognitoGroups = payload['cognito:groups'];

      let role: string | undefined =
        typeof customRole === 'string'
          ? customRole
          : Array.isArray(cognitoGroups) && cognitoGroups.length > 0
            ? String(cognitoGroups[0])
            : undefined;

      if (!role) {
        const manager = await this.prisma.manager.findUnique({
          where: { cognitoId: payload.sub },
          select: { id: true },
        });

        if (manager) {
          role = 'manager';
        } else {
          const tenant = await this.prisma.tenant.findUnique({
            where: { cognitoId: payload.sub },
            select: { id: true },
          });
          if (tenant) {
            role = 'tenant';
          }
        }
      }

      if (!role) {
        const headerRole = request.headers['x-user-role'] as string | undefined;
        if (
          headerRole &&
          ['manager', 'tenant'].includes(headerRole.toLowerCase())
        ) {
          role = headerRole.toLowerCase();
        }
      }

      request.user = {
        sub: payload.sub,
        role: (role || 'tenant').toLowerCase(),
        email: (payload.email as string) || undefined,
        username: (payload.username as string) || undefined,
      };

      return true;
    } catch (err: any) {
      console.error('JWT verification error details:', err?.message || err);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
