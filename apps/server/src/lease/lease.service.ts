import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotifyService } from '../notify/notify.service';
import { UpdateLeaseContentDto } from './dto/update-lease-content.dto';
import { LeaseStatus, PaymentStatus } from '../generated/prisma/enums';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class LeaseService {
  private readonly logger = new Logger(LeaseService.name);
  private readonly jwtSecret = process.env.JWT_SECRET!;
  private readonly s3Client = new S3Client({
    region: process.env.AWS_REGION,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifyService: NotifyService,
  ) {}

  // Lấy tất cả hợp đồng
  async findAll() {
    const leases = await this.prisma.lease.findMany({
      include: {
        tenant: true,
        property: {
          include: {
            location: true,
          },
        },
        application: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return leases;
  }

  // 1. Lấy danh sách hợp đồng thuộc quản lý của Manager
  async findManagerLeases(managerCognitoId: string) {
    return await this.prisma.lease.findMany({
      where: {
        property: {
          managerCognitoId,
        },
      },
      include: {
        tenant: true,
        property: {
          include: {
            location: true,
          },
        },
        application: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 2. Chi tiết hợp đồng
  async getLeaseDetail(id: number) {
    const lease = await this.prisma.lease.findUnique({
      where: { id },
      include: {
        tenant: true,
        property: {
          include: {
            location: true,
            manager: true,
          },
        },
        application: true,
        payments: true,
      },
    });

    if (!lease) {
      throw new NotFoundException(`Không tìm thấy hợp đồng #${id}`);
    }
    return lease;
  }

  // 3. Manager cập nhật nội dung HĐ (trước khi gửi)
  async updateLeaseContent(
    id: number,
    managerCognitoId: string,
    dto: UpdateLeaseContentDto,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!lease) {
      throw new NotFoundException(`Không tìm thấy hợp đồng #${id}`);
    }

    if (lease.property.managerCognitoId !== managerCognitoId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa hợp đồng này');
    }

    if (lease.status !== 'Draft') {
      throw new BadRequestException(
        'Chỉ có thể chỉnh sửa hợp đồng khi đang ở trạng thái DRAFT',
      );
    }

    return await this.prisma.lease.update({
      where: { id },
      data: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        rent: dto.rent !== undefined ? dto.rent : undefined,
        deposit: dto.deposit !== undefined ? dto.deposit : undefined,
      },
      include: {
        tenant: true,
        property: true,
      },
    });
  }

  // 4. Manager Gửi hợp đồng cho Tenant (Sinh PDF, Upload S3, Tạo URL 30p, Gửi Notification/Email)
  async sendContractToTenant(id: number, managerCognitoId: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { id },
      include: {
        tenant: true,
        property: {
          include: {
            location: true,
            manager: true,
          },
        },
        application: true,
      },
    });

    if (!lease) {
      throw new NotFoundException(`Không tìm thấy hợp đồng #${id}`);
    }

    if (lease.property.managerCognitoId !== managerCognitoId) {
      throw new ForbiddenException('Bạn không có quyền gửi hợp đồng này');
    }

    const s3Bucket = process.env.AWS_S3_BUCKET_NAME || 'real-estate-app-bucket';
    const s3Key = `contracts/${lease.application?.id || lease.id}/contract.pdf`;
    const pdfUrl = `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    // Upload giả lập / thực tế lên S3
    try {
      const mockPdfBuffer = Buffer.from(
        `HỢP ĐỒNG THUÊ BẤT ĐỘNG SẢN\nProperty: ${lease.property.name}\nTenant: ${lease.tenant.name}\nRent: ${lease.rent}\nDeposit: ${lease.deposit}`,
        'utf-8',
      );
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: mockPdfBuffer,
            ContentType: 'application/pdf',
          }),
        );
      }
    } catch (err) {
      this.logger.warn(
        `Upload S3 hợp đồng cảnh báo: ${(err as Error).message}`,
      );
    }

    // Cập nhật trạng thái hợp đồng thành Pending_signature
    const updatedLease = await this.prisma.lease.update({
      where: { id },
      data: {
        status: LeaseStatus.Pending_signature,
        leaseAgreementUrl: pdfUrl,
      },
    });

    // Sinh JWT Token ký 30 phút
    const token = jwt.sign(
      {
        leaseId: lease.id,
        tenantCognitoId: lease.tenantCognitoId,
        managerCognitoId: lease.property.managerCognitoId,
        type: 'contract_signature',
      },
      this.jwtSecret,
      { expiresIn: '30m' },
    );

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const signUrl = `${clientUrl}/sign?token=${token}`;

    // Gửi email và thông báo
    await this.notifyService.notifyContractSent({
      tenantCognitoId: lease.tenantCognitoId,
      tenantEmail: lease.tenant.email,
      propertyName: lease.property.name,
      applicationId: lease.application?.id || lease.id,
      signUrl,
    });

    return {
      lease: updatedLease,
      signUrl,
    };
  }

  // 5. Giải mã Token ký cho trang Public Sign của Tenant
  async getSigningPage(token: string) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      if (decoded.type !== 'contract_signature') {
        throw new UnauthorizedException('Token ký hợp đồng không hợp lệ');
      }

      const lease = await this.prisma.lease.findUnique({
        where: { id: decoded.leaseId },
        include: {
          tenant: true,
          property: {
            include: {
              location: true,
              manager: true,
            },
          },
          application: true,
        },
      });

      if (!lease) {
        throw new NotFoundException('Hợp đồng không tồn tại');
      }

      return {
        lease,
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
      };
    } catch {
      throw new UnauthorizedException(
        'Liên kết ký hợp đồng đã hết hạn (30 phút) hoặc không hợp lệ.',
      );
    }
  }

  // 6. Tenant thực hiện Ký hợp đồng
  async signContract(token: string, ipAddress: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(token, this.jwtSecret) as any;
    } catch {
      throw new UnauthorizedException(
        'Liên kết ký hợp đồng đã hết hạn hoặc không hợp lệ.',
      );
    }

    const leaseId = Number(decoded.leaseId);
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: true,
        property: true,
        application: true,
      },
    });

    if (!lease) {
      throw new NotFoundException('Hợp đồng không tồn tại');
    }

    if (lease.status !== 'Pending_signature' && lease.status !== 'Draft') {
      throw new BadRequestException(
        'Hợp đồng này đã được ký trước đó hoặc không thể ký.',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật Lease thành Pending_payment
      const updatedLease = await tx.lease.update({
        where: { id: leaseId },
        data: {
          status: LeaseStatus.Pending_payment,
          tenantSignedAt: new Date(),
          tenantSignedIp: ipAddress,
        },
      });

      // 2. Đánh dấu Property đã được thuê (Rented)
      await tx.property.update({
        where: { id: lease.propertyId },
        data: {
          status: 'Rented',
        },
      });

      // 3. Tự động Denied các đơn ứng tuyển khác đang ở trạng thái Pending cho dự án này
      await tx.application.updateMany({
        where: {
          propertyId: lease.propertyId,
          status: 'Pending',
          id: { not: lease.application?.id || 0 },
        },
        data: {
          status: 'Denied',
        },
      });

      // 4. Tạo khoản thanh toán cọc/tiền thuê mẫu mặc định (nếu chưa có)
      const initialAmount = (lease.deposit || 0) + (lease.rent || 0);
      if (initialAmount > 0) {
        const existingPayments = await tx.payment.findFirst({
          where: { leaseId },
        });

        if (!existingPayments) {
          await tx.payment.create({
            data: {
              leaseId,
              amountDue: initialAmount,
              amountPaid: 0,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày sau
              paymentDate: new Date(),
              paymentStatus: PaymentStatus.Pending,
            },
          });
        }
      }

      // 5. Thông báo cho Manager
      void this.notifyService.notifyContractSigned({
        managerCognitoId: lease.property.managerCognitoId,
        tenantName: lease.tenant.name,
        propertyName: lease.property.name,
        applicationId: lease.application?.id || lease.id,
      });

      return updatedLease;
    });
  }
}
