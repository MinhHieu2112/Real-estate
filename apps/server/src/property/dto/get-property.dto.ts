import { IsDate, IsEnum, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType } from '../../generated/prisma/enums';

export class GetPropertyDto {
  @IsNumber()
  @Type(() => Number)
  favoriteIds!: number[];

  @IsNumber()
  @Type(() => Number)
  priceMin!: number;

  @IsNumber()
  @Type(() => Number)
  priceMax!: number;

  @IsNumber()
  @Type(() => Number)
  beds!: number;

  @IsNumber()
  @Type(() => Number)
  baths!: number;

  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsNumber()
  @Type(() => Number)
  squareFeetMin!: number;

  @IsNumber()
  @Type(() => Number)
  squareFeetMax!: number;

  @IsString()
  amenities!: string[];

  @IsDate()
  availableFrom!: Date;

  @IsNumber()
  @Type(() => Number)
  latitude!: number;

  @IsNumber()
  @Type(() => Number)
  longitude!: number;
}
