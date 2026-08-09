import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PropertyStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { LocationService } from '../location/location.service';
import { S3Client } from '@aws-sdk/client-s3';
import { PropertyQueryBuilder } from './builders/property-query.builder';
import { CreatePropertyDto } from './dto/create-property.dto';
import { GetPropertyDto } from './dto/get-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { uploadFileToS3 } from '../common/utils/image-processor';

@Injectable()
export class PropertyService {
  private s3Client: S3Client;

  constructor(
    private prisma: PrismaService,
    private locationService: LocationService,
  ) {
    const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } =
      process.env;

    if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error('Missing AWS environment variables');
    }

    this.s3Client = new S3Client({
      region: AWS_REGION,
    });
  }

  async getProperties(favoriteIds: number[], dto: GetPropertyDto) {
    if (dto.locationText && !dto.bboxWest) {
      const place = await this.locationService.searchPlaceByText(
        dto.locationText,
      );
      if (!place) {
        throw new NotFoundException(
          `No location found for the provided text: ${dto.locationText}`,
        );
      }
      if (place?.bbox) {
        dto.bboxWest = place.bbox[0];
        dto.bboxSouth = place.bbox[1];
        dto.bboxEast = place.bbox[2];
        dto.bboxNorth = place.bbox[3];
      } else if (place?.position) {
        dto.longitude = place.position[0];
        dto.latitude = place.position[1];
      }
    }

    const builder = new PropertyQueryBuilder(dto, favoriteIds);
    const whereConditions = builder.build();

    const hasBBox =
      dto.bboxWest !== undefined &&
      dto.bboxEast !== undefined &&
      dto.bboxSouth !== undefined &&
      dto.bboxNorth !== undefined;
    const centerLng = hasBBox
      ? (dto.bboxWest! + dto.bboxEast!) / 2
      : dto.longitude;
    const centerLat = hasBBox
      ? (dto.bboxSouth! + dto.bboxNorth!) / 2
      : dto.latitude;

    const orderByClause =
      centerLng !== undefined && centerLat !== undefined
        ? Prisma.sql`ORDER BY ST_Distance(
            l.coordinates::geometry,
            ST_SetSRID(ST_MakePoint(${centerLng}, ${centerLat}), 4326)
          ) ASC`
        : Prisma.empty;

    const query = Prisma.sql`
      SELECT
        p.*,
        json_build_object(
          'id', l.id,
          'address', l.address,
          'city', l.city,
          'state', l.state,
          'country', l.country,
          'postalCode', l."postalCode",
          'coordinates', json_build_object(
            'latitude', ST_Y(l.coordinates::geometry),
            'longitude', ST_X(l.coordinates::geometry)
          )
        ) as location,
        CASE 
          WHEN m.id IS NOT NULL THEN json_build_object(
            'id', m.id,
            'cognitoId', m."cognitoId",
            'name', m.name,
            'email', m.email,
            'phoneNumber', m."phoneNumber"
          )
          ELSE NULL 
        END as manager
      FROM "Property" p
      JOIN "Location" l 
        ON p."locationId" = l.id
      LEFT JOIN "Manager" m
        ON p."managerCognitoId" = m."cognitoId"
      ${
        whereConditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
          : Prisma.empty
      }
      ${orderByClause}`;
    return await this.prisma.$queryRaw(query);
  }

  async getPropertyById(id: number) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        location: true,
        manager: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const locationWithCoords =
      await this.locationService.getLocationWithFormattedCoordinates(
        property.locationId,
      );

    return {
      ...property,
      location: locationWithCoords,
    };
  }

  async createProperty(
    createPropertyDto: CreatePropertyDto,
    files?: Express.Multer.File[],
  ) {
    const {
      address,
      city,
      state,
      country,
      postalCode,
      status,
      managerCognitoId,
      name,
      ...propertyData
    } = createPropertyDto;

    // Kiểm tra tên dự án trùng lặp
    const existingProperty = await this.prisma.property.findFirst({
      where: {
        name,
        managerCognitoId,
      },
    });

    if (existingProperty) {
      throw new ConflictException('A property with this name already exists.');
    }

    // Tạo vị trí
    const location = await this.locationService.createLocationWithCoordinates({
      address,
      city,
      state,
      country,
      postalCode,
    });

    const property = await this.prisma.property.create({
      data: {
        ...propertyData,
        name,
        status,
        photoUrls: [],
        locationId: location.id,
        managerCognitoId,
      },
      include: {
        location: true,
        manager: true,
      },
    });

    let photoUrls: string[] = [];

    // Upload ảnh lên S3
    if (files?.length) {
      photoUrls = await uploadFileToS3(files, managerCognitoId, property.id);

      await this.prisma.property.update({
        where: { id: property.id },
        data: { photoUrls },
      });
    }

    return {
      ...property,
      location,
    };
  }

  async getPropertyLeases(propertyId: number) {
    return await this.prisma.lease.findMany({
      where: { propertyId },
      include: {
        tenant: true,
      },
    });
  }

  async updateProperty(
    id: number,
    updatePropertyDto: UpdatePropertyDto,
    files?: Express.Multer.File[],
  ) {
    const existingProperty = await this.prisma.property.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!existingProperty) {
      throw new NotFoundException('Property not found');
    }

    if (existingProperty.status === PropertyStatus.Rented) {
      throw new ConflictException({
        code: 'Cannot update a property that is currently rented.',
        message: 'Hiện tại đang có người thuê !',
      });
    }

    const {
      address,
      city,
      state,
      country,
      postalCode,
      status,
      ...propertyData
    } = updatePropertyDto;

    const { existingPhotoUrls } = updatePropertyDto as any;
    delete (propertyData as any).managerCognitoId;
    delete (propertyData as any).existingPhotoUrls;

    // Xử lý danh sách ảnh hiện tại (nếu người dùng xóa bớt trên frontend)
    let photoUrls = existingProperty.photoUrls;
    if (existingPhotoUrls !== undefined) {
      try {
        const parsed =
          typeof existingPhotoUrls === 'string'
            ? JSON.parse(existingPhotoUrls)
            : existingPhotoUrls;
        if (Array.isArray(parsed)) {
          photoUrls = parsed;
        }
      } catch (e) {
        console.log(e);
      }
    }

    // Upload ảnh mới bổ sung nếu có
    if (files && files.length > 0) {
      const newPhotoUrls = await uploadFileToS3(
        files,
        existingProperty.managerCognitoId,
        existingProperty.id,
      );
      photoUrls = [...photoUrls, ...newPhotoUrls];
    }

    // Cập nhật vị trí
    if (address || city || state || country || postalCode) {
      await this.locationService.updateLocation(existingProperty.locationId, {
        address,
        city,
        state,
        country,
        postalCode,
      });
    }

    // Cập nhật Property
    return await this.prisma.property.update({
      where: { id },
      data: {
        ...propertyData,
        photoUrls,
        status,
      },
      include: {
        location: true,
        manager: true,
      },
    });
  }
}
