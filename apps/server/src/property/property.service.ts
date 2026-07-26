import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Location, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { PropertyQueryBuilder } from './builders/property-query.builder';
import { wktToGeoJSON } from '@terraformer/wkt';
import { CreatePropertyDto } from './dto/create-property.dto';
import { GetPropertyDto } from './dto/get-property.dto';
import pLimit from 'p-limit';
import axios from 'axios';

@Injectable()
export class PropertyService {
  private s3Client: S3Client;

  constructor(private prisma: PrismaService) {
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
    const builder = new PropertyQueryBuilder(dto, favoriteIds);
    const whereConditions = builder.build();
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
          ? Prisma.sql`WHERE ${Prisma.join(whereConditions, 'AND')}`
          : Prisma.empty
      }`;
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

    const coordinates: { coordinates: string }[] = await this.prisma.$queryRaw`
        SELECT ST_AsText(coordinates) AS coordinates
        FROM "Location"
        WHERE id = ${property.locationId}`;

    let latitude = 0;
    let longitude = 0;

    if (coordinates && coordinates.length > 0 && coordinates[0].coordinates) {
      try {
        const geoJSON: any = wktToGeoJSON(coordinates[0].coordinates);
        if (
          geoJSON &&
          geoJSON.type === 'Point' &&
          Array.isArray(geoJSON.coordinates)
        ) {
          longitude = geoJSON.coordinates[0];
          latitude = geoJSON.coordinates[1];
        }
      } catch (err) {
        console.error('Failed to parse WKT coordinates:', err);
      }
    }

    return {
      ...property,
      location: {
        ...property.location,
        coordinates: {
          latitude,
          longitude,
        },
      },
    };
  }

  async createProperty(
    createPropertyDto: CreatePropertyDto,
    files: Express.Multer.File[],
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

    // Limit the number of concurrent uploads
    const limit = pLimit(10);

    // Upload files concurrently
    const photoUrls = await Promise.all(
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

    // Geocode the address
    const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
      {
        street: address,
        city,
        country,
        postalcode: postalCode || '',
        format: 'json',
        limit: '1',
      },
    ).toString()}`;

    // Get lat, lng from geocoding
    const geocodingResponse = await axios.get(geocodingUrl, {
      headers: {
        'User-Agent': 'RealEstateApp (justsomedummyemail@gmail.com)',
      },
    });

    const [longitude, latitude] =
      geocodingResponse.data[0]?.lon && geocodingResponse.data[0]?.lat
        ? [geocodingResponse.data[0].lon, geocodingResponse.data[0].lat]
        : [0, 0];

    const [location] = await this.prisma.$queryRaw<Location[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
      VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
      RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
    `;

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
}
