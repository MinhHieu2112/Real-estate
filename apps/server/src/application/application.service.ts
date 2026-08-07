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
      name,
      email,
      phoneNumber,
      message,
      tenantCognitoId,
    } = createApplication;

    // 1. Lấy thông tin Property (Bao gồm giá và availableFrom)
    const property = await this.prisma.property.findUnique({
      where: {
        id: propertyId,
      },
      select: {
        pricePerMonth: true,
        securityDeposit: true,
        availableFrom: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // 2. Validate endDate phải sau startDate
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    const LEAD_TIME_DAYS = 2;

    // Mốc A: today + leadTime
    const todayWithLeadTime = new Date();
    todayWithLeadTime.setHours(0, 0, 0, 0);
    todayWithLeadTime.setDate(todayWithLeadTime.getDate() + LEAD_TIME_DAYS);

    // Mốc B: availableFrom (nếu không có trong DB thì mặc định là ngày hôm nay)
    const availableFromDate = property.availableFrom
      ? new Date(property.availableFrom)
      : new Date();
    availableFromDate.setHours(0, 0, 0, 0);

    // Tính max(today + leadTime, availableFrom)
    const minValidStartDate = new Date(
      Math.max(todayWithLeadTime.getTime(), availableFromDate.getTime()),
    );

    // Ngày dọn vào người dùng yêu cầu
    const requestedStartDate = new Date(startDate);
    requestedStartDate.setHours(0, 0, 0, 0);

    // So sánh điều kiện validStartDate < minValidStartDate
    if (requestedStartDate < minValidStartDate) {
      if (todayWithLeadTime > availableFromDate) {
        throw new BadRequestException({
          code: `MOVE_IN_DATE_TOO_SOON`,
          message: `Ngày chuyển vào phải sau ít nhất ${LEAD_TIME_DAYS} ngày kể từ hôm nay.`,
        });
      } else {
        throw new BadRequestException(
          `Property is only available for move-in starting from ${availableFromDate.toLocaleDateString('vi-VN')}.`,
        );
      }
    }

    // 4. Ngăn tạo mới nếu đang có người thuê
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

    // 5. Tạo đơn ứng tuyển (Upsert)
    const application = (await this.prisma.application.upsert({
      where: {
        tenantCognitoId_propertyId_status: {
          tenantCognitoId: createApplication.tenantCognitoId,
          propertyId,
          status: status ?? 'Pending',
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
    })) as any;

    // 6. Thông báo cho Manager
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

  // Cập nhật trạng thái đơn đăng ký
  async updateApplicationStatus(
    applicationId: number,
    updateApplication: UpdateApplicationDto,
  ) {
    const { status } = updateApplication;

    const result = await this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({
        where: { id: Number(applicationId) },
        include: {
          property: true,
          tenant: true,
        },
      });

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      if (status === 'Approved') {
        const leaseStartDate = application.startDate
          ? new Date(application.startDate)
          : new Date();
        const leaseEndDate = application.endDate
          ? new Date(application.endDate)
          : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

        // Kiểm tra xem dự án đã có Lease còn hạn trùng khoảng thời gian không
        const activeLease = await tx.lease.findFirst({
          where: {
            propertyId: application.propertyId,
            startDate: { lte: leaseEndDate },
            endDate: { gte: leaseStartDate },
          },
        });

        if (activeLease) {
          throw new ConflictException(
            'Cannot approve application: Property already has an active lease overlapping with requested dates.',
          );
        }

        // Tạo Lease mới với thuộc tính status: 'Active' bắt buộc bởi Prisma schema
        const newLease = await tx.lease.create({
          data: {
            startDate: leaseStartDate,
            endDate: leaseEndDate,
            rent: application.property.pricePerMonth,
            deposit: application.property.securityDeposit,
            propertyId: application.propertyId,
            tenantCognitoId: application.tenantCognitoId,
            status: 'Draft',
          },
        });

        // Kết nối Tenant với Property
        await tx.property.update({
          where: { id: application.propertyId },
          data: {
            tenants: {
              connect: {
                cognitoId: application.tenantCognitoId,
              },
            },
          },
        });

        // Cập nhật Application với leaseId
        return tx.application.update({
          where: { id: Number(applicationId) },
          data: {
            status,
            leaseId: newLease.id,
          },
          include: {
            property: true,
            tenant: true,
            lease: true,
          },
        });
      } else {
        return tx.application.update({
          where: { id: Number(applicationId) },
          data: { status },
          include: {
            property: true,
            tenant: true,
            lease: true,
          },
        });
      }
    });

    // Bắn thông báo cho Tenant khi Approved / Denied
    if (status === 'Approved' || status === 'Denied') {
      void this.notifyService
        .notifyApplicationStatus({
          tenantCognitoId: result.tenantCognitoId,
          tenantEmail: result.tenant.email,
          propertyName: result.property.name,
          status: status,
          applicationId: result.id,
        })
        .catch((err: Error) => {
          console.error(`Bắn thông báo thất bại: ${err.message}`);
        });
    }
    return result;
  }
}
