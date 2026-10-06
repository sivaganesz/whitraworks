import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Length,
  Matches,
  IsObject,
} from 'class-validator';

export class UpdateWorkspaceProfileDto {
  @ApiPropertyOptional({
    description: 'Display name of the tenant workspace business',
    example: 'FreshBite Kitchen & Grill',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Business name must be at least 2 characters long.' })
  @MaxLength(100, { message: 'Business name cannot exceed 100 characters.' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Operating ISO currency code (3 uppercase letters)',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'Currency code must be exactly 3 uppercase letters (e.g. USD, EUR, INR).' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must consist of 3 uppercase letters.' })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Operating IANA timezone string',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Timezone must be a valid IANA timezone string.' })
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Logo image URL for the workspace',
    example: 'https://assets.whitraworks.com/logos/freshbite.png',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional business profile metadata (address, phone, registration)',
    example: { address: '123 Market St', phone: '+1-555-0199' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

