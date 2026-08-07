import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PropertyStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { LocationService } from '../location/location.service';
import { ObjectCannedACL, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { PropertyQueryBuilder } from './builders/property-query.builder';
import { CreatePropertyDto } from './dto/create-property.dto';
import { GetPropertyDto } from './dto/get-property.dto';
import pLimit from 'p-limit';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { processImage } from '../common/utils/image-processor';

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

  private async uploadFileToS3(
    files: Express.Multer.File[],
    managerCognitoId: string,
  ): Promise<string[]> {
    if (!files || files.length === 0) return [];

    // Nén tất cả ảnh qua Sharp trước khi upload
    const optimizedFiles = await processImage(files);

    // Giới hạn số lần tải lên ảnh
    const limit = pLimit(10);

    // Upload song song lên S3
    const uploadPromises = optimizedFiles.map((file) =>
      limit(async () => {
        const fileExtension = file.mimetype === 'image/jpeg' ? 'jpg' : '';
        const cleanFileName = file.originalname.replace(/\.[^/.]+$/, '');
        const key = `properties/${managerCognitoId}/${cleanFileName}.${fileExtension}`;

        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: ObjectCannedACL.public_read,
        };

        const uploadResult = await new Upload({
          client: this.s3Client,
          params: uploadParams,
        }).done();

        if (!uploadResult.Location) {
          throw new Error('Failed to upload file to S3');
        }

        return uploadResult.Location;
      }),
    );
    return Promise.all(uploadPromises);
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

    // Upload ảnh lên S3
    let photoUrls: string[] = [];
    if (files && files.length > 0) {
      try {
        photoUrls = await this.uploadFileToS3(files, managerCognitoId);
      } catch (err) {
        console.error('Failed to upload images to S3:', err);
      }
    }

    // Tạo vị trí
    const location = await this.locationService.createLocationWithCoordinates({
      address,
      city,
      state,
      country,
      postalCode,
    });

    // Lưu CSDL
    return await this.prisma.property.create({
      data: {
        ...propertyData,
        name,
        status,
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
    delete (propertyData as any).managerCognitoId;

    // Upload ảnh mới nếu có
    let photoUrls = existingProperty.photoUrls;
    if (files && files.length > 0) {
      const newPhotoUrls = await this.uploadFileToS3(
        files,
        existingProperty.managerCognitoId,
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
