import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchPlaceDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsString()
  @IsOptional()
  countryCode?: string; // e.g. "VNM" for Vietnam
}

export interface SearchPlaceResult {
  placeId?: string;
  label: string;
  position: [number, number]; // [longitude, latitude]
  bbox?: [number, number, number, number]; // [west, south, east, north]
}
