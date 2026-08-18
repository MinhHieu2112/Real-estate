import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { NotifyService } from './notify.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/get-user.decorator';
import { CognitoUser } from '../auth/jwt-auth.guard';

@Controller('notify')
@UseGuards(JwtAuthGuard)
export class NotifyController {
  constructor(private readonly notifyService: NotifyService) {}

  @Get()
  async getUserNotifications(@CurrentUser() user: CognitoUser) {
    // userId always from verified JWT — cannot be spoofed via query param
    return this.notifyService.getUserNotifications(user.sub);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notifyService.markAsRead(id);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: CognitoUser) {
    if (!user?.sub) {
      throw new BadRequestException('User not found in token');
    }
    return this.notifyService.markAllAsRead(user.sub);
  }

  @Delete('all')
  @Delete()
  async deleteAllNotifications(@CurrentUser() user: CognitoUser) {
    if (!user?.sub) {
      throw new BadRequestException('User not found in token');
    }
    return this.notifyService.deleteAllNotifications(user.sub);
  }

  @Delete(':id')
  async deleteNotification(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CognitoUser,
  ) {
    return this.notifyService.deleteNotification(id, user.sub);
  }
}
