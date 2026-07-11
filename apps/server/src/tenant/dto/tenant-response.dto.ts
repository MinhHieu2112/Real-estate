import { IsEmail, IsString } from 'class-validator';

export class TenantResponseDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phoneNumber!: string;
}
