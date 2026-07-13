import { Module } from '@nestjs/common';
import { LeaseService } from './lease.service';
import { LeaseController } from './lease.controller';

@Module({
  controllers: [LeaseController],
  providers: [LeaseService],
})
export class LeaseModule {}
