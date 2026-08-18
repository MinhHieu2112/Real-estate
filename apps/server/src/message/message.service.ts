import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages.dto';
import { GetConversationsQueryDto } from './dto/get-conversations.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { MessageGateway } from './message.gateway';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessageGateway))
    private readonly messageGateway: MessageGateway,
  ) {}

  // Tạo conversation nếu chưa có, hoặc trả về conversation hiện tại (kèm thông tin peer)
  async getOrCreateConversation(dto: CreateConversationDto) {
    const { tenantCognitoId, managerCognitoId } = dto;
    const conversation = await this.prisma.conversation.upsert({
      where: {
        tenantCognitoId_managerCognitoId: { tenantCognitoId, managerCognitoId },
      },
      update: {},
      create: { tenantCognitoId, managerCognitoId },
    });

    const [manager, tenant] = await Promise.all([
      this.prisma.manager.findUnique({
        where: { cognitoId: managerCognitoId },
        select: { cognitoId: true, name: true, email: true },
      }),
      this.prisma.tenant.findUnique({
        where: { cognitoId: tenantCognitoId },
        select: { cognitoId: true, name: true, email: true },
      }),
    ]);

    const peerData = manager || tenant;

    return {
      ...conversation,
      unreadCount: 0,
      peer: peerData
        ? {
            cognitoId: peerData.cognitoId,
            name: peerData.name || 'Người dùng',
            email: peerData.email || '',
          }
        : {
            cognitoId: managerCognitoId,
            name: 'Người dùng',
            email: '',
          },
    };
  }

  // Lấy danh sách conversations của user, kèm thông tin đối phương
  async getConversations(dto: GetConversationsQueryDto) {
    const { userCognitoId } = dto;

    // 1. Tìm tất cả cuộc trò chuyện mà user tham gia (dù là Tenant hay Manager)
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { tenantCognitoId: userCognitoId },
          { managerCognitoId: userCognitoId },
        ],
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      include: {
        message: {
          where: { isRead: false, senderCognitoId: { not: userCognitoId } },
          select: { id: true },
        },
      },
    });

    if (conversations.length === 0) return [];

    // 2. Gom tất cả peerCognitoId (ID của đối phương trong từng conversation)
    const peerCognitoIds = conversations.map((c) =>
      c.tenantCognitoId === userCognitoId
        ? c.managerCognitoId
        : c.tenantCognitoId,
    );

    // 3. Query SONG SONG cả Manager và Tenant cho danh sách peerCognitoIds
    const [managers, tenants] = await Promise.all([
      this.prisma.manager.findMany({
        where: { cognitoId: { in: peerCognitoIds } },
        select: { cognitoId: true, name: true, email: true },
      }),
      this.prisma.tenant.findMany({
        where: { cognitoId: { in: peerCognitoIds } },
        select: { cognitoId: true, name: true, email: true },
      }),
    ]);

    // 4. Gộp kết quả vào Map
    const peerMap = new Map(
      [...managers, ...tenants].map((p) => [p.cognitoId, p]),
    );

    // 5. Map dữ liệu trả về cho Frontend
    return conversations.map((conv) => {
      const peerCognitoId =
        conv.tenantCognitoId === userCognitoId
          ? conv.managerCognitoId
          : conv.tenantCognitoId;

      const peerData = peerMap.get(peerCognitoId);

      return {
        id: conv.id,
        tenantCognitoId: conv.tenantCognitoId,
        managerCognitoId: conv.managerCognitoId,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.message.length,
        peer: peerData
          ? {
              cognitoId: peerData.cognitoId,
              name: peerData.name,
              email: peerData.email,
            }
          : {
              cognitoId: peerCognitoId,
              name: 'Người dùng', // Fallback an toàn nếu data user trong DB bị thiếu
              email: '',
            },
      };
    });
  }

  // Gửi tin nhắn và cập nhật lastMessage trên conversation (atomic)
  async sendMessage(dto: CreateMessageDto) {
    const { conversationId, senderCognitoId, content } = dto;

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation)
      throw new NotFoundException(`Conversation #${conversationId} not found`);

    const isMember =
      conversation.tenantCognitoId === senderCognitoId ||
      conversation.managerCognitoId === senderCognitoId;

    if (!isMember)
      throw new BadRequestException(
        'Sender does not belong to this conversation',
      );

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderCognitoId, content },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessage: content, lastMessageAt: new Date() },
      }),
    ]);
    this.messageGateway.broadcastNewMessage(message);

    return message;
  }

  // Lấy 50 messages mới nhất, đảo thứ tự để hiển thị cũ → mới
  async getMessages(dto: GetMessagesQueryDto) {
    const { conversationId, limit = 50 } = dto;

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation)
      throw new NotFoundException(`Conversation #${conversationId} not found`);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { id: 'desc' },
      take: limit,
    });

    return [...messages].reverse();
  }

  // Đánh dấu đã đọc tất cả tin nhắn của đối phương trong conversation
  async markAsRead(dto: MarkAsReadDto) {
    const { conversationId, userCognitoId } = dto;

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { tenantCognitoId: true, managerCognitoId: true },
    });

    if (!conversation)
      throw new NotFoundException(`Conversation #${conversationId} not found`);

    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        isRead: false,
        senderCognitoId: { not: userCognitoId },
      },
      data: { isRead: true },
    });

    return { updatedCount: result.count };
  }

  // Xóa tin nhắn (chỉ cho phép chính người gửi xóa)
  async deleteMessage(id: number, userCognitoId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException(`Message #${id} not found`);
    }

    if (message.senderCognitoId !== userCognitoId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    const conversationId = message.conversationId;

    await this.prisma.$transaction(async (tx) => {
      await tx.message.delete({
        where: { id },
      });

      const latestMessage = await tx.message.findFirst({
        where: { conversationId },
        orderBy: { id: 'desc' },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: latestMessage ? latestMessage.content : null,
          lastMessageAt: latestMessage ? latestMessage.createdAt : null,
        },
      });
    });

    this.messageGateway.broadcastMessageDeleted({
      messageId: id,
      conversationId,
    });

    return { id, conversationId };
  }

  // Xóa toàn bộ cuộc trò chuyện (và toàn bộ tin nhắn)
  async deleteConversation(conversationId: number, userCognitoId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation #${conversationId} not found`);
    }

    const isMember =
      conversation.tenantCognitoId === userCognitoId ||
      conversation.managerCognitoId === userCognitoId;

    if (!isMember) {
      throw new ForbiddenException(
        'You do not have permission to delete this conversation',
      );
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    this.messageGateway.broadcastConversationDeleted({ conversationId });

    return { conversationId };
  }
}
