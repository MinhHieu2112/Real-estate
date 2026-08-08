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
import { calculateTotalRent } from '../common/utils/calculate-rent';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as crypto from 'crypto';
import { SignContractDto } from './dto/sign-contract.dto';

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

    const newStartDate = dto.startDate
      ? new Date(dto.startDate)
      : lease.startDate;
    const newEndDate = dto.endDate ? new Date(dto.endDate) : lease.endDate;

    let computedRent = dto.rent;
    if (computedRent === undefined && (dto.startDate || dto.endDate)) {
      const pricePerDay = lease.property.pricePerDay || 0;
      const { totalRent } = calculateTotalRent(
        newStartDate,
        newEndDate,
        pricePerDay,
      );
      if (totalRent > 0) {
        computedRent = totalRent;
      }
    }

    return await this.prisma.lease.update({
      where: { id },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
        rent: computedRent !== undefined ? computedRent : undefined,
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

    const s3Bucket = process.env.AWS_S3_BUCKET_NAME!;
    const s3Key = `contracts/${lease.application?.id || lease.id}/contract.pdf`;
    const pdfUrl = `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    // Sinh PDF Hợp đồng thực tế bằng pdf-lib & Upload S3
    try {
      const pdfBuffer = await this.createInitialContractPdf(lease);
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: pdfBuffer,
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

    // Sinh JWT Token ký 15 phút (theo yêu cầu hệ thống mới)
    const token = jwt.sign(
      {
        leaseId: lease.id,
        tenantCognitoId: lease.tenantCognitoId,
        managerCognitoId: lease.property.managerCognitoId,
        type: 'contract_signature',
      },
      this.jwtSecret,
      { expiresIn: '15m' },
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
        'Liên kết ký hợp đồng đã hết hạn (15 phút) hoặc không hợp lệ.',
      );
    }
  }

  // 6. Tenant thực hiện Ký hợp đồng (Nhúng chữ ký & Audit Trail SHA-256)
  async signContract(dto: SignContractDto, ipAddress: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(dto.token, this.jwtSecret) as any;
    } catch {
      throw new UnauthorizedException(
        'Liên kết ký hợp đồng đã hết hạn (15 phút) hoặc không hợp lệ.',
      );
    }

    const leaseId = Number(decoded.leaseId);
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: true,
        property: {
          include: {
            manager: true,
            location: true,
          },
        },
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

    // 1. Tạo PDF gốc hoặc nạp từ buffer
    const originalPdfBuffer = await this.createInitialContractPdf(lease);

    // 2. Nhúng chữ ký (nếu có) và vết audit (IP, SHA-256 Hash, Timestamp) vào PDF bằng pdf-lib & crypto
    const { signedPdfBuffer, hash } = await this.embedSignatureAndAudit(
      originalPdfBuffer,
      dto.signatureBase64,
      lease.tenant?.name || 'Tenant',
      lease.tenant?.email || 'N/A',
      ipAddress,
    );

    // 3. Upload bản PDF đã ký lên S3
    const s3Bucket = process.env.AWS_S3_BUCKET_NAME || 'real-estate-app-bucket';
    const s3Key = `contracts/${lease.application?.id || lease.id}/signed_contract.pdf`;
    const signedPdfUrl = `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: signedPdfBuffer,
            ContentType: 'application/pdf',
          }),
        );
      }
    } catch (err) {
      this.logger.warn(
        `Upload S3 PDF đã ký cảnh báo: ${(err as Error).message}`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật Lease thành Pending_payment & lưu Audit metadata
      const updatedLease = await tx.lease.update({
        where: { id: leaseId },
        data: {
          status: LeaseStatus.Pending_payment,
          tenantSignedAt: new Date(),
          tenantSignedIp: ipAddress,
          leaseAgreementUrl: signedPdfUrl,
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

      // 5. Thông báo cho Manager kèm SHA-256 hash log
      void this.notifyService.notifyContractSigned({
        managerCognitoId: lease.property.managerCognitoId,
        tenantName: lease.tenant.name,
        propertyName: lease.property.name,
        applicationId: lease.application?.id || lease.id,
      });

      this.logger.log(
        `Ký hợp đồng thành công! Lease #${leaseId}, Signer IP: ${ipAddress}, SHA-256: ${hash}`,
      );

      return updatedLease;
    });
  }

  // --- Helper Methods ---

  private async createInitialContractPdf(lease: any): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    let y = height - 50;

    page.drawText('HOP DONG THUE BAT DONG SAN', {
      x: 50,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    y -= 25;

    page.drawText(`Ma hop dong: #${lease.id}`, {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(`Ngay khoi tao: ${new Date().toLocaleDateString('vi-VN')}`, {
      x: 350,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 20;

    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 30;

    page.drawText('1. THONG TIN CAC BEN', {
      x: 50,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    y -= 20;

    const managerName = lease.property?.manager?.name || 'Quan ly Bat dong san';
    const managerEmail = lease.property?.manager?.email || 'N/A';
    page.drawText(`Ben cho thue (Manager): ${managerName} (${managerEmail})`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;

    const tenantName = lease.tenant?.name || 'Khach thue';
    const tenantEmail = lease.tenant?.email || 'N/A';
    page.drawText(`Ben thue (Tenant): ${tenantName} (${tenantEmail})`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 30;

    page.drawText('2. THONG TIN BAT DONG SAN & DIEU KHOAN', {
      x: 50,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    y -= 20;

    const propName = lease.property?.name || 'Bat dong san';
    const propAddress = lease.property?.location?.address || 'N/A';
    page.drawText(`Ten Bat dong san: ${propName}`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;
    page.drawText(`Dia chi: ${propAddress}`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;

    const startDateStr = new Date(lease.startDate).toLocaleDateString('vi-VN');
    const endDateStr = new Date(lease.endDate).toLocaleDateString('vi-VN');
    page.drawText(`Thoi han thue: Tu ${startDateStr} den ${endDateStr}`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;

    const rentFormatted = (lease.rent || 0).toLocaleString('vi-VN');
    const depositFormatted = (lease.deposit || 0).toLocaleString('vi-VN');
    page.drawText(`Tien thue: ${rentFormatted} VND`, {
      x: 60,
      y,
      size: 11,
      font: fontBold,
    });
    y -= 18;
    page.drawText(`Tien coc: ${depositFormatted} VND`, {
      x: 60,
      y,
      size: 11,
      font: fontBold,
    });
    y -= 35;

    page.drawText('3. DIEU KHOAN THOA THUAN & PHAP LY', {
      x: 50,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    y -= 20;
    page.drawText('- Ben thue cam ket thanh toan dung han theo quy dinh.', {
      x: 60,
      y,
      size: 10,
      font,
    });
    y -= 15;
    page.drawText('- Ben cho thue dam bao bat dong san du dieu kien su dung.', {
      x: 60,
      y,
      size: 10,
      font,
    });
    y -= 15;
    page.drawText(
      '- Chu ky dien tu tren hop dong nay co gia tri phap ly tuong duong chu ky tay.',
      {
        x: 60,
        y,
        size: 10,
        font,
      },
    );
    y -= 45;

    page.drawText('DAI DIEN BEN CHO THUE', {
      x: 70,
      y,
      size: 11,
      font: fontBold,
    });
    page.drawText('DAI DIEN BEN THUE', {
      x: 370,
      y,
      size: 11,
      font: fontBold,
    });
    y -= 15;
    page.drawText('(Da ky dien tu)', {
      x: 90,
      y,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText('(Cho ky dien tu)', {
      x: 390,
      y,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async embedSignatureAndAudit(
    pdfBuffer: Buffer,
    signatureBase64: string | undefined,
    tenantName: string,
    tenantEmail: string,
    ipAddress: string,
  ): Promise<{ signedPdfBuffer: Buffer; hash: string }> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width } = lastPage.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    if (signatureBase64) {
      try {
        const cleanBase64 = signatureBase64.replace(
          /^data:image\/(png|jpg|jpeg);base64,/,
          '',
        );
        const imageBytes = Buffer.from(cleanBase64, 'base64');
        const signatureImage =
          signatureBase64.includes('image/jpeg') ||
          signatureBase64.includes('image/jpg')
            ? await pdfDoc.embedJpg(imageBytes)
            : await pdfDoc.embedPng(imageBytes);

        lastPage.drawImage(signatureImage, {
          x: 350,
          y: 70,
          width: 140,
          height: 45,
        });
      } catch (err) {
        this.logger.warn(`Loi nhung anh chu ky: ${(err as Error).message}`);
      }
    }

    const auditY = 20;

    lastPage.drawRectangle({
      x: 40,
      y: auditY,
      width: width - 80,
      height: 35,
      borderColor: rgb(0.2, 0.5, 0.3),
      borderWidth: 1,
      color: rgb(0.95, 0.98, 0.95),
    });

    const initialBytes = await pdfDoc.save();
    const hash = crypto.createHash('sha256').update(initialBytes).digest('hex');
    const signedAt = new Date().toISOString();

    lastPage.drawText(
      `[E-SIGN AUDIT TRAIL] Signer: ${tenantName} (${tenantEmail}) | IP: ${ipAddress}`,
      {
        x: 50,
        y: auditY + 20,
        size: 8,
        font: fontBold,
        color: rgb(0.1, 0.4, 0.2),
      },
    );

    lastPage.drawText(
      `Signed At: ${signedAt} | SHA-256 Hash: ${hash.substring(0, 36)}...`,
      {
        x: 50,
        y: auditY + 8,
        size: 7,
        font,
        color: rgb(0.2, 0.2, 0.2),
      },
    );

    const finalPdfBytes = await pdfDoc.save();
    return {
      signedPdfBuffer: Buffer.from(finalPdfBytes),
      hash,
    };
  }
}
