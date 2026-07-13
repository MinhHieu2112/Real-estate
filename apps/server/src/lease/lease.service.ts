import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class LeaseService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all leases
  async findAll() {
    const leases = await this.prisma.lease.findMany({
      include: {
        tenant: true,
        property: true,
      },
    });
    if (!leases) {
      throw new NotFoundException('Leases not found');
    }
    return leases;
  }

  // Get lease payment
  async getLeasePayment(leaseId: number) {
    const payments = await this.prisma.lease.findUniqueOrThrow({
      where: {
        id: leaseId,
      },
    });
    return payments;
  }
}
