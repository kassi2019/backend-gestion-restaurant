import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, IsEnum, Min } from 'class-validator';
import { TypeAbonnement } from '@prisma/client';

export class CreerRestaurantDto {
  // ── Restaurant ──
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsString()
  @IsNotEmpty()
  adresse: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @IsEnum(TypeAbonnement)
  typeAbonnement?: TypeAbonnement;

  @IsInt()
  @Min(1)
  dureeJours: number;

  // ── Admin ──
  @IsString()
  @IsNotEmpty()
  adminNom: string;

  @IsString()
  @IsNotEmpty()
  adminTelephone: string;

  @IsString()
  @IsNotEmpty()
  adminMotDePasse: string;

  // ── Modules ──
  @IsArray()
  @IsInt({ each: true })
  moduleIds: number[];
}
