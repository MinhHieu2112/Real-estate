import { IsString } from 'class-validator';

export class ManagerResponseDto {
  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsString()
  phoneNumber!: string;
}

export class MessageResponseDto {
  @IsString()
  message!: string;
}
