import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { ApplicationStatus } from '../../generated/prisma/enums';

export class CreateApplicationDto {
  @IsDate()
  applicationDate!: Date;

  @IsNotEmpty()
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @IsNumber()
  propertyId!: number;

  @IsString()
  tenantCognitoId!: string;

  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  message?: string | null;
}
