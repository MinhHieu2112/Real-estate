import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  GeoPlacesClient,
  GeocodeCommand,
  SearchTextCommand,
  AutocompleteCommand,
} from '@aws-sdk/client-geo-places';
import {
  GeoRoutesClient,
  CalculateRoutesCommand,
} from '@aws-sdk/client-geo-routes';
import { Location } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { SearchPlaceResult } from './dto/search-place.dto';
import {
  DirectionsResult,
  GetDirectionsDto,
  TravelMode,
} from './dto/get-directions.dto';
import { wktToGeoJSON } from '@terraformer/wkt';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('GEO_PLACES_CLIENT')
    private readonly geoPlacesClient: GeoPlacesClient,
    @Inject('GEO_ROUTES_CLIENT')
    private readonly geoRoutesClient: GeoRoutesClient,
  ) {}

  // Geocodes a structured address using AWS geo-places (replaces Nominatim OSM).
  async geocodeAddress(
    address: string,
    city: string,
    country: string,
  ): Promise<{ latitude: number; longitude: number }> {
    const defaultCoords = { latitude: 10.8231, longitude: 106.6297 }; // HCM fallback

    try {
      const command = new GeocodeCommand({
        QueryText: `${address}, ${city}, ${country}`,
        Filter: {
          IncludeCountries: ['VNM'],
        },
        MaxResults: 1,
      });
      const response = await this.geoPlacesClient.send(command);
      const result = response.ResultItems?.[0];
      if (result?.Position) {
        return {
          longitude: result.Position[0],
          latitude: result.Position[1],
        };
      }
    } catch (err) {
      this.logger.error('AWS Geocode failed, using fallback coordinates:', err);
    }

    return defaultCoords;
  }

  async searchPlaceByText(query: string): Promise<SearchPlaceResult | null> {
    try {
      const command = new SearchTextCommand({
        QueryText: query,
        MaxResults: 1,
        BiasPosition: [106.6297, 10.8231], // HCM bias
        Filter: {
          IncludeCountries: ['VNM'],
        },
      });

      const response = await this.geoPlacesClient.send(command);
      const item = response.ResultItems?.[0];

      if (!item?.Position) return null;

      if (item.Address?.Country?.Code3 !== 'VNM') {
        throw new Error(
          'Không tìm thấy địa điểm phù hợp tại Việt Nam. Vui lòng thử lại với địa chỉ khác.',
        );
      }

      const result: SearchPlaceResult = {
        placeId: item.PlaceId ?? undefined,
        label: item.Title ?? query,
        position: [item.Position[0], item.Position[1]],
      };

      // MapView bounding box format: [west, south, east, north]
      if (item.MapView && item.MapView.length === 4) {
        result.bbox = [
          item.MapView[0],
          item.MapView[1],
          item.MapView[2],
          item.MapView[3],
        ];
      }

      return result;
    } catch (err) {
      this.logger.error('AWS SearchText failed:', err);
      return null;
    }
  }

  // Provides address autocomplete suggestions using AWS geo-places.
  async autocompleteAddress(
    query: string,
    biasLat?: number,
    biasLng?: number,
  ): Promise<{ placeId?: string; label: string }[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const command = new AutocompleteCommand({
        QueryText: query,
        Filter: {
          IncludeCountries: ['VNM'],
        },
        MaxResults: 5,
        ...(biasLat !== undefined &&
          biasLng !== undefined && {
            BiasPosition: [biasLng, biasLat],
          }),
      });
      const response = await this.geoPlacesClient.send(command);

      return (response.ResultItems ?? []).map((item) => ({
        placeId: item.PlaceId ?? undefined,
        label: item.Title ?? '',
      }));
    } catch (err) {
      this.logger.error('AWS Autocomplete failed:', err);
      return [];
    }
  }

  // Calculates driving/walking directions between two coordinates using AWS geo-routes v2.
  async getDirections(dto: GetDirectionsDto): Promise<DirectionsResult> {
    const { originLat, originLng, destinationLat, destinationLng, travelMode } =
      dto;

    const command = new CalculateRoutesCommand({
      Origin: [originLng, originLat],
      Destination: [destinationLng, destinationLat],
      TravelMode: travelMode ?? TravelMode.Car,
    });

    try {
      const response = await this.geoRoutesClient.send(command);
      const route = response.Routes?.[0];

      if (!route) {
        return { duration: 0, distance: 0, legs: [] };
      }

      const totalSummary = route.Summary;
      const legs = (route.Legs ?? []).map((leg) => {
        const travelSteps =
          leg.VehicleLegDetails?.TravelSteps ??
          leg.PedestrianLegDetails?.TravelSteps ??
          [];

        const summary =
          leg.VehicleLegDetails?.Summary?.Overview ??
          leg.PedestrianLegDetails?.Summary?.Overview;

        const distance =
          summary?.Distance ??
          travelSteps.reduce((sum, s) => sum + (s.Distance ?? 0), 0);

        const duration =
          summary?.Duration ??
          travelSteps.reduce((sum, s) => sum + (s.Duration ?? 0), 0);

        return {
          startPosition: [originLng, originLat] as [number, number],
          endPosition: [destinationLng, destinationLat] as [number, number],
          distance,
          duration,
          steps: travelSteps.map((step) => ({
            startPosition: [0, 0] as [number, number],
            endPosition: [0, 0] as [number, number],
            distance: step.Distance ?? 0,
            duration: step.Duration ?? 0,
          })),
        };
      });

      return {
        duration: totalSummary?.Duration ?? 0,
        distance: totalSummary?.Distance ?? 0,
        legs,
      };
    } catch (err: any) {
      if (err.name === 'AccessDeniedException') {
        this.logger.warn(
          'AWS IAM Permission missing: Please attach "geo-routes:CalculateRoutes" policy to IAM User minh_hieu.',
        );
      } else {
        this.logger.error('AWS CalculateRoutes failed:', err);
      }
      return { duration: 0, distance: 0, legs: [] };
    }
  }

  // Creates a new Location in the database with PostGIS coordinates.
  async createLocationWithCoordinates(
    createLocationDto: CreateLocationDto,
  ): Promise<Location> {
    const { address, city, state, country, postalCode } = createLocationDto;

    let latitude = createLocationDto.latitude;
    let longitude = createLocationDto.longitude;

    if (latitude === undefined || longitude === undefined) {
      const coords = await this.geocodeAddress(address, city, country);
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    const [location] = await this.prisma.$queryRaw<Location[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
      VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
      RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
    `;

    return location;
  }

  // Fetches location and converts PostGIS WKT coordinates to GeoJSON latitude/longitude.
  async getLocationWithFormattedCoordinates(locationId: number) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const coordinatesResult: { coordinates: string }[] = await this.prisma
      .$queryRaw`
        SELECT ST_AsText(coordinates) AS coordinates
        FROM "Location"
        WHERE id = ${locationId}`;

    let latitude = 0;
    let longitude = 0;

    if (
      coordinatesResult &&
      coordinatesResult.length > 0 &&
      coordinatesResult[0].coordinates
    ) {
      try {
        const geoJSON: any = wktToGeoJSON(coordinatesResult[0].coordinates);
        if (
          geoJSON &&
          geoJSON.type === 'Point' &&
          Array.isArray(geoJSON.coordinates)
        ) {
          longitude = geoJSON.coordinates[0];
          latitude = geoJSON.coordinates[1];
        }
      } catch (err) {
        this.logger.error('Failed to parse WKT coordinates:', err);
      }
    }

    return {
      ...location,
      coordinates: {
        latitude,
        longitude,
      },
    };
  }

  // Updates existing Location information.
  async updateLocation(
    id: number,
    updateLocationDto: UpdateLocationDto,
  ): Promise<Location> {
    const existingLocation = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      throw new NotFoundException('Location not found');
    }

    const { address, city, state, country, postalCode } = updateLocationDto;

    return await this.prisma.location.update({
      where: { id },
      data: {
        ...(address && { address }),
        ...(city && { city }),
        ...(state !== undefined && { state }),
        ...(country && { country }),
        ...(postalCode !== undefined && { postalCode }),
      },
    });
  }

  // General finder methods
  async findAll(): Promise<Location[]> {
    return await this.prisma.location.findMany();
  }

  async findOne(id: number) {
    return await this.getLocationWithFormattedCoordinates(id);
  }
}
