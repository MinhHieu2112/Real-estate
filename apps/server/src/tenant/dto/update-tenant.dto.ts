import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDto } from './create-tenant.dto';
import { IsEmail, IsString } from 'class-validator';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phoneNumber!: string;
}
