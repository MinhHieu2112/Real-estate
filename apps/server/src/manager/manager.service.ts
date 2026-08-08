import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateManagerDto } from './dto/create-manager.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { ManagerResponseDto } from './dto/manager-response.dto';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../generated/prisma/client';
import { wktToGeoJSON } from '@terraformer/wkt';

@Injectable()
export class ManagerService {
  constructor(private prisma: PrismaService) {}

  // Tạo manager
  async createManager(createManagerDto: CreateManagerDto) {
    const { cognitoId, name, email, phoneNumber } = createManagerDto;
    return await this.prisma.manager.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber,
      },
    });
  }

  // Lấy thông tin manager
  async getManager(cognitoId: string): Promise<ManagerResponseDto> {
    const manager = await this.prisma.manager.findUnique({
      where: { cognitoId },
    });
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }
    return manager;
  }

  // Cập nhật thông tin manager
  async updateManager(
    cognitoId: string,
    updateManagerDto: UpdateManagerDto,
  ): Promise<ManagerResponseDto> {
    return await this.prisma.manager.update({
      where: { cognitoId },
      data: updateManagerDto,
    });
  }

  // Lấy thông tin các bđs của manager
  async getManagerProperties(cognitoId: string) {
    const properties = await this.prisma.property.findMany({
      where: { managerCognitoId: cognitoId },
      include: {
        location: true,
      },
    });

    if (!properties || properties.length === 0) {
      return [];
    }

    // Lấy vị trí bđs
    const locationIds = properties.map((p) => p.location.id);
    const locations = await this.prisma.$queryRaw<
      {
        id: number;
        coordinates: string;
      }[]
    >`
      SELECT id, ST_AsText(coordinates) AS coordinates
      FROM "Location"
      WHERE id IN (${Prisma.join(locationIds)});`;

    const locationMap = new Map(
      locations.map((location) => [location.id, location.coordinates]),
    );

    const propertiesWithFormattedLocation = properties.map((property) => {
      const point = locationMap.get(property.location.id);
      const geoJSON: any = wktToGeoJSON(point || '');

      let coordinates = { longitude: 0, latitude: 0 };
      if (
        geoJSON &&
        geoJSON.type === 'Point' &&
        Array.isArray(geoJSON.coordinates)
      ) {
        coordinates = {
          longitude: geoJSON.coordinates[0],
          latitude: geoJSON.coordinates[1],
        };
      }

      return {
        ...property,
        location: {
          ...property.location,
          coordinates,
        },
      };
    });

    return propertiesWithFormattedLocation;
  }
}
