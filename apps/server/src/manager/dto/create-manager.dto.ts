import { IsNotEmpty, IsString } from 'class-validator';

export class CreateManagerDto {
  @IsNotEmpty()
  @IsString()
  cognitoId!: string;

  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsString()
  phoneNumber!: string;
}
