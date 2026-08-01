import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  ParseIntPipe,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages.dto';
import { GetConversationsQueryDto } from './dto/get-conversations.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';

@ApiTags('Messages')
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('conversations')
  getOrCreateConversation(@Body() dto: CreateConversationDto) {
    return this.messageService.getOrCreateConversation(dto);
  }

  @Get('conversations')
  getConversations(@Query() dto: GetConversationsQueryDto) {
    return this.messageService.getConversations(dto);
  }

  @Post()
  sendMessage(@Body() dto: CreateMessageDto) {
    return this.messageService.sendMessage(dto);
  }

  @Get()
  getMessages(@Query() dto: GetMessagesQueryDto) {
    return this.messageService.getMessages(dto);
  }

  @Patch('conversations/:conversationId/read')
  markAsRead(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() body: Pick<MarkAsReadDto, 'userCognitoId'>,
  ) {
    return this.messageService.markAsRead({
      conversationId,
      userCognitoId: body.userCognitoId,
    });
  }
}
