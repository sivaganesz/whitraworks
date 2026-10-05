import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class CheckSlugDto {
  @ApiProperty({ example: 'abchotel', description: 'Subdomain slug to check' })
  @IsString()
  @IsNotEmpty({ message: 'Slug query parameter is required' })
  @MinLength(3, { message: 'Slug must be at least 3 characters long' })
  @MaxLength(30, { message: 'Slug must not exceed 30 characters' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must consist only of lowercase alphanumeric characters and single hyphens',
  })
  slug!: string;
}
