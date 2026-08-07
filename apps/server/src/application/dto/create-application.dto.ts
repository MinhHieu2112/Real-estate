import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStatus } from '../../generated/prisma/enums';

export class CreateApplicationDto {
  @Type(() => Date)
  @IsDate()
  applicationDate!: Date;

  @IsNotEmpty()
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @IsNumber()
  propertyId!: number;

  @IsString()
  @IsOptional()
  tenantCognitoId!: string;

  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsString()
  phoneNumber!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsString()
  message?: string | null;
}
