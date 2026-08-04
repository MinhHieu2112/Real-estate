import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { NotifyService } from './notify.service';

@Controller('notify')
export class NotifyController {
  constructor(private readonly notifyService: NotifyService) {}

  @Get()
  async getUserNotifications(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('Query parameter userId is required');
    }
    return this.notifyService.getUserNotifications(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notifyService.markAsRead(id);
  }

  @Patch('read-all')
  async markAllAsRead(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('Query parameter userId is required');
    }
    return this.notifyService.markAllAsRead(userId);
  }
}
