import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PropertyType, Amenity, Highlight } from '../../generated/prisma/enums';

export class CreatePropertyDto {
  // Location information
  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  // Property information
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(PropertyType)
  @IsNotEmpty()
  propertyType!: PropertyType;

  @IsString()
  @IsNotEmpty()
  managerCognitoId!: string;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  pricePerMonth!: number;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  securityDeposit!: number;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  applicationFee!: number;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  baths!: number;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  beds!: number;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  squareFeet!: number;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isPetsAllowed?: boolean = false;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isParkingIncluded?: boolean = false;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      if (!value.trim()) return [];
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Ignore JSON parse errors and fall back to comma-separated string
      }
      return value
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsOptional()
  amenities?: Amenity[];

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      if (!value.trim()) return [];
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Ignore JSON parse errors and fall back to comma-separated string
      }
      return value
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsOptional()
  highlights?: Highlight[];
}
