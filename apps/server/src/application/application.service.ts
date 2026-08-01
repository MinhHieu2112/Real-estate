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

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService) {}

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

    // 1. Ngăn tạo mới nếu đã có Application trạng thái Pending hoặc Approved cho cùng Property
    const existingApplication = await this.prisma.application.findFirst({
      where: {
        propertyId,
        tenantCognitoId,
        status: { in: ['Pending', 'Approved'] },
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        `You already have a ${existingApplication.status.toLowerCase()} application for this property.`,
      );
    }

    // 2. Ngăn tạo mới nếu Tenant đang có Lease hoạt động cho cùng Property
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

    const application = await this.prisma.application.create({
      data: {
        applicationDate: new Date(applicationDate),
        startDate: startDate ? new Date(startDate) : undefined,
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

    return application;
  }

  // Update application status
  async updateApplicationStatus(
    applicationId: number,
    updateApplication: UpdateApplicationDto,
  ) {
    const { status } = updateApplication;

    return this.prisma.$transaction(async (tx) => {
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
        // Dynamic lease start and end dates from application requested range, or fallback to 1 year
        const leaseStartDate = application.startDate
          ? new Date(application.startDate)
          : new Date();
        const leaseEndDate = application.endDate
          ? new Date(application.endDate)
          : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

        // Prevent approval if property already has an active lease overlapping with requested period
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

        // Create new lease with dynamic dates
        const newLease = await tx.lease.create({
          data: {
            startDate: leaseStartDate,
            endDate: leaseEndDate,
            rent: application.property.pricePerMonth,
            deposit: application.property.securityDeposit,
            propertyId: application.propertyId,
            tenantCognitoId: application.tenantCognitoId,
          },
        });

        // Update the property to connect the tenant
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

        // Update the application with Approved status and link lease ID
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
        // Update application status for non-approval statuses (e.g. Denied)
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
  }
}
