import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CognitoUser } from './jwt-auth.guard';

export const CurrentUser = createParamDecorator(
  (field: keyof CognitoUser | undefined, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();
    const user = request.user as CognitoUser;
    return field ? user?.[field] : user;
  },
);
