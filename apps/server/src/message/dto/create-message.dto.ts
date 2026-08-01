import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMessageDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsNotEmpty()
  conversationId!: number;

  @IsString()
  @IsNotEmpty()
  senderCognitoId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
