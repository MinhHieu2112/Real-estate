import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateTenantDto {
  @ApiProperty({
    type: String,
    description: 'Tenant cognitoId',
    required: true,
  })
  @IsString()
  cognitoId!: string;

  @ApiProperty({
    type: String,
    description: 'Tenant name',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    type: String,
    description: 'example@domain.com.vn',
    required: true,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    type: String,
    description: '0123-456-789',
    required: true,
  })
  @IsString()
  phoneNumber!: string;
}
