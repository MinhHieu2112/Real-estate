import { Module } from '@nestjs/common';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { PrismaModule } from '../prisma.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [PrismaModule, LocationModule],
  controllers: [PropertyController],
  providers: [PropertyService],
})
export class PropertyModule {}
