import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PropertyStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { LocationService } from '../location/location.service';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { PropertyQueryBuilder } from './builders/property-query.builder';
import { CreatePropertyDto } from './dto/create-property.dto';
import { GetPropertyDto } from './dto/get-property.dto';
import pLimit from 'p-limit';
import { UpdatePropertyDto } from './dto/update-property.dto';

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
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async getProperties(favoriteIds: number[], dto: GetPropertyDto) {
    if (dto.locationText && !dto.bboxWest) {
      const place = await this.locationService.searchPlaceByText(
        dto.locationText,
      );
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
        ) as location
      FROM "Property" p
      JOIN "Location" l 
        ON p."locationId" = l.id
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
      managerCognitoId,
      name,
      ...propertyData
    } = createPropertyDto;

    // Check if property with same name already exists for this manager
    const existingProperty = await this.prisma.property.findFirst({
      where: {
        name,
        managerCognitoId,
      },
    });

    if (existingProperty) {
      throw new ConflictException('A property with this name already exists.');
    }

    // Ensure manager exists in database
    let manager = await this.prisma.manager.findUnique({
      where: { cognitoId: managerCognitoId },
    });

    if (!manager) {
      manager = await this.prisma.manager.create({
        data: {
          cognitoId: managerCognitoId,
          name: 'Manager',
          email: `${managerCognitoId}@example.com`,
          phoneNumber: '0000000000',
        },
      });
    }

    // Limit the number of concurrent uploads
    const limit = pLimit(10);

    // Upload files concurrently if files exist
    let photoUrls: string[] = [];
    if (files && files.length > 0) {
      try {
        photoUrls = await Promise.all(
          files.map((file) =>
            limit(async () => {
              const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `properties/${managerCognitoId}/${Date.now()}-${file.originalname}`,
                Body: file.buffer,
                ContentType: file.mimetype,
              };

              const uploadResult = await new Upload({
                client: this.s3Client,
                params: uploadParams,
              }).done();

              if (!uploadResult.Location) {
                throw new Error('S3 upload failed: Location is missing');
              }

              return uploadResult.Location;
            }),
          ),
        );
      } catch (err) {
        console.error('Failed to upload images to S3:', err);
      }
    }

    // Create location using LocationService
    const location = await this.locationService.createLocationWithCoordinates({
      address,
      city,
      state,
      country,
      postalCode,
    });

    return await this.prisma.property.create({
      data: {
        ...propertyData,
        name,
        photoUrls,
        locationId: location.id,
        managerCognitoId,
      },
      include: {
        location: true,
        manager: true,
      },
    });
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
      throw new ConflictException(
        'Cannot update a property that is currently rented.',
      );
    }

    const { address, city, state, country, postalCode, ...propertyData } =
      updatePropertyDto;
    delete (propertyData as any).managerCognitoId;

    // Upload new photos if provided
    let photoUrls = existingProperty.photoUrls;
    if (files && files.length > 0) {
      const limit = pLimit(10);
      const newPhotoUrls = await Promise.all(
        files.map((file) =>
          limit(async () => {
            const uploadParams = {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: `properties/${Date.now()}-${file.originalname}`,
              Body: file.buffer,
              ContentType: file.mimetype,
            };

            const uploadResult = await new Upload({
              client: this.s3Client,
              params: uploadParams,
            }).done();

            if (!uploadResult.Location) {
              throw new Error('S3 upload failed: Location is missing');
            }

            return uploadResult.Location;
          }),
        ),
      );
      photoUrls = [...photoUrls, ...newPhotoUrls];
    }

    // Update location via LocationService if address data is present
    if (address || city || state || country || postalCode) {
      await this.locationService.updateLocation(existingProperty.locationId, {
        address,
        city,
        state,
        country,
        postalCode,
      });
    }

    return await this.prisma.property.update({
      where: { id },
      data: {
        ...propertyData,
        photoUrls,
      },
      include: {
        location: true,
        manager: true,
      },
    });
  }
}
