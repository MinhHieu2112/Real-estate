import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notify',
})
export class NotifyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const cognitoId = client.handshake.query.cognitoId as string;
    if (cognitoId) {
      client.join(cognitoId);
    }
  }

  handleDisconnect(client: Socket) {
    client.disconnect();
  }

  // Cho phép Client chủ động gia nhập phòng theo cognitoId của mình
  @SubscribeMessage('joinNotification')
  handleJoinNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { cognitoId: string },
  ) {
    if (data?.cognitoId) {
      client.join(data.cognitoId);
    }
  }

  // Gửi thông báo thời gian thực tới 1 user qua phòng cognitoId
  sendNotificationToUser(receiverCognitoId: string, notification: any) {
    if (this.server) {
      this.server.to(receiverCognitoId).emit('newNotification', notification);
    }
  }
}
