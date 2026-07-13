import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ListApplicationDto } from './dto/list-application.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async listApplication(listApplicationDto: ListApplicationDto) {
    // Set up filters
    let whereClause = {};
    if (listApplicationDto.userId && listApplicationDto.userType) {
      if (listApplicationDto.userType === 'tenant') {
        whereClause = {
          property: {
            tenantCognitoId: String(listApplicationDto.userId),
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

    // Calculate next payment date
    function calculateNextPaymentDate(startDate: Date) {
      const today = new Date();
      const nextPaymentDate = new Date(startDate);
      while (nextPaymentDate <= today) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }
      return nextPaymentDate;
    }

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
      throw new Error('Property not found');
    }

    const newApplication = await this.prisma.$transaction(async (prisma) => {
      // Create lease first
      const lease = await prisma.lease.create({
        data: {
          startDate: new Date(),
          endDate: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1),
          ),
          rent: property.pricePerMonth,
          deposit: property.securityDeposit,
          property: {
            connect: { id: propertyId },
          },
          tenant: {
            connect: { cognitoId: tenantCognitoId },
          },
        },
      });

      // Then create application with lease connection
      const application = await this.prisma.application.create({
        data: {
          applicationDate: new Date(applicationDate),
          status,
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
          lease: {
            connect: { id: lease.id },
          },
        },
        include: {
          property: true,
          tenant: true,
          lease: true,
        },
      });
      return application;
    });
    return newApplication;
  }

  // Update application
  async updateApplicationStatus(
    applicationId: number,
    updateApplication: UpdateApplicationDto,
  ) {
    const { status } = updateApplication;
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: true,
        tenant: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (status === 'Approved') {
      const newLease = await this.prisma.lease.create({
        data: {
          startDate: new Date(),
          endDate: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1),
          ),
          rent: application.property.pricePerMonth,
          deposit: application.property.securityDeposit,
          propertyId: application.propertyId,
          tenantCognitoId: application.tenantCognitoId,
        },
      });

      // Update the property to connect the tenant
      await this.prisma.property.update({
        where: { id: application.propertyId },
        data: {
          tenants: {
            connect: {
              cognitoId: application.tenantCognitoId,
            },
          },
        },
      });

      // Update the application with the new lease ID
      await this.prisma.application.update({
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
      // Update the application status (for both "Denied" and other status)
      await this.prisma.application.update({
        where: {
          id: Number(applicationId),
        },
        data: { status },
      });
    }

    // Response with the updated application
    const updatedApplication = await this.prisma.application.findUnique({
      where: { id: Number(applicationId) },
      include: {
        property: true,
        tenant: true,
        lease: true,
      },
    });
    return updatedApplication;
  }
}
