import { PartialType } from '@nestjs/swagger';
import { CreatePropertyDto } from './create-property.dto';
import { IsOptional } from 'class-validator';

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {
  @IsOptional()
  existingPhotoUrls?: string;
}
