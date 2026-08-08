import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotifyService } from '../notify/notify.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { LeaseStatus, PaymentStatus } from '../generated/prisma/enums';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifyService: NotifyService,
  ) {}

  // 1. Lấy danh sách thanh toán của Manager
  async getManagerPayments(managerCognitoId: string) {
    return this.prisma.lease.findMany({
      where: {
        property: {
          managerCognitoId: managerCognitoId,
        },
        status: {
          in: [
            LeaseStatus.Pending_payment,
            LeaseStatus.Active,
            LeaseStatus.Expired,
          ],
        },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 2. Lấy danh sách thanh toán theo Hợp đồng
  async getPaymentsByLease(leaseId: number) {
    return this.prisma.payment.findMany({
      where: { leaseId },
      orderBy: { dueDate: 'asc' },
    });
  }

  // 3. Tạo khoản thanh toán thủ công cho Hợp đồng
  async createPaymentRecord(leaseId: number, dto: CreatePaymentDto) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Hợp đồng không tồn tại');
    }

    return this.prisma.payment.create({
      data: {
        leaseId,
        amountDue: dto.amountDue,
        amountPaid: dto.amountPaid,
        dueDate: new Date(dto.dueDate),
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        paymentStatus: dto.paymentStatus,
      },
    });
  }

  // 4. Xác nhận thanh toán (Manager)
  async confirmPayment(paymentId: number, dto: ConfirmPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        lease: {
          include: {
            property: true,
            tenant: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Khoản thanh toán không hợp lệ');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: dto.paymentStatus,
        amountPaid:
          dto.amountPaid !== undefined ? dto.amountPaid : payment.amountPaid,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
      },
    });

    // Nếu thanh toán đầy đủ (Paid), chuyển Lease sang ACTIVE
    if (
      dto.paymentStatus === PaymentStatus.Paid &&
      payment.lease.status === LeaseStatus.Pending_payment
    ) {
      await this.prisma.lease.update({
        where: { id: payment.leaseId },
        data: {
          status: LeaseStatus.Active,
          managerSignedAt: new Date(),
        },
      });

      // Gửi thông báo cho Tenant
      await this.notifyService.notifyPaymentConfirmed({
        tenantCognitoId: payment.lease.tenant.cognitoId,
        tenantEmail: payment.lease.tenant.email,
        propertyName: payment.lease.property.name,
        applicationId: payment.leaseId,
        amountPaid: updatedPayment.amountPaid,
      });
    }

    return updatedPayment;
  }
}
