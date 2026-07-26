import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantResponseDto } from './dto/tenant-response.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../generated/prisma/client';
import { wktToGeoJSON } from '@terraformer/wkt';
import { PropertyResponseDto } from './dto/property-response.dto';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  // Get a tenant by cognitoId
  async findByCognitoId(cognitoId: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { cognitoId },
      include: {
        favorites: true,
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  // Create a new tenant
  async createTenant(
    createTenantDto: CreateTenantDto,
  ): Promise<CreateTenantDto> {
    const { cognitoId, name, email, phoneNumber } = createTenantDto;
    return await this.prisma.tenant.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber,
      },
    });
  }

  // Update an existing tenant
  async updateTenant(
    cognitoId: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { cognitoId },
    });
    if (!existingTenant) {
      throw new NotFoundException('Tenant not found');
    }
    const { name, email, phoneNumber } = updateTenantDto;
    return await this.prisma.tenant.update({
      where: { cognitoId },
      data: {
        name,
        email,
        phoneNumber,
      },
    });
  }

  // Get current residences for a tenant
  async getResidences(cognitoId: string): Promise<PropertyResponseDto> {
    const properties = await this.prisma.property.findMany({
      where: { tenants: { some: { cognitoId } } },
      include: {
        location: true,
      },
    });
    if (!properties || properties.length === 0) {
      return [] as unknown as PropertyResponseDto;
    }

    const locationIds = properties.map((property) => property.locationId);
    const rawCoordinates: { id: string; coordinates_text: string }[] =
      await this.prisma.$queryRaw`
        SELECT id, ST_AsText(coordinates) AS coordinates_text
        FROM "Location"
        WHERE id IN (${Prisma.join(locationIds)});
      `;

    // Create a mapping of locationId to coordinates
    const coordinateMap = new Map<
      string,
      { longitude: number; latitude: number }
    >();

    rawCoordinates.forEach((row) => {
      const geoJSON: any = wktToGeoJSON(row.coordinates_text || '');
      if (geoJSON && geoJSON.coordinates) {
        coordinateMap.set(row.id, {
          longitude: geoJSON.coordinates[0],
          latitude: geoJSON.coordinates[1],
        });
      }
    });

    // Map the properties to include coordinates
    const residencesWithFormattedLocation = properties.map((property) => {
      const coords = coordinateMap.get(property.location.id.toString());
      return {
        ...property,
        location: {
          ...property.location,
          coordinates: coords ? coords : { longitude: null, latitude: null },
        },
      };
    });
    return residencesWithFormattedLocation as unknown as PropertyResponseDto;
  }

  // Add a favorite property for a tenant
  async addFavorite(cognitoId: string, propertyId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { cognitoId },
      include: { favorites: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const propertyIdNumber = Number(propertyId);
    const existingFavorites = tenant.favorites || [];

    if (!existingFavorites.some((fav) => fav.id === propertyIdNumber)) {
      const updatedTenant = await this.prisma.tenant.update({
        where: { cognitoId },
        data: {
          favorites: {
            connect: {
              id: propertyIdNumber,
            },
          },
        },
        include: { favorites: true },
      });
      return updatedTenant;
    }
  }

  // Remove a favorite property for a tenant
  async removeFavorite(cognitoId: string, propertyId: number) {
    const tenant = await this.prisma.tenant.update({
      where: { cognitoId },
      data: {
        favorites: {
          disconnect: {
            id: propertyId,
          },
        },
      },
      include: { favorites: true },
    });
    return tenant;
  }
}
