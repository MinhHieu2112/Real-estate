import {
  IsDate,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PropertyType } from '../../generated/prisma/enums';

export class GetPropertyDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(Number);
    }
    if (Array.isArray(value)) {
      return value.map(Number);
    }
    return value;
  })
  @IsNumber({}, { each: true })
  favoriteIds?: number[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceMin?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceMax?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  beds?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  baths?: number;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  squareFeetMin?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  squareFeetMax?: number;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  availableFrom?: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  // Text query for location (e.g. "phường Cầu Kiệu").
  // Backend resolves this to a bbox via AWS Location before querying PostGIS.
  @IsOptional()
  @IsString()
  locationText?: string;

  // Bounding box coordinates from AWS Location SearchText.
  // Used for precise administrative boundary filtering (ST_Intersects).
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bboxWest?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bboxSouth?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bboxEast?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bboxNorth?: number;
}
