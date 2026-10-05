import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ example: 'rahul.chef@example.com' })
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @ApiPropertyOptional({ example: 'ADMIN', description: 'System role code: ADMIN or STAFF' })
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({ example: 'rol_01j9...', description: 'Explicit database Role ID' })
  @IsOptional()
  @IsString()
  roleId?: string;
}

