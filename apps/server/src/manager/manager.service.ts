import { Injectable } from '@nestjs/common';
import { CreateManagerDto } from './dto/create-manager.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { ManagerResponseDto } from './dto/manager-response.dto';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../generated/prisma/client';
import { wktToGeoJSON } from '@terraformer/wkt';

@Injectable()
export class ManagerService {
  constructor(private prisma: PrismaService) {}

  // Create a new manager
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

  // Get manager
  async getManager(cognitoId: string): Promise<ManagerResponseDto> {
    const manager = await this.prisma.manager.findUniqueOrThrow({
      where: { cognitoId },
    });
    return manager;
  }

  // Update manager
  async updateManager(
    cognitoId: string,
    updateManagerDto: UpdateManagerDto,
  ): Promise<ManagerResponseDto> {
    return await this.prisma.manager.update({
      where: { cognitoId },
      data: updateManagerDto,
    });
  }

  // Get manager properties
  async getManagerProperties(cognitoId: string) {
    // Get manager properties base on cognitoId
    const properties = await this.prisma.property.findMany({
      where: { managerCognitoId: cognitoId },
      include: {
        location: true,
      },
    });

    // Get locationID
    const locationIds = properties.map((p) => p.location.id);
    const locations = await this.prisma.$queryRaw<
      {
        id: number;
        coordinates: string;
      }[]
    >`
      SELECT id, ST_AsText(coordinates) AS coordinates
      FROM Location
      WHERE id IN (${Prisma.join(locationIds)});`;

    const locationMap = new Map(
      locations.map((location) => [location.id, location.coordinates]),
    );

    const propertiesWithFormattedLocation = properties.map((property) => {
      const point = locationMap.get(property.location.id);
      const geoJSON = wktToGeoJSON(point || '');

      if (geoJSON.type === 'Point') {
        const longitude = geoJSON.coordinates[0];
        const latitude = geoJSON.coordinates[1];
        return {
          ...property,
          location: {
            ...property.location,
            coordinates: {
              longitude,
              latitude,
            },
          },
        };
      }
      return propertiesWithFormattedLocation;
    });
  }
}
