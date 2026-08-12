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
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);
  private mailer: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotifyGateway))
    private readonly notifyGateway: NotifyGateway,
  ) {
    // 🛠️ Khởi tạo Transporter sử dụng linh hoạt MAIL_HOST và MAIL_PORT từ .env
    this.mailer = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 587,
      secure: process.env.MAIL_PORT === '465', // true nếu port là 465 (SSL)
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  private async sendEmail(params: {
    toEmail: string;
    subject: string;
    content: string;
  }) {
    const fromEmail = process.env.MAIL_USER;

    if (!fromEmail) {
      this.logger.error('MAIL_USER is not configured');
      return;
    }

    if (!params.toEmail) {
      this.logger.error('Recipient email is not provided');
      return;
    }

    const isHtml = params.content.trim().startsWith('<');
    const htmlBody = isHtml
      ? params.content
      : `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>${params.subject}</h2>
          <p>${params.content}</p>
          <hr/>
          <small>Đây là email tự động, vui lòng không phản hồi.</small>
        </div>
      `;

    try {
      await this.mailer.sendMail({
        from: `"Real Estate System" <${fromEmail}>`,
        to: params.toEmail,
        subject: params.subject,
        html: htmlBody,
      });
    } catch (error) {
      this.logger.error('Error sending email via SMTP:', error);
    }
  }

  // 1. Tạo thông báo: Lưu DB + WebSocket (realtime) + Email
  async createNotification(
    dto: CreateNotificationDto & { customHtmlEmail?: string },
  ): Promise<any> {
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

    // Bắn realtime qua Socket
    this.notifyGateway.sendNotificationToUser(
      dto.receiverCognitoId,
      notification,
    );

    // Gửi email (Ưu tiên customHtmlEmail nếu có, không thì dùng content mặc định)
    void this.sendEmail({
      toEmail: dto.receiverEmail || '',
      subject: dto.title,
      content: dto.customHtmlEmail || dto.content,
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
      content: `Người dùng ${data.tenantName} đã gửi đơn đăng ký thuê dự án "${data.propertyName}".`,
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
        ? `Đơn đăng ký thuê dự án "${data.propertyName}" của bạn đã được duyệt.`
        : `Đơn đăng ký thuê dự án "${data.propertyName}" hiện chưa được chấp thuận. Bạn có thể tham khảo các dự án khác phù hợp.`,
      applicationId: data.applicationId,
    });
  }

  // 4. Thông báo Tenant: Hợp đồng đã được gửi (Đã fix lỗi gửi trùng email)
  async notifyContractSent(data: {
    tenantCognitoId: string;
    tenantEmail?: string;
    propertyName: string;
    applicationId: number;
    signUrl: string;
  }): Promise<any> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Hợp đồng thuê bất động sản "${data.propertyName}" đã sẵn sàng</h2>
        <p>Kính gửi quý khách,</p>
        <p>Quản lý bất động sản đã chuẩn bị và gửi hợp đồng thuê cho dự án <strong>${data.propertyName}</strong>.</p>
        <p>Vui lòng nhấp vào nút bên dưới để xem chi tiết và thực hiện ký trực tuyến (liên kết có hiệu lực trong 30 phút):</p>
        <div style="margin: 25px 0;">
          <a href="${data.signUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ký hợp đồng ngay</a>
        </div>
        <p style="font-size: 12px; color: #666;">Hoặc truy cập qua liên kết: <a href="${data.signUrl}">${data.signUrl}</a></p>
        <hr/>
        <small>Đây là email tự động từ hệ thống quản lý bất động sản.</small>
      </div>
    `;

    // Truyền customHtmlEmail vào để createNotification chỉ gửi DUY NHẤT 1 EMAIL HTML đẹp
    return await this.createNotification({
      receiverCognitoId: data.tenantCognitoId,
      receiverEmail: data.tenantEmail,
      type: NotificationType.Contract_sent,
      title: 'Hợp đồng thuê đã sẵn sàng để ký',
      content: `Hợp đồng thuê dự án "${data.propertyName}" đã được gửi. Vui lòng kiểm tra và ký trực tuyến.`,
      applicationId: data.applicationId,
      customHtmlEmail: htmlContent,
    });
  }

  // 5. Thông báo Manager: Tenant đã ký hợp đồng
  async notifyContractSigned(data: {
    managerCognitoId: string;
    managerEmail?: string;
    tenantName: string;
    propertyName: string;
    applicationId: number;
  }): Promise<any> {
    return await this.createNotification({
      receiverCognitoId: data.managerCognitoId,
      receiverEmail: data.managerEmail,
      type: NotificationType.Contract_signed,
      title: 'Hợp đồng đã được ký trực tuyến',
      content: `Người dùng ${data.tenantName} đã ký hợp đồng cho dự án "${data.propertyName}". Vui lòng kiểm tra và xác nhận thanh toán.`,
      applicationId: data.applicationId,
    });
  }

  // 6. Thông báo Tenant: Thanh toán đã được xác nhận
  async notifyPaymentConfirmed(data: {
    tenantCognitoId: string;
    tenantEmail?: string;
    propertyName: string;
    applicationId: number;
    amountPaid: number;
  }): Promise<any> {
    return await this.createNotification({
      receiverCognitoId: data.tenantCognitoId,
      receiverEmail: data.tenantEmail,
      type: NotificationType.Payment_confirmed,
      title: 'Xác nhận thanh toán hợp đồng',
      content: `Thanh toán số tiền ${data.amountPaid.toLocaleString('vi-VN')} VNĐ cho dự án "${data.propertyName}" đã được xác nhận thành công. Hợp đồng hiện đang có hiệu lực.`,
      applicationId: data.applicationId,
    });
  }

  // 7. Lấy danh sách thông báo của người dùng
  async getUserNotifications(receiverCognitoId: string): Promise<any> {
    return await this.prisma.notification.findMany({
      where: { receiverCognitoId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 8. Đánh dấu 1 thông báo đã đọc
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

  // 9. Đánh dấu tất cả thông báo của người dùng là đã đọc
  async markAllAsRead(receiverCognitoId: string): Promise<any> {
    return await this.prisma.notification.updateMany({
      where: { receiverCognitoId, isRead: false },
      data: { isRead: true },
    });
  }
}
