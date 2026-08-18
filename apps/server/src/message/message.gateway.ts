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
import { verifyWsToken } from '../auth/ws-jwt.helper';

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

@WebSocketGateway({
  cors: { origin: allowedOrigins, credentials: true },
  namespace: '/chat',
})
export class MessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;

  constructor(
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
  ) {}

  async handleConnection(client: Socket) {
    // Verify JWT before allowing connection
    const user = await verifyWsToken(client);
    if (!user) {
      client.emit('error', { message: 'Unauthorized: invalid token' });
      client.disconnect();
      return;
    }

    // Store verified identity from JWT — not from client-supplied query
    client.data = { cognitoId: user.sub, role: user.role };
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
    // senderCognitoId always comes from verified JWT, not from client
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

  // Broadcast new message to all clients in the conversation room
  broadcastNewMessage(message: any) {
    if (this.server) {
      this.server
        .to(`conv:${message.conversationId}`)
        .emit('newMessage', message);
    }
  }

  // Broadcast deleted message event to all clients in the conversation room
  broadcastMessageDeleted(data: { messageId: number; conversationId: number }) {
    if (this.server) {
      this.server
        .to(`conv:${data.conversationId}`)
        .emit('messageDeleted', data);
    }
  }

  // Broadcast deleted conversation event to all clients in the conversation room
  broadcastConversationDeleted(data: { conversationId: number }) {
    if (this.server) {
      this.server
        .to(`conv:${data.conversationId}`)
        .emit('conversationDeleted', data);
    }
  }
}
