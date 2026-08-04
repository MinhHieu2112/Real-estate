import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ListApplicationDto } from './dto/list-application.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { calculateNextPaymentDate } from '../common/utils/date.util';
import { NotifyService } from '../notify/notify.service';
import { Application } from './entities/application.entity';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifyService: NotifyService,
  ) {}

  async listApplication(listApplicationDto: ListApplicationDto) {
    // Set up filters
    let whereClause = {};
    if (listApplicationDto.userId && listApplicationDto.userType) {
      if (listApplicationDto.userType === 'tenant') {
        whereClause = {
          tenant: {
            cognitoId: String(listApplicationDto.userId),
          },
        };
      } else if (listApplicationDto.userType === 'manager') {
        whereClause = {
          property: {
            managerCognitoId: String(listApplicationDto.userId),
          },
        };
      }
    }

    // Get all applications
    const applications = await this.prisma.application.findMany({
      where: whereClause,
      include: {
        property: {
          include: {
            location: true,
            manager: true,
          },
        },
        tenant: true,
      },
    });

    // Collect IDs to query in a single batch.
    const propertyIds = applications.map((app) => app.propertyId);
    const tenantCognitoIds = applications.map((app) => app.tenantCognitoId);

    const allLeases = await this.prisma.lease.findMany({
      where: {
        propertyId: { in: propertyIds },
        tenant: {
          cognitoId: { in: tenantCognitoIds },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    // Create a map of leaseId to lease
    const leaseMap = new Map<string, (typeof allLeases)[0]>();

    for (const lease of allLeases) {
      const key = `${lease.tenantCognitoId}_${lease.propertyId}`;

      if (!leaseMap.has(key)) {
        leaseMap.set(key, lease);
      }
    }

    // Format applications
    const formattedApplications = applications.map((app) => {
      const key = `${app.tenantCognitoId}_${app.propertyId}`;
      const lease = leaseMap.get(key);

      return {
        ...app,
        property: {
          ...app.property,
          address: app.property.location.address,
        },
        manager: app.property.manager,
        lease: lease
          ? {
              ...lease,
              nextPaymentDate: calculateNextPaymentDate(lease.startDate),
            }
          : null,
      };
    });
    return formattedApplications;
  }

  // Create a new application
  async createApplication(createApplication: CreateApplicationDto) {
    const {
      applicationDate,
      startDate,
      endDate,
      status,
      propertyId,
      tenantCognitoId,
      name,
      email,
      phoneNumber,
      message,
    } = createApplication;

    const property = await this.prisma.property.findUnique({
      where: {
        id: propertyId,
      },
      select: { pricePerMonth: true, securityDeposit: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // 1. Ngăn tạo mới nếu Tenant đang có Lease hoạt động cho cùng Property
    const activeLease = await this.prisma.lease.findFirst({
      where: {
        propertyId,
        tenantCognitoId,
        endDate: { gte: new Date() },
      },
    });

    if (activeLease) {
      throw new ConflictException(
        'You already have an active lease for this property.',
      );
    }

    const application = await this.prisma.application.upsert({
      where: {
        tenantCognitoId_propertyId_status: {
          tenantCognitoId,
          propertyId,
          status,
        },
      },
      update: {},
      create: {
        applicationDate: new Date(applicationDate),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        status: status || 'Pending',
        name,
        email,
        phoneNumber,
        message,
        property: {
          connect: { id: propertyId },
        },
        tenant: {
          connect: { cognitoId: tenantCognitoId },
        },
      },
      include: {
        property: true,
        tenant: true,
        lease: true,
      },
    });

    const manager = await this.prisma.manager.findUnique({
      where: { cognitoId: application.property.managerCognitoId },
    });

    if (!manager) {
      throw new NotFoundException(`Manager not found`);
    }

    if (application.status === 'Pending') {
      void this.notifyService
        .notifyNewApplication({
          managerCognitoId: application.property.managerCognitoId,
          managerEmail: manager.email,
          tenantName: application.tenant.name,
          propertyName: application.property.name,
          applicationId: application.id,
        })
        .catch((err: Error) => {
          console.error(`Bắn thông báo tạo đơn thất bại: ${err.message}`);
        });
    }
    return application;
  }

  // Cập nhật trang thái đơn đăng ký
  async updateApplicationStatus(
    applicationId: number,
    updateApplication: UpdateApplicationDto,
  ): Promise<Application> {
    const { status } = updateApplication;

    // 1. Cập nhật trạng thái Application đơn thuần
    const updatedApplication = await this.prisma.application.update({
      where: { id: Number(applicationId) },
      data: { status },
      include: {
        property: true,
        tenant: true,
      },
    });

    // 2. Bắn thông báo cho Tenant (Approved / Denied)
    if (status === 'Approved' || status === 'Denied') {
      void this.notifyService
        .notifyApplicationStatus({
          tenantCognitoId: updatedApplication.tenantCognitoId,
          tenantEmail: updatedApplication.tenant.email,
          propertyName: updatedApplication.property.name,
          status: status,
          applicationId: updatedApplication.id,
        })
        .catch((err: Error) => {
          console.error(`Bắn thông báo thất bại: ${err.message}`);
        });
    }

    return updatedApplication;
  }
}
