import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMessagesQueryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  conversationId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
