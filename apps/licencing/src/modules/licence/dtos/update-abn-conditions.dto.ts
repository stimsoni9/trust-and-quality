import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateAbnConditionsDto {
  @IsString()
  @IsNotEmpty()
  fileContent!: string;
}
