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
          AND l."startDate" <= ${date}
          AND l."endDate" >= ${date}
      )
    `,
    );
  }

  // Legacy: radius-based filter (backward compatible, used when no bbox or locationText is given)
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

  // Boundary filter using bbox resolved from AWS Location SearchText.
  // Produces precise administrative-level results (e.g. only within phường Cầu Kiệu).
  private addBBoxFilter() {
    const { bboxWest, bboxSouth, bboxEast, bboxNorth } = this.filters;
    if (
      bboxWest === undefined ||
      bboxSouth === undefined ||
      bboxEast === undefined ||
      bboxNorth === undefined
    )
      return false;

    this.conditions.push(
      Prisma.sql`ST_Intersects(
        l.coordinates::geometry,
        ST_MakeEnvelope(${bboxWest}, ${bboxSouth}, ${bboxEast}, ${bboxNorth}, 4326)
      )`,
    );
    return true;
  }

  build() {
    this.addFavoriteIds();
    this.addPriceCondition();
    this.addRoomCondition();
    this.addSquareFeetConditions();
    this.addPropertyType();
    this.addAmenitiesConditions();
    this.addAvailableFrom();

    // Priority 1: Use administrative boundary box (from AWS Location SearchText)
    // Priority 2: Fallback to legacy radius if no bbox (backward compat)
    const hasBBox = this.addBBoxFilter();
    if (!hasBBox) {
      this.addLocation();
    }

    return this.conditions;
  }
}
