import { LocationsDto } from './locations.dto';

export class PropertyResponseDto {
  id!: number;
  title!: string;
  location!: LocationsDto;
}
