import { IsNotEmpty } from 'class-validator';
import { IsString } from 'class-validator/types/decorator/typechecker/IsString';

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
