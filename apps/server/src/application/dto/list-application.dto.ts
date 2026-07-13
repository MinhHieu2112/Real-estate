import { IsOptional, IsString, IsIn } from 'class-validator';

export class ListApplicationDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsIn(['tenant', 'manager'])
  userType?: 'tenant' | 'manager';
}
