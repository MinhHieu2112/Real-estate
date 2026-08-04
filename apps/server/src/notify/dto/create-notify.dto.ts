import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsEmail,
  IsInt,
} from 'class-validator';
import { NotificationType } from '../../generated/prisma/enums';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  receiverCognitoId!: string;

  @IsEmail()
  @IsOptional()
  receiverEmail?: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsInt()
  @IsOptional()
  applicationId!: number;
}
