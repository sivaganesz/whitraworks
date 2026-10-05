import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Unique invitation token received via email/invite URL' })
  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  token!: string;

  @ApiPropertyOptional({ description: 'Required for new users to set initial password', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;

  @ApiPropertyOptional({ description: 'First name for new users' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name for new users' })
  @IsOptional()
  @IsString()
  lastName?: string;
}

