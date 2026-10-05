import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantCapabilitiesDto {
  @ApiProperty({
    description: 'Key-value map of capability codes to boolean enablement states',
    example: { catalog: true, orders: true, kitchen: true, inventory: false },
  })
  @IsNotEmpty()
  @IsObject()
  capabilities!: Record<string, boolean>;
}

