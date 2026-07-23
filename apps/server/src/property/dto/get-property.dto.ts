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
  @IsNumber({}, { each: true })
  @Type(() => Number)
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
}
