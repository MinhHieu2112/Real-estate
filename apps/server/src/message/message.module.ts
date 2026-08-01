import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { MessageController } from './message.controller';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MessageController],
  providers: [
    {
      provide: MessageGateway,
      useClass: MessageGateway,
    },
    {
      provide: MessageService,
      useClass: MessageService,
    },
  ],
  exports: [MessageService, MessageGateway],
})
export class MessageModule {}
