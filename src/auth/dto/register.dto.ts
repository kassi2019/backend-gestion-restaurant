import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsString()
  @IsNotEmpty()
  telephone: string;

  @IsString()
  @IsNotEmpty()
  mot_de_passe: string;

  @IsEnum(Role)
  role: Role;

  @IsInt()
  restaurantId: number;

  @IsOptional()
  @IsString()
  photo?: string;
}
