import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  private readonly argonOptions: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  };

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, this.argonOptions);
  }

  async verifyPassword(hash: string, plainText: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }
}
