import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  ParseIntPipe,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages.dto';
import { GetConversationsQueryDto } from './dto/get-conversations.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/get-user.decorator';
import { CognitoUser } from '../auth/jwt-auth.guard';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('conversations')
  getOrCreateConversation(@Body() dto: CreateConversationDto) {
    return this.messageService.getOrCreateConversation(dto);
  }

  @Get('conversations')
  getConversations(
    @Query() dto: GetConversationsQueryDto,
    @CurrentUser() user: CognitoUser,
  ) {
    return this.messageService.getConversations({
      ...dto,
      userCognitoId: user.sub,
    });
  }

  @Post()
  sendMessage(@Body() dto: CreateMessageDto, @CurrentUser() user: CognitoUser) {
    // Always use the authenticated user as the sender
    return this.messageService.sendMessage({
      ...dto,
      senderCognitoId: user.sub,
    });
  }

  @Get()
  getMessages(@Query() dto: GetMessagesQueryDto) {
    return this.messageService.getMessages(dto);
  }

  @Patch('conversations/:conversationId/read')
  markAsRead(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser() user: CognitoUser,
    @Body() body: Pick<MarkAsReadDto, 'userCognitoId'>,
  ) {
    return this.messageService.markAsRead({
      conversationId,
      userCognitoId: user.sub || body.userCognitoId,
    });
  }
}
