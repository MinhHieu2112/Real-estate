import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MarkAsReadDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsNotEmpty()
  conversationId!: number;

  @IsString()
  @IsNotEmpty()
  userCognitoId!: string;
}
