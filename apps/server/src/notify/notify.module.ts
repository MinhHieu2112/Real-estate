import { Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { NotifyGateway } from './notify.gateway';
import { NotifyController } from './notify.controller';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotifyController],
  providers: [NotifyGateway, NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}
