import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotifyGateway } from './notify.gateway';
import { CreateNotificationDto } from './dto/create-notify.dto';
import { NotificationType } from '../generated/prisma/enums';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);
  private readonly sesClient = new SESClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotifyGateway))
    private readonly notifyGateway: NotifyGateway,
  ) {}

  private async sendSesEmail(params: {
    toEmail: string;
    subject: string;
    content: string;
  }) {
    const senderEmail = process.env.SES_SENDER_EMAIL || '';
    if (!senderEmail) {
      this.logger.error('SES_SENDER_EMAIL is not configured');
      return;
    }

    if (!params.toEmail) {
      this.logger.error('Recipient email is not provided');
      return;
    }

    try {
      await this.sesClient.send(
        new SendEmailCommand({
          Source: senderEmail,
          Destination: {
            ToAddresses: [params.toEmail],
          },
          Message: {
            Subject: {
              Data: params.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: `
                  <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>${params.subject}</h2>
                    <p>${params.content}</p>
                    <hr/>
                    <small>Đây là email tự động, vui lòng không phản hồi.</small>
                  </div>
                `,
                Charset: 'UTF-8',
              },
              Text: {
                Data: params.content,
                Charset: 'UTF-8',
              },
            },
          },
        }),
      );
    } catch (error) {
      this.logger.error('Error sending SES email:', error);
    }
  }

  // 1. Tạo thông báo: Lưu DB + WebSocket (realtime) + SNS (email/SMS)
  async createNotification(dto: CreateNotificationDto): Promise<any> {
    const notification = await this.prisma.notification.upsert({
      where: {
        receiverCognitoId_applicationId_type: {
          receiverCognitoId: dto.receiverCognitoId,
          applicationId: dto.applicationId,
          type: dto.type,
        },
      },
      update: {
        content: dto.content,
        applicationId: dto.applicationId,
      },
      create: {
        receiverCognitoId: dto.receiverCognitoId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        applicationId: dto.applicationId,
      },
    });

    this.notifyGateway.sendNotificationToUser(
      dto.receiverCognitoId,
      notification,
    );

    void this.sendSesEmail({
      toEmail: dto.receiverEmail || '',
      subject: dto.title,
      content: dto.content,
    });

    return notification;
  }

  // 2. Thông báo Manager: có đơn đăng ký thuê mới
  async notifyNewApplication(data: {
    managerCognitoId: string;
    managerEmail?: string;
    tenantName: string;
    propertyName: string;
    applicationId: number;
  }): Promise<any> {
    return await this.createNotification({
      receiverCognitoId: data.managerCognitoId,
      receiverEmail: data.managerEmail,
      type: NotificationType.New_application,
      title: 'Đơn đăng ký thuê mới',
      content: `Người dùng ${data.tenantName} đã gửi đơn đăng ký thuê bất động sản "${data.propertyName}".`,
      applicationId: data.applicationId,
    });
  }

  // 3. Thông báo Tenant: có đơn được Duyệt / Từ chối
  async notifyApplicationStatus(data: {
    tenantCognitoId: string;
    tenantEmail?: string;
    propertyName: string;
    status: 'Approved' | 'Denied';
    applicationId: number;
  }): Promise<any> {
    const isApproved = data.status === 'Approved';
    return await this.createNotification({
      receiverCognitoId: data.tenantCognitoId,
      receiverEmail: data.tenantEmail,
      type: isApproved
        ? NotificationType.Application_approved
        : NotificationType.Application_denied,
      title: isApproved ? 'Đơn thuê được chấp nhận' : 'Đơn thuê bị từ chối',
      content: isApproved
        ? `Đơn đăng ký thuê bất động sản "${data.propertyName}" của bạn đã được duyệt.`
        : `Đơn đăng ký thuê bất động sản "${data.propertyName}" hiện chưa được chấp thuận. Bạn có thể tham khảo các bất động sản khác phù hợp.`,
      applicationId: data.applicationId,
    });
  }

  // 4. Lấy danh sách thông báo của người dùng
  async getUserNotifications(receiverCognitoId: string): Promise<any> {
    return await this.prisma.notification.findMany({
      where: { receiverCognitoId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 5. Đánh dấu 1 thông báo đã đọc
  async markAsRead(id: number): Promise<any> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification)
      throw new NotFoundException(`Notification #${id} not found`);
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  // 6. Đánh dấu tất cả thông báo của người dùng là đã đọc
  async markAllAsRead(receiverCognitoId: string): Promise<any> {
    return await this.prisma.notification.updateMany({
      where: { receiverCognitoId, isRead: false },
      data: { isRead: true },
    });
  }
}
