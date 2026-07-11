import { CoordinatesDto } from './coordinates.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LocationsDto {
  @ApiProperty({
    type: Number,
    description: 'The unique identifier for the location.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    type: String,
    description: 'The address of the location.',
    required: true,
  })
  @IsString()
  address!: string;

  @ApiProperty({
    type: String,
    description: 'The city of the location.',
    required: true,
  })
  @IsString()
  city!: string;

  @ApiProperty({
    type: String,
    description: 'The state of the location.',
    required: true,
  })
  @IsString()
  state!: string;

  @ApiProperty({
    type: String,
    description: 'The country of the location.',
    required: true,
  })
  @IsString()
  country!: string;

  @ApiProperty({
    type: String,
    description: 'The postal code of the location.',
    required: true,
  })
  @IsString()
  postalCode!: string;

  @ApiProperty({
    type: CoordinatesDto,
    description: 'The coordinates of the location.',
    required: true,
  })
  coordinates!: CoordinatesDto;
}
