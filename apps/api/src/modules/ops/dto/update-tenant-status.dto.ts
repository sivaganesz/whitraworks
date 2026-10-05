import { IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'], description: 'Target lifecycle status for the tenant' })
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';

  @ApiProperty({ minLength: 3, description: 'Mandatory audit justification for the status change' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  reason!: string;
}
