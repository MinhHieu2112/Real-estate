import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SignContractDto {
  @ApiProperty({
    description: 'Token xác thực ký hợp đồng (có hiệu lực 15 phút)',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description:
      'Dữ liệu chữ ký dạng Base64 Data URL (image/png hoặc image/jpeg)',
  })
  @IsString()
  @IsOptional()
  signatureBase64?: string;
}
