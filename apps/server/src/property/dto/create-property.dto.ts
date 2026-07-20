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

  @Transform(({ value }) =>
    typeof value === 'string'
      ? (value.split(',') as Amenity[])
      : (value as Amenity[] | undefined),
  )
  @IsArray()
  @IsOptional()
  amenities?: Amenity[];

  @Transform(({ value }) =>
    typeof value === 'string'
      ? (value.split(',') as Highlight[])
      : (value as Highlight[] | undefined),
  )
  @IsArray()
  @IsOptional()
  highlights?: Highlight[];
}
