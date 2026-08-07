import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no @Roles() specified, any authenticated user is allowed
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request: Request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 💡 LẤY ROLE: Ưu tiên user.role từ JwtStrategy, nếu không có sẽ lấy từ Header 'x-user-role'
    const headerRole = request.headers['x-user-role'] as string | undefined;
    const currentRole = user.role || headerRole;

    if (!currentRole) {
      throw new ForbiddenException('User role is missing or invalid');
    }

    // So sánh không phân biệt hoa/thường (Case-insensitive)
    const hasRole = requiredRoles.some(
      (role) => role.toLowerCase() === currentRole.toLowerCase(),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
