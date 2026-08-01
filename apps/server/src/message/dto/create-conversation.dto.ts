import { IsNotEmpty, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  tenantCognitoId!: string;

  @IsString()
  @IsNotEmpty()
  managerCognitoId!: string;
}
