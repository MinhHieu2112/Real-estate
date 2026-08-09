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
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as jwt from 'jsonwebtoken';
import { PDFDocument, rgb } from 'pdf-lib';
import * as crypto from 'crypto';
import { SignContractDto } from './dto/sign-contract.dto';
import fontkit from '@pdf-lib/fontkit';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

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
    return await this.formatLeasesWithPresignedUrl(leases);
  }

  // 1. Lấy danh sách hợp đồng thuộc quản lý của Manager
  async findManagerLeases(managerCognitoId: string) {
    const leases = await this.prisma.lease.findMany({
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
    return await this.formatLeasesWithPresignedUrl(leases);
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
    return await this.formatLeaseWithPresignedUrl(lease);
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
      const totalRent =
        (lease.property.pricePerMonth || 0) +
        lease.property.applicationFee +
        lease.property.securityDeposit;
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
        managerSignedAt: null,
        managerSignedIp: null,
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

    // Kiểm tra quyền sở hữu hợp đồng
    if (lease.property.managerCognitoId !== managerCognitoId) {
      throw new ForbiddenException('Bạn không có quyền gửi hợp đồng này');
    }

    // Bắt buộc Manager phải xem và ký trước khi gửi hợp đồng cho Tenant
    if (!lease.managerSignedAt) {
      throw new BadRequestException(
        'Quản lý phải xem và ký hợp đồng trước khi gửi cho Bên thuê.',
      );
    }

    const s3Bucket = process.env.AWS_S3_BUCKET_NAME!;
    const s3Key = `contracts/${lease.application?.id || lease.id}/contract.pdf`;
    const pdfUrl = `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

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

    const clientUrl = process.env.CLIENT_URL!;
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
      lease: await this.formatLeaseWithPresignedUrl(updatedLease),
      signUrl,
    };
  }

  // 4b. Manager ký hợp đồng
  async signManagerContract(
    id: number,
    managerCognitoId: string,
    signatureBase64: string | undefined,
    ipAddress: string = '127.0.0.1',
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            manager: true,
            location: true,
          },
        },
        tenant: true,
        application: true,
      },
    });

    if (!lease) {
      throw new NotFoundException(`Không tìm thấy hợp đồng #${id}`);
    }

    if (lease.property.managerCognitoId !== managerCognitoId) {
      throw new ForbiddenException('Bạn không có quyền ký hợp đồng này');
    }

    // 1. Tạo PDF gốc
    const originalPdfBuffer = await this.createInitialContractPdf(lease);

    // 2. Nhúng chữ ký Quản lý
    const { signedPdfBuffer } = await this.embedManagerSignatureAndAudit(
      originalPdfBuffer,
      signatureBase64,
      lease.property?.manager?.name || 'Manager',
      lease.property?.manager?.email || 'N/A',
      ipAddress,
    );

    // 3. Upload bản PDF đã ký của Manager lên S3
    const s3Bucket = process.env.AWS_S3_BUCKET_NAME!;
    const s3Key = `contracts/${lease.application?.id || lease.id}/contract.pdf`;
    const pdfUrl = `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          Body: signedPdfBuffer,
          ContentType: 'application/pdf',
        }),
      );
      this.logger.log(`Manager đã ký và upload PDF hợp đồng lên S3: ${s3Key}`);
    } catch (err) {
      this.logger.error(
        `Upload S3 PDF hợp đồng Manager ký THẤT BẠI: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new BadRequestException(
        `Không thể upload PDF hợp đồng Manager ký lên S3: ${(err as Error).message}`,
      );
    }

    // 4. Cập nhật Lease trong DB
    const updatedLease = await this.prisma.lease.update({
      where: { id },
      data: {
        managerSignedAt: new Date(),
        managerSignedIp: ipAddress,
        leaseAgreementUrl: pdfUrl,
      },
    });

    return await this.formatLeaseWithPresignedUrl(updatedLease);
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
        lease: await this.formatLeaseWithPresignedUrl(lease),
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

    // 1. Nạp PDF contract.pdf đã có chữ ký Manager từ S3 (nếu có)
    let originalPdfBuffer: Buffer;
    const s3Bucket = process.env.AWS_S3_BUCKET_NAME!;
    const originalKey = `contracts/${lease.application?.id || lease.id}/contract.pdf`;

    try {
      const getObjResponse = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: s3Bucket,
          Key: originalKey,
        }),
      );
      const byteArray = await getObjResponse.Body?.transformToByteArray();
      if (byteArray) {
        originalPdfBuffer = Buffer.from(byteArray);
      } else {
        originalPdfBuffer = await this.createInitialContractPdf(lease);
      }
    } catch {
      originalPdfBuffer = await this.createInitialContractPdf(lease);
    }

    // 2. Nhúng chữ ký (nếu có) và vết audit (IP, SHA-256 Hash, Timestamp) vào PDF bằng pdf-lib & crypto
    const { signedPdfBuffer, hash } = await this.embedSignatureAndAudit(
      originalPdfBuffer,
      dto.signatureBase64,
      lease.tenant?.name || 'Tenant',
      lease.tenant?.email || 'N/A',
      ipAddress,
    );

    // 3. Upload bản PDF đã ký lên S3
    const s3Key = `contracts/${lease.application?.id || lease.id}/signed_contract.pdf`;
    const signedPdfUrl = `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          Body: signedPdfBuffer,
          ContentType: 'application/pdf',
        }),
      );
      this.logger.log(`Đã upload PDF hợp đồng đã ký lên S3: ${s3Key}`);
    } catch (err) {
      this.logger.error(
        `Upload S3 PDF hợp đồng đã ký THẤT BẠI: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new BadRequestException(
        `Không thể upload PDF hợp đồng đã ký lên S3: ${(err as Error).message}`,
      );
    }

    const updatedLease = await this.prisma.$transaction(
      async (tx) => {
        // 1. Cập nhật Lease thành Pending_payment & lưu Audit metadata
        const leaseUpdated = await tx.lease.update({
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

        return leaseUpdated;
      },
      { maxWait: 10000, timeout: 15000 },
    );

    // 5. Thông báo cho Manager kèm SHA-256 hash log (Thực hiện ngoài Transaction)
    void this.notifyService.notifyContractSigned({
      managerCognitoId: lease.property.managerCognitoId,
      tenantName: lease.tenant.name,
      propertyName: lease.property.name,
      applicationId: lease.application?.id || lease.id,
    });

    this.logger.log(
      `Ký hợp đồng thành công! Lease #${leaseId}, Signer IP: ${ipAddress}, SHA-256: ${hash}`,
    );

    return await this.formatLeaseWithPresignedUrl(updatedLease);
  }

  // --- Helper Methods ---

  private async getPresignedPdfUrl(
    urlOrKey: string | null | undefined,
  ): Promise<string | null> {
    if (!urlOrKey) return null;

    if (urlOrKey.includes('X-Amz-Signature=')) return urlOrKey;

    let s3Key = urlOrKey;
    if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
      try {
        const parsed = new URL(urlOrKey);
        s3Key = parsed.pathname.startsWith('/')
          ? parsed.pathname.slice(1)
          : parsed.pathname;
      } catch {
        s3Key = urlOrKey;
      }
    }

    const s3Bucket = process.env.AWS_S3_BUCKET_NAME!;

    try {
      const command = new GetObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
      });
      return await getSignedUrl(this.s3Client as any, command, {
        expiresIn: 3600,
      });
    } catch (err) {
      this.logger.error(
        `Lỗi tạo Presigned URL cho key "${s3Key}": ${(err as Error).message}`,
      );
      return urlOrKey;
    }
  }

  private async formatLeaseWithPresignedUrl<
    T extends { leaseAgreementUrl?: string | null },
  >(lease: T): Promise<T> {
    if (!lease || !lease.leaseAgreementUrl) return lease;
    const presignedUrl = await this.getPresignedPdfUrl(lease.leaseAgreementUrl);
    return {
      ...lease,
      leaseAgreementUrl: presignedUrl,
    };
  }

  private async formatLeasesWithPresignedUrl<
    T extends { leaseAgreementUrl?: string | null },
  >(leases: T[]): Promise<T[]> {
    if (!leases) return [];
    return Promise.all(leases.map((l) => this.formatLeaseWithPresignedUrl(l)));
  }

  private getFontBuffer(
    fontName: 'NotoSans-Regular.ttf' | 'NotoSans-Bold.ttf',
  ): Buffer {
    const fontPaths = [
      join(__dirname, '../assets/fonts', fontName),
      join(__dirname, '../../src/assets/fonts', fontName),
      join(process.cwd(), 'apps/server/src/assets/fonts', fontName),
      join(process.cwd(), 'src/assets/fonts', fontName),
    ];

    for (const p of fontPaths) {
      if (existsSync(p)) {
        return readFileSync(p);
      }
    }
    throw new Error(`Khôn tìm thấy font file ${fontName}`);
  }

  private async createInitialContractPdf(lease: any): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(
      this.getFontBuffer('NotoSans-Regular.ttf'),
    );
    const fontBold = await pdfDoc.embedFont(
      this.getFontBuffer('NotoSans-Bold.ttf'),
    );

    const { width, height } = page.getSize();
    let y = height - 50;

    page.drawText('HỢP ĐỒNG THUÊ BẤT ĐỘNG SẢN', {
      x: 50,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    y -= 25;

    page.drawText(`Mã hợp đồng: #${lease.id}`, {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(`Ngày khởi tạo: ${new Date().toLocaleDateString('vi-VN')}`, {
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

    page.drawText('1. THÔNG TIN CÁC BÊN', {
      x: 50,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    y -= 20;

    const managerName = lease.property?.manager?.name || 'Quản lý bất động sản';
    const managerEmail = lease.property?.manager?.email || 'N/A';
    page.drawText(`Bên cho thuê (Manager): ${managerName} (${managerEmail})`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;

    const tenantName = lease.tenant?.name || 'Khách thuê';
    const tenantEmail = lease.tenant?.email || 'N/A';
    page.drawText(`Bên thuê (Tenant): ${tenantName} (${tenantEmail})`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 30;

    page.drawText('2. THÔNG TIN BẤT ĐỘNG SẢN & ĐIỀU KHOẢN', {
      x: 50,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    y -= 20;

    const propName = lease.property?.name || 'Bất động sản';
    const propAddress = lease.property?.location?.address || 'N/A';
    page.drawText(`Tên bất động sản: ${propName}`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;
    page.drawText(`Địa chỉ: ${propAddress}`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;

    const startDateStr = new Date(lease.startDate).toLocaleDateString('vi-VN');
    const endDateStr = new Date(lease.endDate).toLocaleDateString('vi-VN');
    page.drawText(`Thời hạn thuê: Từ ${startDateStr} đến ${endDateStr}`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;

    const rentFormatted = (lease.rent || 0).toLocaleString('vi-VN');
    const depositFormatted = (lease.deposit || 0).toLocaleString('vi-VN');
    page.drawText(`Tiền thuê: ${rentFormatted} VND`, {
      x: 60,
      y,
      size: 11,
      font: fontBold,
    });
    y -= 18;
    page.drawText(`Tiền cọc: ${depositFormatted} VND`, {
      x: 60,
      y,
      size: 11,
      font: fontBold,
    });
    y -= 35;

    page.drawText('3. ĐIỀU KHOẢN THỎA THUẬN & PHÁP LÝ', {
      x: 50,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    y -= 20;
    page.drawText('- Bên thuê cam kết đúng hạn theo quy định.', {
      x: 60,
      y,
      size: 10,
      font,
    });
    y -= 15;
    page.drawText(
      '- Bên cho thuê đảm bảo bất động sản đủ điều kiện theo quy định.',
      {
        x: 60,
        y,
        size: 10,
        font,
      },
    );
    y -= 15;
    page.drawText(
      '- Chữ ký điện tử trên hợp đồng này có giá trị như chữ ký tay.',
      {
        x: 60,
        y,
        size: 10,
        font,
      },
    );
    y -= 30;

    const leftColX = 65;
    const rightColX = 355;

    page.drawText('ĐẠI DIỆN BÊN CHO THUÊ', {
      x: leftColX,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    page.drawText('ĐẠI DIỆN BÊN THUÊ', {
      x: rightColX,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });
    y -= 15;
    page.drawText('(Chữ ký điện tử)', {
      x: leftColX + 15,
      y,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText('(Chờ bên thuê ký)', {
      x: rightColX + 15,
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
    pdfDoc.registerFontkit(fontkit);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const font = await pdfDoc.embedFont(
      this.getFontBuffer('NotoSans-Regular.ttf'),
    );
    const fontBold = await pdfDoc.embedFont(
      this.getFontBuffer('NotoSans-Bold.ttf'),
    );

    // 1. Nhúng ảnh chữ ký Tenant ngay bên dưới tiêu đề "ĐẠI DIỆN BÊN THUÊ" (Right column)
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
          x: 355,
          y: 355,
          width: 140,
          height: 55,
        });
      } catch (err) {
        this.logger.warn(
          `Lỗi nhúng ảnh chữ ký Tenant: ${(err as Error).message}`,
        );
      }
    }

    // 2. Tính Hash & lưu Audit Trail bên dưới chữ ký Tenant
    const initialBytes = await pdfDoc.save();
    const hash = crypto.createHash('sha256').update(initialBytes).digest('hex');
    const signedAt = new Date().toISOString();

    const auditBoxY = 300;

    // Vẽ khung Audit Trail cho Tenant
    lastPage.drawRectangle({
      x: 345,
      y: auditBoxY,
      width: 195,
      height: 48,
      borderColor: rgb(0.2, 0.5, 0.3),
      borderWidth: 0.8,
      color: rgb(0.95, 0.98, 0.95),
    });

    lastPage.drawText(`[TENANT E-SIGN AUDIT]`, {
      x: 350,
      y: auditBoxY + 35,
      size: 7,
      font: fontBold,
      color: rgb(0.1, 0.4, 0.2),
    });

    lastPage.drawText(`Người ký: ${tenantName}`, {
      x: 350,
      y: auditBoxY + 24,
      size: 6.5,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    lastPage.drawText(`${signedAt} | IP: ${ipAddress}`, {
      x: 350,
      y: auditBoxY + 14,
      size: 6,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    lastPage.drawText(`SHA256: ${hash.substring(0, 22)}...`, {
      x: 350,
      y: auditBoxY + 4,
      size: 5.5,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    const finalPdfBytes = await pdfDoc.save();
    return {
      signedPdfBuffer: Buffer.from(finalPdfBytes),
      hash,
    };
  }

  private async embedManagerSignatureAndAudit(
    pdfBuffer: Buffer,
    signatureBase64: string | undefined,
    managerName: string,
    managerEmail: string,
    ipAddress: string,
  ): Promise<{ signedPdfBuffer: Buffer }> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    pdfDoc.registerFontkit(fontkit);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const font = await pdfDoc.embedFont(
      this.getFontBuffer('NotoSans-Regular.ttf'),
    );
    const fontBold = await pdfDoc.embedFont(
      this.getFontBuffer('NotoSans-Bold.ttf'),
    );

    // 1. Nhúng ảnh chữ ký Manager ngay bên dưới tiêu đề "ĐẠI DIỆN BÊN CHO THUÊ" (Left column)
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
          x: 65,
          y: 355,
          width: 140,
          height: 55,
        });
      } catch (err) {
        this.logger.warn(
          `Lỗi nhúng ảnh chữ ký Manager: ${(err as Error).message}`,
        );
      }
    }

    // 2. Lưu Audit Trail bên dưới chữ ký Manager
    const signedAt = new Date().toISOString();
    const auditBoxY = 310;

    // Vẽ khung Audit Trail cho Manager
    lastPage.drawRectangle({
      x: 55,
      y: auditBoxY,
      width: 195,
      height: 38,
      borderColor: rgb(0.2, 0.3, 0.6),
      borderWidth: 0.8,
      color: rgb(0.94, 0.96, 0.99),
    });

    lastPage.drawText(`[MANAGER E-SIGN AUDIT]`, {
      x: 60,
      y: auditBoxY + 26,
      size: 7,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });

    lastPage.drawText(`Người ký: ${managerName}`, {
      x: 60,
      y: auditBoxY + 15,
      size: 6.5,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    lastPage.drawText(`${signedAt} | IP: ${ipAddress}`, {
      x: 60,
      y: auditBoxY + 5,
      size: 6,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    const finalPdfBytes = await pdfDoc.save();
    return {
      signedPdfBuffer: Buffer.from(finalPdfBytes),
    };
  }
}
