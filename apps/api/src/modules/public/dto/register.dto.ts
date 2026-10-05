import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Arjun', description: 'User first name' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @ApiProperty({ example: 'Kumar', description: 'User last name' })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

  @ApiProperty({ example: 'arjun@freshbite.example', description: 'Unique user email' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: 'StrongPassword123!', description: 'Account password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password!: string;

  @ApiProperty({ example: 'FreshBite Restaurant', description: 'Display business name' })
  @IsString()
  @MinLength(2, { message: 'Business name must be at least 2 characters' })
  businessName!: string;

  @ApiProperty({ example: 'freshbite', description: 'Unique subdomain slug' })
  @IsString()
  @MinLength(3, { message: 'Slug must be at least 3 characters long' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must consist only of lowercase alphanumeric characters and single hyphens',
  })
  slug!: string;
}
