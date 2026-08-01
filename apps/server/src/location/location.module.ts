import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { PrismaModule } from '../prisma.module';
import { GeoPlacesClient } from '@aws-sdk/client-geo-places';
import { GeoRoutesClient } from '@aws-sdk/client-geo-routes';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [LocationController],
  providers: [
    LocationService,
    {
      provide: 'GEO_PLACES_CLIENT',
      useFactory: (config: ConfigService) =>
        new GeoPlacesClient({
          region: config.get<string>('AWS_REGION', 'us-east-1'),
          credentials: {
            accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
            secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
          },
        }),
      inject: [ConfigService],
    },
    {
      provide: 'GEO_ROUTES_CLIENT',
      useFactory: (config: ConfigService) =>
        new GeoRoutesClient({
          region: config.get<string>('AWS_REGION', 'us-east-1'),
          credentials: {
            accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
            secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
          },
        }),
      inject: [ConfigService],
    },
  ],
  exports: [LocationService],
})
export class LocationModule {}
