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
import { verifyWsToken } from '../auth/ws-jwt.helper';

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  namespace: '/notify',
})
export class NotifyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket) {
    // Verify JWT before allowing connection
    const user = await verifyWsToken(client);
    if (!user) {
      client.emit('error', { message: 'Unauthorized: invalid token' });
      client.disconnect();
      return;
    }

    // Store verified identity and auto-join user's notification room
    client.data = { cognitoId: user.sub, role: user.role };
    client.join(user.sub);
  }

  handleDisconnect(client: Socket) {
    client.disconnect();
  }

  // Allow client to explicitly join their notification room
  @SubscribeMessage('joinNotification')
  handleJoinNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { cognitoId: string },
  ) {
    // Only allow joining own room (from verified JWT sub)
    const verifiedId = client.data?.cognitoId;
    if (verifiedId && verifiedId === data?.cognitoId) {
      client.join(verifiedId);
    }
  }

  // Send real-time notification to a user
  sendNotificationToUser(receiverCognitoId: string, notification: any) {
    if (this.server) {
      this.server.to(receiverCognitoId).emit('newNotification', notification);
    }
  }
}
