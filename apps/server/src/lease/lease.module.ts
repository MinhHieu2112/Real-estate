import { Module } from '@nestjs/common';
import { LeaseService } from './lease.service';
import { LeaseController } from './lease.controller';
import { PrismaModule } from '../prisma.module';
import { NotifyModule } from '../notify/notify.module';

@Module({
  imports: [PrismaModule, NotifyModule],
  controllers: [LeaseController],
  providers: [LeaseService],
  exports: [LeaseService],
})
export class LeaseModule {}
