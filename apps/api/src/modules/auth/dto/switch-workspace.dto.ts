import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SwitchWorkspaceDto {
  @ApiProperty({ example: 'urbanwear', description: 'Target workspace slug to switch to' })
  @IsString()
  @IsNotEmpty({ message: 'Target tenant slug is required' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must consist only of lowercase alphanumeric characters and single hyphens',
  })
  targetTenantSlug!: string;
}
