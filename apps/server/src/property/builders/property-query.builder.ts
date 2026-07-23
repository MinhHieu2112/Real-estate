import { Prisma } from '../../generated/prisma/client';
import { GetPropertyDto } from '../dto/get-property.dto';

export class PropertyQueryBuilder {
  private conditions: Prisma.Sql[] = [];
  constructor(
    private readonly filters: GetPropertyDto,
    private readonly favoriteIds: number[],
  ) {}

  // Define a private to add favorite ids
  private addFavoriteIds() {
    if (!this.favoriteIds || !this.favoriteIds.length) return;

    this.conditions.push(
      Prisma.sql`
            p.id IN (${Prisma.join(this.favoriteIds)})
        `,
    );
  }

  // Define a private to add price conditions
  private addPriceCondition() {
    const { priceMin, priceMax } = this.filters;

    return (
      priceMin !== undefined &&
        this.conditions.push(Prisma.sql`p."pricePerMonth" >= ${priceMin}`),
      priceMax !== undefined &&
        this.conditions.push(Prisma.sql`p."pricePerMonth" <= ${priceMax}`)
    );
  }

  // Define a private to add room conditions
  private addRoomCondition() {
    const { beds, baths } = this.filters;

    return (
      beds !== undefined &&
        this.conditions.push(Prisma.sql`p."beds" >= ${beds}`),
      baths !== undefined &&
        this.conditions.push(Prisma.sql`p."baths" >= ${baths}`)
    );
  }

  // Define a private to add square feet conditions
  private addSquareFeetConditions() {
    const { squareFeetMin, squareFeetMax } = this.filters;

    return (
      squareFeetMin !== undefined &&
        this.conditions.push(Prisma.sql`p."squareFeet" >= ${squareFeetMin}`),
      squareFeetMax !== undefined &&
        this.conditions.push(Prisma.sql`p."squareFeet" <= ${squareFeetMax}`)
    );
  }

  // Define a private to add property type
  private addPropertyType() {
    const { propertyType } = this.filters;

    return (
      propertyType !== undefined &&
      this.conditions.push(
        Prisma.sql`p."propertyType" = ${propertyType}::"PropertyType"`,
      )
    );
  }

  // Define a private to add amenities
  private addAmenitiesConditions() {
    const { amenities } = this.filters;

    return (
      amenities !== undefined &&
      amenities.forEach((amenity) => {
        this.conditions.push(Prisma.sql`p.amenities @> ${amenity}`);
      })
    );
  }

  // Define a private to add available from
  private addAvailableFrom() {
    const { availableFrom } = this.filters;
    if (!availableFrom) return;

    const date = new Date(availableFrom);
    if (isNaN(date.getTime())) return;

    this.conditions.push(
      Prisma.sql`
        NOT EXISTS (
        SELECT 1
        FROM "Lease" l
        WHERE l."propertyId" = p.id
          AND l."startDate" <= ${date.toLocaleString('vi-VN')}
          AND l."endDate" >= ${date.toLocaleString('vi-VN')}
      )
    `,
    );
  }

  // Define a private to add location
  private addLocation() {
    const { latitude, longitude } = this.filters;
    if (
      latitude === undefined ||
      longitude === undefined ||
      (latitude === 0 && longitude === 0)
    )
      return;
    else {
      const radiusInKilomters = 1000.0;
      const degrees = radiusInKilomters / 111.0;

      this.conditions.push(
        Prisma.sql`ST_DWithin(
          l.coordinates::geometry,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
          ${degrees}
        )`,
      );
    }
  }

  build() {
    this.addFavoriteIds();
    this.addPriceCondition();
    this.addRoomCondition();
    this.addSquareFeetConditions();
    this.addPropertyType();
    this.addAmenitiesConditions();
    this.addAvailableFrom();
    this.addLocation();

    return this.conditions;
  }
}
