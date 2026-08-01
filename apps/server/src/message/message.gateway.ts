import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Inject, forwardRef } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class MessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;

  constructor(
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
  ) {}

  handleConnection(client: Socket) {
    const cognitoId = client.handshake.query.cognitoId as string;
    if (!cognitoId) {
      client.disconnect();
      return;
    }
    client.data = { cognitoId };
  }

  handleDisconnect(client: Socket) {
    client.disconnect();
  }

  @SubscribeMessage('joinConversation')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    client.join(`conv:${data.conversationId}`);
  }

  @SubscribeMessage('leaveConversation')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    client.leave(`conv:${data.conversationId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: Pick<CreateMessageDto, 'conversationId' | 'content'>,
  ) {
    const senderCognitoId: string = client.data?.cognitoId;
    if (!senderCognitoId)
      return client.emit('error', { message: 'Unauthorized' });

    try {
      const message = await this.messageService.sendMessage({
        ...dto,
        senderCognitoId,
      });
      return message;
    } catch (e: any) {
      client.emit('error', { message: e?.message ?? 'Failed to send message' });
    }
  }

  // Phát sóng tin nhắn mới đến tất cả client trong room `conv:${conversationId}`
  broadcastNewMessage(message: any) {
    if (this.server) {
      this.server
        .to(`conv:${message.conversationId}`)
        .emit('newMessage', message);
    }
  }
}
