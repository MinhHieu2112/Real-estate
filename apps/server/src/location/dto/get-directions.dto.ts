import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export enum TravelMode {
  Car = 'Car',
  Pedestrian = 'Pedestrian',
  Scooter = 'Scooter',
}

export class GetDirectionsDto {
  @IsNumber()
  @Type(() => Number)
  originLat!: number;

  @IsNumber()
  @Type(() => Number)
  originLng!: number;

  @IsNumber()
  @Type(() => Number)
  destinationLat!: number;

  @IsNumber()
  @Type(() => Number)
  destinationLng!: number;

  @IsEnum(TravelMode)
  @IsOptional()
  travelMode?: TravelMode;
}

export interface DirectionsResult {
  duration: number; // seconds
  distance: number; // meters
  legs: DirectionLeg[];
}

export interface DirectionLeg {
  startPosition: [number, number];
  endPosition: [number, number];
  distance: number;
  duration: number;
  steps: DirectionStep[];
}

export interface DirectionStep {
  startPosition: [number, number];
  endPosition: [number, number];
  distance: number;
  duration: number;
}
