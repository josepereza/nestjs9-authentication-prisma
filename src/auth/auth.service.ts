import { Injectable } from '@nestjs/common';
import * as argon from 'argon2';
import { SignUpDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private prisma) {}
  async signup(dto: SignUpDto) {
    try {
      //^ hash password
      const hashedPassword = await argon.hash(dto.password);

      //^ save user in db
      //^ return token

      return { dto };
    } catch (error) {
      return error;
    }
  }
}
