import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'arjun@freshbite.example', description: 'User login email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email!: string;

  @ApiProperty({ example: 'StrongPassword123!', description: 'Account password' })
  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty' })
  @MinLength(1, { message: 'Password is required' })
  password!: string;
}
